// ---------- AI video generation (Vercel serverless function) ----------
// Calls Replicate's official Kling Video 3.0 model (kwaivgi/kling-v3-video) to generate a real AI
// video clip from a text prompt (and, optionally, a style/character reference image the user
// uploads — e.g. one of the "doodle stick-figure on a real photo" reference images). This is a
// completely separate generation path from the rest of the app: everywhere else, the stickman is
// drawn deterministically by our own canvas code (computeSkeleton/STYLES); THIS endpoint instead
// asks an external diffusion model to generate brand-new pixels from scratch, so the output is not
// frame-perfect/reproducible the way the rest of the tool is — it's "AI reimagines this", not "render
// this exact pose".
//
// Requires a REPLICATE_API_TOKEN environment variable set in the Vercel project (Project Settings ->
// Environment Variables). Without it this endpoint returns a clear 500 rather than ever exposing the
// (missing) token to the client. The token never reaches the browser — the client only ever talks to
// this endpoint, never to api.replicate.com directly.
//
// This is an OPT-IN PAID feature: every successful generation spends real money from whoever owns the
// REPLICATE_API_TOKEN (the site owner, not the visitor — there is no per-user billing here). The
// limits below (rate limit, daily cap, duration/mode caps) exist specifically to bound that exposure
// since anyone visiting the live site can trigger a charge. Tighten/loosen them based on real usage.

const MODEL = 'kwaivgi/kling-v3-video';
const REPLICATE_BASE = 'https://api.replicate.com/v1';

// Best-effort in-memory limits — reset whenever the serverless function cold-starts and aren't shared
// across concurrent/regional instances, so these are a deterrent rather than a hard guarantee. If this
// feature gets real traffic, swap these Maps/counters for Vercel KV/Upstash so limits are enforced
// consistently across all instances.
const requestLog = new Map(); // ip -> array of request timestamps (ms)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 2; // generations per IP per minute — this is real money per call, kept tight
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// Global daily cap across ALL visitors, since the site owner (not the visitor) pays for every
// generation. Resets once the in-memory counter's day-key rolls over (or the function cold-starts).
const DAILY_LIMIT = 15;
let dailyCount = { day: '', count: 0 };
function isOverDailyCap() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyCount.day !== today) dailyCount = { day: today, count: 0 };
  dailyCount.count += 1;
  return dailyCount.count > DAILY_LIMIT;
}

function clampNum(n, lo, hi, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

module.exports = async function handler(req, res) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    res.status(500).json({ error: 'AI video generation isn’t configured yet — add a REPLICATE_API_TOKEN environment variable in the Vercel project settings.' });
    return;
  }

  // ---------- GET: poll an existing generation's status ----------
  if (req.method === 'GET') {
    const id = typeof req.query?.id === 'string' ? req.query.id : '';
    if (!/^[a-zA-Z0-9]+$/.test(id)) {
      res.status(400).json({ error: 'Missing or invalid job id.' });
      return;
    }
    try {
      const upstream = await fetch(`${REPLICATE_BASE}/predictions/${id}`, {
        headers: { Authorization: `Bearer ${apiToken}` }
      });
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        console.error('Replicate poll error', upstream.status, detail);
        res.status(502).json({ error: 'Could not check generation status. Try again shortly.' });
        return;
      }
      const data = await upstream.json();
      // output is a single video URL (uri) per this model's output schema
      const output = typeof data.output === 'string' ? data.output : (Array.isArray(data.output) ? data.output[0] : null);
      res.status(200).json({
        status: data.status, // starting | processing | succeeded | failed | canceled
        output: data.status === 'succeeded' ? output : null,
        error: data.error || null
      });
    } catch (err) {
      console.error('generate-video poll handler error', err);
      res.status(500).json({ error: 'Something went wrong checking that generation. Try again shortly.' });
    }
    return;
  }

  // ---------- POST: start a new generation ----------
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST to start a generation, or GET ?id= to check status.' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many AI video requests right now — wait a minute and try again.' });
    return;
  }
  if (isOverDailyCap()) {
    res.status(429).json({ error: 'This site has hit its daily AI video generation limit — please try again tomorrow.' });
    return;
  }

  const body = req.body || {};
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 2500) : '';
  if (!prompt) {
    res.status(400).json({ error: 'Describe the video you want first.' });
    return;
  }

  const negative_prompt = typeof body.negative_prompt === 'string' ? body.negative_prompt.trim().slice(0, 2500) : '';
  // Duration/mode are deliberately capped below Replicate's own max (15s, "4k") to bound real-money
  // cost per click on a feature anyone visiting the live site can trigger.
  const duration = Math.round(clampNum(body.duration, 3, 10, 5));
  const mode = ['standard', 'pro'].includes(body.mode) ? body.mode : 'standard';
  const aspect_ratio = ['16:9', '9:16', '1:1'].includes(body.aspect_ratio) ? body.aspect_ratio : '16:9';
  const generate_audio = body.generate_audio === true;

  // Only accept an inline base64 data URI (i.e. a file the user actually uploaded in-browser) as the
  // style/character reference image — never an arbitrary URL string from the client, so this endpoint
  // can't be used as an open fetch-proxy for attacker-supplied URLs.
  const start_image = (typeof body.start_image === 'string' && body.start_image.startsWith('data:image/') && body.start_image.length < 12_000_000)
    ? body.start_image
    : undefined;

  const input = { prompt, duration, mode, generate_audio };
  if (negative_prompt) input.negative_prompt = negative_prompt;
  if (start_image) {
    input.start_image = start_image; // aspect_ratio is ignored by the model when a start_image is set
  } else {
    input.aspect_ratio = aspect_ratio;
  }

  try {
    const upstream = await fetch(`${REPLICATE_BASE}/models/${MODEL}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        Prefer: 'respond-async'
      },
      body: JSON.stringify({ input })
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('Replicate create error', upstream.status, detail);
      res.status(502).json({ error: 'AI video generation failed to start upstream. Try again in a moment.' });
      return;
    }

    const data = await upstream.json();
    res.status(200).json({ id: data.id, status: data.status });
  } catch (err) {
    console.error('generate-video create handler error', err);
    res.status(500).json({ error: 'Something went wrong starting that generation. Try again.' });
  }
};
