// ---------- Scene Engine (Beta): two-pass resolution + demo scenes ----------
// This is the one real structural change the existing tool's pipeline doesn't support: js/scene.js's
// evaluateScene() resolves every character's pose fully independently (see the NOTE comment above
// poseFight in js/poses.js — "no cross-character contact solving"), so nothing can ever reach toward
// or wrap around another character's ACTUAL position. Two-pass resolution fixes that: pass 1 resolves
// "base" characters whose pose doesn't depend on anyone else (here, the vehicle rider); pass 2 resolves
// "dependent" characters using pass 1's real, computed joint positions as live IK targets (here, the
// hugger). Everything downstream — computeSkeleton, drawStickman, art styles, backgrounds, vehicle
// art — is the existing, completely unmodified rendering pipeline from js/render.js, js/styles.js,
// js/scene.js and js/vehicles.js. The engine only changes how a POSE gets computed, never how it's drawn.
var EngineScene = {}; // var (not const) so it's reachable via window.EngineScene in tests/debugging

// Per-vehicle travel speed (px/sec) and draw scale — same idea as js/scene.js's MOVE_SPEEDS table, just
// scoped to the two vehicles the engine currently supports. Adding a new rideable vehicle to the engine
// is meant to be "add one entry here" the same way js/vehicles.js's VEHICLES registry works.
var ENGINE_VEHICLES = {
  bicycle: { scale: 1.5, speed: 70 },
  jeep: { scale: 1.3, speed: 130 }
};

// Proof-of-concept scene: a duo ride with one character hugging the other from behind. No pose like
// this exists anywhere in js/poses.js's ~50 clips — the rider uses the real, unmodified 'ridebike'
// clip; the hugger's pose is assembled entirely from engine/primitives.js, live-targeting wherever the
// rider's torso actually is this frame (works at any body size/scale, not just one tuned distance).
EngineScene.demo = {
  id: 'bikehug',
  vehicleType: 'bicycle',
  background: 'mountain',
  weather: 'none',
  riderAppearance: { name:'Alex', gender:'male', outfit:'#1d4ed8', skin:'#ffe0bd', hairStyle:'short', hairColor:'#2b1b12', eyeStyle:'dot', emotion:'happy' },
  huggerAppearance: { name:'Sam', gender:'female', outfit:'#db2777', skin:'#ffe0bd', hairStyle:'long', hairColor:'#3b2415', eyeStyle:'happy', emotion:'happy' }
};

function resolveEngineFrame(scene, t){
  const vcfg = ENGINE_VEHICLES[scene.vehicleType] || ENGINE_VEHICLES.bicycle;
  const riderFaceDir = 1;
  // Continuous rightward travel that wraps around once the vehicle has fully exited the canvas on the
  // right, reappearing off-screen on the left — reads as "riding across the scene" on a loop rather
  // than sitting fixed in one spot. Uses the full elapsed t (not modulo'd against any fixed scene
  // duration) so there's no jump/reset discontinuity; the pedaling/animation cycle (inside poseRide)
  // is independently periodic via its own internal sine, so it stays smooth regardless.
  const cycle = W + 220;
  const riderX = ((t * vcfg.speed) % cycle) - 110;

  // --- Pass 1: base character (rider). Fully independent, exactly like any existing pose. ---
  const riderPreset = applyBodyScale(scene.riderAppearance.bodyType, scene.riderAppearance.sizeScale, scene.riderAppearance.build);
  const riderPose = EnginePrimitives.useClip('ridebike', t, {});
  riderPose.bounceY *= riderPreset.scale * (scene.riderAppearance.sizeScale || 1);
  const riderSkeleton = computeSkeleton(riderX, riderFaceDir, scene.riderAppearance, riderPose);

  // --- Pass 2: dependent character (hugger). Targets pass 1's REAL resolved torso point. ---
  // Drawn at a small offset BEHIND the rider (opposite their facing direction), not the exact same x —
  // at identical x the hugger's whole body sits directly behind the rider's and is almost entirely
  // hidden (tried first; looked like overlapping color glitches, not two people). Offsetting back lets
  // the hugger's head/shoulders peek out realistically while their arms still IK-target the rider's
  // REAL torso position, so the wrap still reads as reaching onto the rider rather than floating.
  const huggerX = riderX - 22 * riderFaceDir, huggerFaceDir = riderFaceDir;
  applyBodyScale(scene.huggerAppearance.bodyType, scene.huggerAppearance.sizeScale, scene.huggerAppearance.build);
  const torsoTarget = { x: (riderSkeleton.hip.x + riderSkeleton.shoulder.x) / 2, y: (riderSkeleton.hip.y + riderSkeleton.shoulder.y) / 2 };
  // Legs/torso/head resolved first from a plain standing stance so there's a real shoulder position to
  // solve the arm IK from (shoulder placement depends on hip+torsoLean+faceDir, never on arm angles —
  // so this doesn't need to iterate, one pass is exact).
  const huggerBasePose = EnginePrimitives.standingStance(t, 5);
  const huggerApproxSkeleton = computeSkeleton(huggerX, huggerFaceDir, scene.huggerAppearance, huggerBasePose);
  const huggerPose = EnginePrimitives.wrapAroundTorso(t, 5, huggerApproxSkeleton.shoulder, huggerFaceDir, torsoTarget);

  return {
    background: scene.background, weather: scene.weather, localT: t, vehicleType: scene.vehicleType, vehicleScale: vcfg.scale,
    characters: [
      { id:'hugger', x:huggerX, faceDir:huggerFaceDir, appearance:scene.huggerAppearance, pose:huggerPose },
      { id:'rider', x:riderX, faceDir:riderFaceDir, appearance:scene.riderAppearance, pose:riderPose }
    ]
  };
}

function renderEngineFrame(frame){
  drawBackground(frame.background);
  drawWeatherOverlay(frame.weather, frame.localT);
  const hugger = frame.characters.find(c=>c.id==='hugger');
  const rider = frame.characters.find(c=>c.id==='rider');
  // Hugger drawn first (behind), then the vehicle prop, then the rider on top — the exact same
  // drawVehicleProp(...) call js/scene.js already uses for ride clips, so the vehicle art itself is
  // completely unchanged/reused, whichever vehicle is selected.
  STYLES.bold.drawStickman(hugger.x, hugger.faceDir, hugger.appearance, hugger.pose);
  drawVehicleProp(rider.x, rider.faceDir, frame.vehicleType, frame.localT, frame.vehicleScale);
  STYLES.bold.drawStickman(rider.x, rider.faceDir, rider.appearance, rider.pose);
}
