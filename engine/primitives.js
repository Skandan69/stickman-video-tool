// ---------- Scene Engine (Beta): composable pose primitives ----------
// The existing tool's pose library (js/poses.js) is ~50 whole-body functions: one hand-authored
// function per named action, each a dead end if the exact requested scenario wasn't anticipated. This
// file is the alternative: a small set of reusable physical primitives that COMBINE to produce poses
// nobody explicitly wrote — e.g. "sits on a vehicle" + "another character's arms wrap around their
// torso from behind" makes a duo-bike-hug scene without a bespoke poseDuoBikeHug function existing.
//
// Every primitive still returns the exact same BonePose shape js/poses.js already uses (torsoLean,
// headTilt, leftShoulderAngle, etc.) so the existing computeSkeleton/drawStickman rendering pipeline
// (js/render.js, js/styles.js) can draw the result completely unmodified — the engine only changes
// HOW a pose gets computed, never how it gets drawn.
var EnginePrimitives = {}; // var (not const) so it's reachable via window.EnginePrimitives in tests/debugging

// Reuse an existing whole-body clip as-is (e.g. a character riding a bike doesn't need reinventing —
// js/poses.js's poseRide already does this well). This is the primitive that lets the engine treat the
// current ~50-pose library as a set of readymade building blocks rather than something to bypass.
EnginePrimitives.useClip = function(clipId, t, opts){
  return (CLIPS[clipId] || CLIPS.idle).pose(t, opts || {});
};

// A light, natural standing stance for a character who isn't doing anything else with their legs —
// used as the base for characters whose defining action this frame is an arm-only primitive (like
// wrapping someone else in a hug) rather than a named whole-body clip.
EnginePrimitives.standingStance = function(t, seed){
  const sway = Math.sin(t*1.1 + (seed||0))*0.03;
  return {
    torsoLean: 0.02 + sway*0.3, headTilt: 0.05*Math.sin(t*0.9+(seed||0)), bounceY: Math.sin(t*1.6+(seed||0))*0.8,
    leftShoulderAngle: 0.1, leftElbowBend: 0.15, rightShoulderAngle: 0.1, rightElbowBend: 0.15,
    leftHipAngle: 0.05, leftKneeBend: 0.06, rightHipAngle: -0.05, rightKneeBend: 0.06, mouthOpen: 0
  };
};

// The core cross-character primitive: bends BOTH of this character's arms via 2-bone IK so their hands
// reach toward two target points on another character's already-resolved skeleton (e.g. the far and
// near sides of their torso), instead of a fixed hardcoded hug angle. `selfShoulderWorld`/`faceDir` are
// this character's OWN resolved shoulder position (computed from their partial pose first); the target
// points come from the OTHER character's skeleton, computed in an earlier resolve pass — see
// resolveTwoPass in engine/scene.js. This is what makes "wrap around whoever/whatever is actually
// there" possible instead of a pose tuned for one assumed distance/position.
EnginePrimitives.reachBothHandsTo = function(selfShoulderWorld, faceDir, leftTargetWorld, rightTargetWorld){
  const l = EngineIK.worldTargetToLocal(selfShoulderWorld, leftTargetWorld, faceDir);
  const r = EngineIK.worldTargetToLocal(selfShoulderWorld, rightTargetWorld, faceDir);
  const la = EngineIK.armReachAngles(l.dx, l.dy);
  const ra = EngineIK.armReachAngles(r.dx, r.dy);
  return { leftShoulderAngle: la.shoulderAngle, leftElbowBend: la.elbowBend,
           rightShoulderAngle: ra.shoulderAngle, rightElbowBend: ra.elbowBend };
};

// "wrapAround": the named composite primitive for a hug-from-behind/beside type interaction. Takes a
// base standing stance (legs/torso/head) and overrides just the arms via reachBothHandsTo, targeting
// two points slightly left/right of the other character's torso center so the arms visibly wrap around
// rather than both hands converging on one point.
EnginePrimitives.wrapAroundTorso = function(t, seed, selfShoulderWorld, faceDir, otherTorsoWorld){
  const base = EnginePrimitives.standingStance(t, seed);
  const spread = 9; // world px either side of the other character's torso center
  const leftTarget = { x: otherTorsoWorld.x - spread, y: otherTorsoWorld.y };
  const rightTarget = { x: otherTorsoWorld.x + spread, y: otherTorsoWorld.y };
  const arms = EnginePrimitives.reachBothHandsTo(selfShoulderWorld, faceDir, leftTarget, rightTarget);
  return Object.assign({}, base, arms);
};

// ---------- AI-generated parametric pose fallback ----------
// Every hand-written pose in js/poses.js already boils down to the same shape: baseline + amplitude *
// sin(frequency*t + phase) per joint (see poseWalk/poseRun/poseSwim/poseIdle etc — they're almost all
// literally this, sometimes with a Math.max(0, ...) clamp for one-directional motion). That means an AI
// can describe a genuinely new action — one that doesn't match any of the ~50 named clips — just by
// filling in those four numbers per joint, WITHOUT generating or eval'ing any actual code. This is what
// makes it safe to expose to an LLM: the "formula" is fixed and hardcoded right here, the AI only ever
// supplies plain numbers, and every number is clamped to a safe range below regardless of what comes
// back, so a custom pose can never produce NaN/runaway values or execute anything.
var PARAM_POSE_JOINTS = [
  'torsoLean', 'headTilt', 'leftShoulderAngle', 'leftElbowBend', 'rightShoulderAngle', 'rightElbowBend',
  'leftHipAngle', 'leftKneeBend', 'rightHipAngle', 'rightKneeBend'
];
function clampParam(v, lo, hi, fallback){
  const n = (typeof v === 'number' && isFinite(v)) ? v : fallback;
  return Math.max(lo, Math.min(hi, n));
}
EnginePrimitives.evalParametricPose = function(t, desc){
  const d = desc || {};
  const joints = d.joints || {};
  const pose = {};
  PARAM_POSE_JOINTS.forEach(name=>{
    const cfg = joints[name] || {};
    const baseline = clampParam(cfg.baseline, -3.2, 3.2, 0);
    const amplitude = clampParam(cfg.amplitude, 0, 3.2, 0);
    const frequency = clampParam(cfg.frequency, 0, 12, 1);
    const phase = clampParam(cfg.phase, -7, 7, 0);
    pose[name] = baseline + amplitude * Math.sin(frequency * t + phase);
  });
  const bounceCfg = d.bounce || {};
  const bounceAmp = clampParam(bounceCfg.amplitude, 0, 30, 0);
  const bounceFreq = clampParam(bounceCfg.frequency, 0, 12, 1);
  pose.bounceY = bounceAmp * Math.sin(bounceFreq * t);
  pose.mouthOpen = clampParam(d.mouthOpen, 0, 1, 0);
  if(d.lying) pose.lying = true;
  return pose;
};
