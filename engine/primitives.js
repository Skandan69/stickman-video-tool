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
