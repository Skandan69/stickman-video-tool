// ---------- Scene Engine (Beta): two-pass resolution + generalized scene graph ----------
// This is the one real structural change the existing tool's pipeline doesn't support: js/scene.js's
// evaluateScene() resolves every character's pose fully independently (see the NOTE comment above
// poseFight in js/poses.js — "no cross-character contact solving"), so nothing can ever reach toward
// or wrap around another character's ACTUAL position. Two-pass resolution fixes that: pass 1 resolves
// every INDEPENDENT character (their pose doesn't depend on anyone else — this covers the vast
// majority of scenes, including any single-character prompt or two characters just doing their own
// thing side by side); pass 2 resolves DEPENDENT characters (currently just "hugs someone from
// behind") using pass 1's real, computed joint positions as live IK targets. Everything downstream —
// computeSkeleton, drawStickman, art styles, backgrounds, vehicle art — is the existing, completely
// unmodified rendering pipeline from js/render.js, js/styles.js, js/scene.js and js/vehicles.js. The
// engine only changes how a POSE gets computed, never how it's drawn.
var EngineScene = {}; // var (not const) so it's reachable via window.EngineScene in tests/debugging

// Decorative vehicle art (js/vehicles.js's generic drawVehicleProp path only — the main tool's special
// seated-in-car/flying visuals aren't reused here yet) auto-attaches to whichever character is doing a
// ride-type action. "jeep" is a pure alt-skin, not its own action — riding a bike or driving a car can
// both be re-skinned as a jeep if the description says so (see engine/ui.js's vehicleOverride).
var ENGINE_VEHICLE_ART = { bicycle: { scale: 1.5 }, jeep: { scale: 1.3 }, motorcycle: { scale: 1.7 }, car: { scale: 1 } };
var RIDE_ART_FOR_ACTION = { ridebike: 'bicycle', ridemotorcycle: 'motorcycle', drivecar: 'car' };
var JEEP_ELIGIBLE_ACTIONS = { ridebike: true, drivecar: true };
// Same idea as js/scene.js's MOVE_SPEEDS table (px/sec) — kept as an independent copy per the engine's
// "stays fully separate from the existing tool" design, not because the concept differs.
var MOVE_SPEEDS = { walk: 45, run: 100, skateboard: 130, drivecar: 180, ridebike: 90, ridemotorcycle: 190, swim: 55 };
// Group scenes: up to 12 stickmen (small squads — a tennis doubles match, a cricket XI, a football
// drill — not full 11v11/22-player matches, which would shrink figures past the point of reading as
// anything but dots; see engine.html's copy for that explicit scope note). hugFromBehind (the one
// cross-character IK interaction) still only makes sense between exactly 2 — with 3+ everyone
// resolves independently, same as pass 1 always did.
var MAX_ENGINE_CHARACTERS = 12;
var ENGINE_NAME_POOL = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jordan', 'Avery', 'Quinn', 'Drew', 'Reese'];
var ENGINE_CHAR_KEYS = ['character1', 'character2', 'character3', 'character4', 'character5', 'character6', 'character7', 'character8', 'character9', 'character10', 'character11', 'character12'];

// Auto-shrinks the whole figure as the group grows so a 10-12 person scene still fits the 800px stage
// without everyone overlapping — same sizeScale field applyBodyScale already reads for every other
// scene, just driven by character count here instead of a manual per-character setting.
function scaleForCount(n){
  if(n <= 3) return 1;
  if(n <= 6) return 0.85;
  if(n <= 9) return 0.72;
  return 0.6;
}

function computeEnginePositions(n){
  if(n <= 1) return [{ x: 400, faceDir: 1 }];
  const spacing = Math.min(180, 620 / (n - 1));
  const startX = 400 - (spacing * (n - 1)) / 2;
  const positions = [];
  for(let i=0;i<n;i++) positions.push({ x: startX + spacing*i, faceDir: i < Math.ceil(n/2) ? 1 : -1 });
  return positions;
}
function travelX(baseX, action, t){
  const speed = MOVE_SPEEDS[action];
  if(!speed) return baseX;
  const cycle = W + 220;
  // baseX is folded in as a phase offset (not a fixed start point — movers still wrap continuously)
  // so multiple characters sharing the same moving action (e.g. "three people riding bikes") stay
  // spread out at their assigned slot positions instead of all collapsing onto the same x.
  return (((t * speed) + baseX) % cycle) - 110;
}
function appearanceFor(spec, idx, charCount){
  const isFemale = (spec && spec.gender) === 'female';
  const defaultName = ENGINE_NAME_POOL[idx] || ('Person' + (idx + 1));
  return {
    name: (spec && spec.name) || defaultName, gender: isFemale ? 'female' : 'male',
    outfit: isFemale ? '#db2777' : '#1d4ed8', skin: '#ffe0bd',
    hairStyle: isFemale ? 'long' : 'short', hairColor: isFemale ? '#3b2415' : '#2b1b12',
    eyeStyle: isFemale ? 'happy' : 'dot', emotion: 'happy', sizeScale: scaleForCount(charCount || 1)
  };
}

// Demo / default scene graph, in the exact shape api/generate-engine-scene.js returns and
// resolveEngineFrame consumes — one rider hugged from behind, the proof-of-concept this whole
// approach started from.
EngineScene.demo = {
  background: 'mountain', weather: 'none', characterCount: 2,
  character1: { name:'Alex', action:'ridebike', gender:'male' },
  character2: { name:'Sam', action:'idle', gender:'female' },
  interaction: 'hugFromBehind',
  vehicleOverride: null
};

function resolveEngineFrame(graph, t){
  const charCount = Math.min(Math.max(graph.characterCount || 1, 1), MAX_ENGINE_CHARACTERS);
  const positions = computeEnginePositions(charCount);
  const specs = ENGINE_CHAR_KEYS.slice(0, charCount).map(k => graph[k] || {});
  // hugFromBehind (the one cross-character IK interaction) only makes sense between exactly 2 —
  // group scenes of 3+ always resolve every character independently.
  const interaction = charCount === 2 ? (graph.interaction || 'none') : 'none';
  // Only interaction supported today: character2 hugs character1 from behind. More interactions
  // (sit-together, face-to-face, etc.) are meant to slot in here as new named cases later.
  const dependentIdx = interaction === 'hugFromBehind' ? 1 : -1;

  const resolved = [];
  // --- Pass 1: every independent character (covers the common case: 1 character, a group of 3-5, or
  // 2 with no interaction) — each fully self-contained, same as any existing pose in the main tool. ---
  specs.forEach((spec, i)=>{
    if(i === dependentIdx) { resolved.push(null); return; }
    const appearance = appearanceFor(spec, i, charCount);
    applyBodyScale(appearance.bodyType, appearance.sizeScale, appearance.build);
    const faceDir = positions[i].faceDir;
    const x = travelX(positions[i].x, spec.action, t);
    const pose = EnginePrimitives.useClip(spec.action, t, {});
    const skeleton = computeSkeleton(x, faceDir, appearance, pose);
    resolved[i] = { id:'c'+i, x, faceDir, appearance, pose, action: spec.action, skeleton };
  });

  // --- Pass 2: dependent character, targeting pass 1's REAL resolved skeleton. ---
  if(dependentIdx >= 0){
    const target = resolved[1 - dependentIdx];
    const spec = specs[dependentIdx];
    const appearance = appearanceFor(spec, dependentIdx, charCount);
    applyBodyScale(appearance.bodyType, appearance.sizeScale, appearance.build);
    const faceDir = target.faceDir;
    const x = target.x - 22 * faceDir;
    const torsoTarget = { x: (target.skeleton.hip.x + target.skeleton.shoulder.x)/2, y: (target.skeleton.hip.y + target.skeleton.shoulder.y)/2 };
    const basePose = EnginePrimitives.standingStance(t, 5);
    const approxSkeleton = computeSkeleton(x, faceDir, appearance, basePose);
    const pose = EnginePrimitives.wrapAroundTorso(t, 5, approxSkeleton.shoulder, faceDir, torsoTarget);
    resolved[dependentIdx] = { id:'c'+dependentIdx, x, faceDir, appearance, pose, action: spec.action, skeleton: approxSkeleton, isDependent: true };
  }

  // Vehicle art auto-attaches to EVERY resolved character doing a ride-type action (not just one) —
  // matters now that group scenes can have several riders at once, e.g. "5 people riding bikes".
  const vehicleByIdx = {};
  resolved.forEach((c, i)=>{
    if(c && RIDE_ART_FOR_ACTION[c.action]){
      vehicleByIdx[i] = (graph.vehicleOverride && JEEP_ELIGIBLE_ACTIONS[c.action]) ? graph.vehicleOverride : RIDE_ART_FOR_ACTION[c.action];
    }
  });

  // Swimming always renders against an aquatic backdrop — poseSwim (js/poses.js) lies the character
  // flat, so it'd look wrong floating over a non-water background the AI or fallback matcher picked
  // (e.g. "swimming in a competition" defaulting to a plain beach/white background).
  const hasSwimmer = specs.some(s => s && s.action === 'swim');
  const background = hasSwimmer ? 'underwater' : graph.background;

  return { background, weather: graph.weather, localT: t, characters: resolved, vehicleByIdx };
}

function renderEngineFrame(frame){
  drawBackground(frame.background);
  drawWeatherOverlay(frame.weather, frame.localT);
  // Dependents (e.g. the hugger) draw first so they sit "behind" whoever they're interacting with;
  // everyone else draws in original order. Vehicle art draws immediately before its rider so it
  // layers correctly regardless of draw order otherwise.
  const order = frame.characters.map((c,i)=>i).sort((a,b)=>{
    const da = (frame.characters[a] && frame.characters[a].isDependent) ? 0 : 1;
    const db = (frame.characters[b] && frame.characters[b].isDependent) ? 0 : 1;
    return da - db;
  });
  order.forEach(i=>{
    const c = frame.characters[i];
    if(!c) return;
    const vehicleArt = frame.vehicleByIdx && frame.vehicleByIdx[i];
    if(vehicleArt){
      drawVehicleProp(c.x, c.faceDir, vehicleArt, frame.localT, (ENGINE_VEHICLE_ART[vehicleArt] || {scale:1}).scale);
    }
    STYLES.bold.drawStickman(c.x, c.faceDir, c.appearance, c.pose);
  });
}
