// ---------- Scene Engine (Beta) AI planner (Vercel serverless function) ----------
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
  'umbrella','skateboard','laptop','camera','drivecar','ridebike','ridemotorcycle','flyplane','flyhelicopter'
];
// Some car variants (sports car, limo) are intentionally left out for now — the engine's decorative
// vehicle-art registry (engine/scene.js's ENGINE_VEHICLE_ART) doesn't have distinct art for them yet,
// unlike flying, which now reuses the main tool's purpose-built cockpit art directly.
const BACKGROUND_IDS = [
  'white','sky','grid','cafe','office','bedroom','street','beach','forest','gym','school','space',
  'restaurant','farm','mountain','lake','desert','castle','stadium','underwater','airport','hospital',
  'library','jungle','volcano','carnival'
];
const WEATHER_IDS = ['none','rain','snow','fog','sunny','autumn'];

// action:'custom' is the fallback for descriptions that don't match any of the ~50 named clips above —
// the AI fills in customPose's plain numeric parameters (amplitude*sin(frequency*t+phase)+baseline per
// joint, radians) instead, which engine/primitives.js's evalParametricPose renders through the exact
// same pipeline as a named clip. This is NOT code generation — the formula is fixed and hardcoded
// client-side; the AI only ever supplies numbers, and every one is re-clamped below regardless of what
// comes back, so a custom pose can never execute anything or produce a runaway/NaN value.
const ACTION_ENUM = CLIP_IDS.concat(['custom']);
const PARAM_POSE_JOINTS = [
  'torsoLean', 'headTilt', 'leftShoulderAngle', 'leftElbowBend', 'rightShoulderAngle', 'rightElbowBend',
  'leftHipAngle', 'leftKneeBend', 'rightHipAngle', 'rightKneeBend'
];
const JOINT_PARAM_SCHEMA = {
  type: 'object',
  properties: {
    baseline: { type: 'number', minimum: -3.2, maximum: 3.2, description: 'rest angle in radians' },
    amplitude: { type: 'number', minimum: 0, maximum: 3.2, description: 'how far it swings from baseline' },
    frequency: { type: 'number', minimum: 0, maximum: 12, description: 'oscillation speed, roughly matching js/poses.js clips: walk~6, run~10, idle~1' },
    phase: { type: 'number', minimum: -7, maximum: 7, description: 'radians offset; use ~3.14 (pi) between a left/right pair for alternating limbs' }
  }
};
const CUSTOM_POSE_PROPERTY = {
  type: 'object',
  description: 'Only used when action is "custom". Approximate the described motion with amplitude*sin(frequency*t+phase)+baseline per joint. Omit a joint to leave it at 0 (straight/neutral).',
  properties: {
    lying: { type: 'boolean', description: 'true if the character should lie flat (like swimming or sleeping) instead of standing.' },
    mouthOpen: { type: 'number', minimum: 0, maximum: 1 },
    bounce: {
      type: 'object',
      description: 'vertical bob, e.g. footsteps or jumping.',
      properties: { amplitude: { type: 'number', minimum: 0, maximum: 30 }, frequency: { type: 'number', minimum: 0, maximum: 12 } }
    },
    joints: { type: 'object', properties: Object.fromEntries(PARAM_POSE_JOINTS.map(name => [name, JOINT_PARAM_SCHEMA])) }
  }
};

// Group scenes: up to 12 stickmen — small squads (tennis doubles, a cricket XI, a football drill),
// NOT full 11v11/22-player matches, which would shrink figures past the point of reading as anything
// but dots (engine/scene.js auto-shrinks sizeScale as the count grows, but that only stays legible up
// to roughly a dozen). The wrapAroundTorso hug primitive only targets one other character's real
// skeleton, so hugFromBehind stays scoped to exactly 2 — for 3+ everyone resolves independently
// (their own action, side by side), same as pass 1 always did.
const MAX_CHARACTERS = 12;
const NAME_POOL = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jordan', 'Avery', 'Quinn', 'Drew', 'Reese'];
const CHAR_KEYS = ['character1', 'character2', 'character3', 'character4', 'character5', 'character6', 'character7', 'character8', 'character9', 'character10', 'character11', 'character12'];
const CHARACTER_COUNT_ENUM = Array.from({ length: MAX_CHARACTERS }, (_, i) => i + 1);

const SYSTEM_PROMPT =
  'You are the scene planner for the Scene Engine, an experimental part of Stickman Video Studio (a ' +
  'browser tool that renders simple 2D stick-figure animations — never realistic humans, never ' +
  'generated video/image pixels, everything is drawn by code). Given a description, call ' +
  'build_engine_scene using ONLY the allowed ids in the tool schema — never invent one. Set ' +
  'characterCount to match how many people the description actually involves, up to a maximum of 12 ' +
  '(e.g. "three people dancing" -> characterCount 3, "a stickman doing yoga" -> characterCount 1, ' +
  '"a cricket team fielding" -> characterCount around 11). There is no dedicated "play cricket/football/ ' +
  'tennis" action in the library — for sports scenes, approximate with the closest existing action ' +
  '(run, kick, throw, walk, idle, jump, cheer are usually the best fits) rather than leaving characters ' +
  'idle by default. Use "flyplane"/"flyhelicopter" for a character piloting/flying an actual aircraft ' +
  '(they climb to a cruising altitude automatically) — reserve "kite" specifically for flying a kite. ' +
  'When the description implies a group without an exact number (e.g. "a crowd", "a ' +
  'team", "several people"), pick a reasonable count for that context (a handful for "a few people", ' +
  '9-12 for "a team" or "a squad"). Give each character the action that best matches what they are ' +
  'doing; if all are doing the same thing, repeat that action for each. Set interaction to ' +
  '"hugFromBehind" ONLY when characterCount is exactly 2 AND the description clearly describes one ' +
  'person embracing/hugging the other from behind (including while riding something together) — ' +
  'otherwise "none". character2 through character12 are only used when characterCount is high enough ' +
  'to need them. If a description genuinely does not fit ANY of the named actions above even ' +
  'approximately (a truly novel motion), set action to "custom" and fill in customPose instead — ' +
  'describe each relevant joint with amplitude/frequency/phase/baseline (see the schema) rather than ' +
  'leaving the character idle. Prefer a named action whenever a reasonable one exists; "custom" is for ' +
  'when nothing on the list is even a rough fit.';

const CHARACTER_PROPERTY = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ACTION_ENUM },
    gender: { type: 'string', enum: ['male', 'female'] },
    customPose: CUSTOM_POSE_PROPERTY
  }
};

const BUILD_SCENE_TOOL = {
  name: 'build_engine_scene',
  description: 'Build a Scene Engine scene graph.',
  input_schema: {
    type: 'object',
    properties: Object.assign(
      {
        background: { type: 'string', enum: BACKGROUND_IDS },
        weather: { type: 'string', enum: WEATHER_IDS },
        characterCount: { type: 'integer', enum: CHARACTER_COUNT_ENUM },
        character1: { ...CHARACTER_PROPERTY, required: ['action'] }
      },
      Object.fromEntries(CHAR_KEYS.slice(1).map(key => [key, CHARACTER_PROPERTY])),
      { interaction: { type: 'string', enum: ['none', 'hugFromBehind'], description: 'hugFromBehind = character2 hugs character1 from behind. Only valid when characterCount is 2.' } }
    ),
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

function clampNumber(v, lo, hi, fallback) {
  const n = (typeof v === 'number' && isFinite(v)) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}
// Re-clamps every customPose number regardless of what the AI returned — defense in depth beyond the
// JSON schema's own min/max constraints, matching the same "never trust AI output directly" pattern
// buildFinalGraph already applies to every other field.
function sanitizeCustomPose(cp) {
  const src = cp || {};
  const joints = {};
  PARAM_POSE_JOINTS.forEach(name => {
    const j = (src.joints && src.joints[name]) || {};
    joints[name] = {
      baseline: clampNumber(j.baseline, -3.2, 3.2, 0),
      amplitude: clampNumber(j.amplitude, 0, 3.2, 0),
      frequency: clampNumber(j.frequency, 0, 12, 1),
      phase: clampNumber(j.phase, -7, 7, 0)
    };
  });
  const bounceSrc = src.bounce || {};
  return {
    lying: !!src.lying,
    mouthOpen: clampNumber(src.mouthOpen, 0, 1, 0),
    bounce: { amplitude: clampNumber(bounceSrc.amplitude, 0, 30, 0), frequency: clampNumber(bounceSrc.frequency, 0, 12, 1) },
    joints
  };
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
    const action = ACTION_ENUM.includes(c.action) ? c.action : 'idle';
    const gender = c.gender === 'female' ? 'female' : 'male';
    const entry = { name: NAME_POOL[i], action, gender };
    if (action === 'custom') entry.customPose = sanitizeCustomPose(c.customPose);
    result[key] = entry;
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
