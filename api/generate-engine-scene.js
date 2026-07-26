// --------- Scene Engine (Beta) AI planner (Vercel serverless function) ----------
// A separate endpoint from api/generate-scene.js (the main tool's planner) — kept independent on
// purpose, same as every other engine/ file, so nothing about the main tool's AI flow is touched.
// Reuses the SAME ANTHROPIC_API_KEY environment variable already configured in the Vercel project
// (no extra setup needed) since it's just another serverless function in the same project.
//
// Turns free text into a small scene graph the engine's two-pass resolver (engine/scene.js) can render:
// one or two characters, each doing any of the existing ~50 actions, optionally with the second
// character hugging the first from behind (the one cross-character interaction primitive built so
// far — engine/primitives.js's wrapAroundTorso). Like the main tool's planner, this is still a fixed,
// enum-constrained menu — the AI can never invent an action/background id that isn't listed — but the
// INTERACTION field is what lets it produce combinations (e.g. "hugging while riding a jeep") that
// don't exist as a single named pose anywhere in js/poses.js.

const CLIP_IDS = [
  'idle','talk','walk','wave','dance','kite','sit','drink','phone','jump','eat','run','fight','argue',
  'hug','highfive','kick','throw','swim','sleep','read','clap','bow','yoga','cry','point','salute',
  'shrug','stretch','fall','pushup','cheer','drum','cartwheel','paint','write','fish','shake','guitar',
  'umbrella','skateboard','laptop','camera','drivecar','ridebike','ridemotorcycle'
];
// Flying (flyplane/flyhelicopter) and some car variants are intentionally left out for now — the
// engine's renderer doesn't yet have the altitude/cockpit handling those need (see engine/scene.js).
const BACKGROUND_IDS = [
  'white','sky','grid','cafe','office','bedroom','street','beach','forest','gym','school','space',
  'restaurant','farm','mountain','lake','desert','castle','stadium','underwater','airport','hospital',
  'library','jungle','volcano','carnival'
];
const WEATHER_IDS = ['none','rain','snow','fog','sunny','autumn'];

// Group scenes: up to 5 stickmen. The wrapAroundTorso hug primitive only targets one other
// character's real skeleton, so hugFromBehind stays scoped to exactly 2 — for 3-5 everyone
// resolves independently (their own action, side by side), same as pass 1 always did.
const MAX_CHARACTERS = 5;
const NAME_POOL = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Casey'];
const CHAR_KEYS = ['character1', 'character2', 'character3', 'character4', 'character5'];

const SYSTEM_PROMPT =
  'You are the scene planner for the Scene Engine, an experimental part of Stickman Video Studio (a ' +
  'browser tool that renders simple 2D stick-figure animations — never realistic humans, never ' +
  'generated video/image pixels, everything is drawn by code). Given a description, call ' +
  'build_engine_scene using ONLY the allowed ids in the tool schema — never invent one. Set ' +
  'characterCount to match how many people the description actually involves, up to a maximum of 5 ' +
  '(e.g. "three people dancing" -> characterCount 3, "a stickman doing yoga" -> characterCount 1). ' +
  'When the description implies a group without an exact number (e.g. "a crowd", "a team", "several ' +
  'people"), pick a reasonable count between 3 and 5. Give each character the action that best matches ' +
  'what they are doing; if all are doing the same thing, repeat that action for each. Set interaction ' +
  'to "hugFromBehind" ONLY when characterCount is exactly 2 AND the description clearly describes one ' +
  'person embracing/hugging the other from behind (including while riding something together) — ' +
  'otherwise "none". character2 through character5 are only used when characterCount is high enough ' +
  'to need them.';

const CHARACTER_PROPERTY = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: CLIP_IDS },
    gender: { type: 'string', enum: ['male', 'female'] }
  }
};

const BUILD_SCENE_TOOL = {
  name: 'build_engine_scene',
  description: 'Build a Scene Engine scene graph.',
  input_schema: {
    type: 'object',
    properties: {
      background: { type: 'string', enum: BACKGROUND_IDS },
      weather: { type: 'string', enum: WEATHER_IDS },
      characterCount: { type: 'integer', enum: [1, 2, 3, 4, 5] },
      character1: { ...CHARACTER_PROPERTY, required: ['action'] },
      character2: CHARACTER_PROPERTY,
      character3: CHARACTER_PROPERTY,
      character4: CHARACTER_PROPERTY,
      character5: CHARACTER_PROPERTY,
      interaction: { type: 'string', enum: ['none', 'hugFromBehind'], description: 'hugFromBehind = character2 hugs character1 from behind. Only valid when characterCount is 2.' }
    },
    required: ['background', 'weather', 'characterCount', 'character1']
  }
};

const requestLog = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 8;
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function buildFinalGraph(ai) {
  const background = BACKGROUND_IDS.includes(ai.background) ? ai.background : 'white';
  const weather = WEATHER_IDS.includes(ai.weather) ? ai.weather : 'none';
  const charCount = Number.isInteger(ai.characterCount) && ai.characterCount >= 1 && ai.characterCount <= MAX_CHARACTERS
    ? ai.characterCount : 1;
  const interaction = (charCount === 2 && ai.interaction === 'hugFromBehind') ? 'hugFromBehind' : 'none';

  const result = { background, weather, characterCount: charCount };
  for (let i = 0; i < charCount; i++) {
    const key = CHAR_KEYS[i];
    const c = ai[key] || {};
    const action = CLIP_IDS.includes(c.action) ? c.action : 'idle';
    const gender = c.gender === 'female' ? 'female' : 'male';
    result[key] = { name: NAME_POOL[i], action, gender };
  }
  if (charCount === 2) result.interaction = interaction;
  return result;
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
    res.status(429).json({ error: 'Too many AI generations right now — wait a minute and try again.' });
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
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        tools: [BUILD_SCENE_TOOL],
        tool_choice: { type: 'tool', name: 'build_engine_scene' }
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('Anthropic API error', upstream.status, detail);
      res.status(502).json({ error: 'AI generation failed upstream. Try again.' });
      return;
    }

    const data = await upstream.json();
    const toolBlock = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'build_engine_scene');
    if (!toolBlock || !toolBlock.input) {
      res.status(502).json({ error: 'AI response was malformed. Try rephrasing.' });
      return;
    }

    const graph = buildFinalGraph(toolBlock.input);
    res.status(200).json(graph);
  } catch (err) {
    console.error('generate-engine-scene handler error', err);
    res.status(500).json({ error: 'Something went wrong generating that scene. Try again.' });
  }
};
