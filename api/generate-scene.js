// ---------- AI scene planner (Vercel serverless function) ----------
// Turns a free-text description into the SAME scene-plan JSON shape js/scene.js's rule-based
// parsePromptToScene() already produces (background/weather/furniture/food/bodyType/charCount/
// timeline/animals/vehicles/summary). The client feeds whichever one it got — AI or offline keyword
// parser — into the exact same resolveIndexedTimeline()/renderFrame() pipeline, so this endpoint is a
// drop-in alternate SOURCE of a scene plan, not a new rendering path. The AI never touches a pixel;
// it only picks from a fixed, enum-constrained menu of the same clip/background/animal/vehicle ids
// the app already knows how to draw, which is what keeps this cheap and keeps output always valid.
//
// Requires an ANTHROPIC_API_KEY environment variable set in the Vercel project (Project Settings ->
// Environment Variables). Without it this endpoint returns a clear 500 rather than ever exposing the
// (missing) key to the client.

const CLIP_IDS = [
  'idle','talk','walk','wave','dance','kite','sit','drink','phone','jump','eat','run','fight','argue',
  'hug','highfive','kick','throw','swim','sleep','read','clap','bow','yoga','cry','point','salute',
  'shrug','stretch','fall','pushup','cheer','drum','cartwheel','paint','write','fish','shake','guitar',
  'umbrella','skateboard','laptop','camera','drivecar','drivesportscar','drivelimo','ridebike',
  'ridemotorcycle','flyplane','flyhelicopter'
];
// 'custom' (upload-your-own-photo) is intentionally excluded — meaningless for the AI to pick.
const BACKGROUND_IDS = [
  'white','sky','grid','cafe','office','bedroom','street','beach','forest','gym','school','space',
  'restaurant','farm','mountain','lake','desert','castle','stadium','underwater','airport','hospital',
  'library','jungle','volcano','carnival'
];
const WEATHER_IDS = ['none','rain','snow','fog','sunny','autumn'];
const ANIMAL_IDS = [
  'dog','cat','bird','rabbit','horse','cow','sheep','elephant','fish','snake','chicken','pig','monkey',
  'lion','turtle','frog','deer','bear','penguin','owl','giraffe','zebra','kangaroo','panda','fox','wolf'
];
const VEHICLE_IDS = [
  'car','bicycle','bus','truck','motorcycle','train','airplane','boat','helicopter','scooter','tractor',
  'ambulance','submarine','hotairballoon'
];
const FOOD_IDS = [
  'none','pizza','burger','apple','hotdog','icecream','cake','donut','taco','sushi','popcorn','waffle',
  'sandwich','watermelon','banana','cookie','pretzel'
];

const SYSTEM_PROMPT =
  'You are the scene planner for Stickman Video Studio, a browser tool that renders simple 2D stick-' +
  'figure animations (never realistic humans, never generated video/image pixels — everything is drawn ' +
  'by code from a small set of preset poses, backgrounds, and props). Given a user\'s description, call ' +
  'build_scene with a short, coherent plan built ENTIRELY from the allowed ids listed in the tool schema ' +
  '— never invent an id that isn\'t listed. Prefer 1-6 timeline segments, each 2-8 seconds, that read as ' +
  'a clear sequence of actions. Only set characterCount to 2 and fill character2Action when the ' +
  'description clearly involves two people (dialogue, "and", "with", interacting actions like hug/fight/' +
  'argue/high five/shake hands/dance). Only add dialogueText for segments where the character is talking ' +
  'or on the phone; keep lines short and natural. Only include animals/vehicles the description actually ' +
  'mentions or clearly implies — usually none.';

const BUILD_SCENE_TOOL = {
  name: 'build_scene',
  description: 'Build a stickman animation scene plan.',
  input_schema: {
    type: 'object',
    properties: {
      background: { type: 'string', enum: BACKGROUND_IDS },
      weather: { type: 'string', enum: WEATHER_IDS },
      furniture: { type: 'string', enum: ['chair', 'sofa'], description: 'What a sitting/eating/reading character sits on.' },
      food: { type: 'string', enum: FOOD_IDS, description: '"none" unless a specific food is mentioned.' },
      bodyType: { type: 'string', enum: ['child', 'adult', 'elder'] },
      characterCount: { type: 'integer', enum: [1, 2] },
      animals: { type: 'array', items: { type: 'string', enum: ANIMAL_IDS }, maxItems: 4 },
      vehicles: { type: 'array', items: { type: 'string', enum: VEHICLE_IDS }, maxItems: 4 },
      segments: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: {
          type: 'object',
          properties: {
            duration: { type: 'number', description: 'Seconds, roughly 2-8.' },
            character1Action: { type: 'string', enum: CLIP_IDS },
            character2Action: { type: 'string', enum: CLIP_IDS, description: 'Only used if characterCount is 2.' },
            dialogueSpeaker: { type: 'integer', enum: [0, 1], description: '0 = character 1, 1 = character 2.' },
            dialogueText: { type: 'string', description: 'Omit if nobody is talking this segment.' }
          },
          required: ['duration', 'character1Action']
        }
      }
    },
    required: ['background', 'weather', 'furniture', 'food', 'bodyType', 'characterCount', 'segments']
  }
};

// Best-effort in-memory rate limit — resets whenever the serverless function cold-starts, and isn't
// shared across concurrent/regional instances, so it's a deterrent rather than a hard guarantee. If
// this endpoint ever sees real traffic, swap this Map for Vercel KV/Upstash so limits are enforced
// consistently across all instances.
const requestLog = new Map(); // ip -> array of request timestamps (ms)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function clampNum(n, lo, hi, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

// Turns the AI's tool-call input into the exact same shape js/scene.js's resolveIndexedTimeline() and
// the "Generate from description" click handler in js/ui.js already expect from the offline parser —
// so the client can apply either source's result through one shared code path.
function buildFinalScene(ai) {
  const charCount = ai.characterCount === 2 ? 2 : 1;
  const clipSet = new Set(CLIP_IDS);
  const rawSegments = Array.isArray(ai.segments) ? ai.segments.slice(0, 10) : [];
  const segments = (rawSegments.length ? rawSegments : [{ duration: 3, character1Action: 'idle' }]).map(seg => {
    const duration = Math.round(clampNum(seg.duration, 1.5, 30, 3) * 10) / 10;
    const a1 = clipSet.has(seg.character1Action) ? seg.character1Action : 'idle';
    const a2 = clipSet.has(seg.character2Action) ? seg.character2Action : 'idle';
    const actions = charCount === 2 ? { 0: a1, 1: a2 } : { 0: a1 };
    let dialogue = null;
    if (seg.dialogueText && String(seg.dialogueText).trim()) {
      const speakerIdx = (seg.dialogueSpeaker === 1 && charCount === 2) ? 1 : 0;
      dialogue = { speakerIdx, text: String(seg.dialogueText).trim().slice(0, 140) };
    }
    return { duration, actions, dialogue };
  });
  const background = BACKGROUND_IDS.includes(ai.background) ? ai.background : 'white';
  const weather = WEATHER_IDS.includes(ai.weather) ? ai.weather : 'none';
  const furniture = ai.furniture === 'sofa' ? 'sofa' : 'chair';
  const food = FOOD_IDS.includes(ai.food) && ai.food !== 'none' ? ai.food : null;
  const bodyType = ['child', 'adult', 'elder'].includes(ai.bodyType) ? ai.bodyType : 'adult';
  const animals = Array.isArray(ai.animals) ? ai.animals.filter(t => ANIMAL_IDS.includes(t)).slice(0, 4) : [];
  const vehicles = Array.isArray(ai.vehicles) ? ai.vehicles.filter(t => VEHICLE_IDS.includes(t)).slice(0, 4) : [];
  const totalDuration = Math.round(segments.reduce((s, seg) => s + seg.duration, 0) * 10) / 10;
  return {
    background, weather, furniture, food, bodyType, charCount,
    timeline: segments,
    animals, vehicles,
    summary: { actions: segments.map(s => s.actions[0]), totalDuration }
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI generation isn’t configured yet — add an ANTHROPIC_API_KEY environment variable in the Vercel project settings.' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many AI generations right now — wait a minute and try again, or use the offline Generate button.' });
    return;
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim().slice(0, 500) : '';
  if (!prompt) {
    res.status(400).json({ error: 'Type a description first.' });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        tools: [BUILD_SCENE_TOOL],
        tool_choice: { type: 'tool', name: 'build_scene' }
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('Anthropic API error', upstream.status, detail);
      res.status(502).json({ error: 'AI generation failed upstream. Try again, or use the offline Generate button.' });
      return;
    }

    const data = await upstream.json();
    const toolBlock = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'build_scene');
    if (!toolBlock || !toolBlock.input) {
      res.status(502).json({ error: 'AI response was malformed. Try rephrasing, or use the offline Generate button.' });
      return;
    }

    const scene = buildFinalScene(toolBlock.input);
    res.status(200).json(scene);
  } catch (err) {
    console.error('generate-scene handler error', err);
    res.status(500).json({ error: 'Something went wrong generating that scene. Try again, or use the offline Generate button.' });
  }
};
