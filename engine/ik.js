// ---------- Scene Engine (Beta): standalone 2-bone IK ----------
// Deliberately an independent copy of the same law-of-cosines 2-bone solver already used inside
// js/poses.js (poseDrinkCoffee/poseEat/posePhoneCall), rather than importing/depending on it — the
// engine is built to stay fully separate from the existing pose library so nothing here can ever
// change how the existing tool behaves. It only reads the shared, read-only geometry constants from
// js/humanTypes.js (UPPER_ARM/FORE_ARM), the same constants every existing pose already uses.
//
// Convention (matches js/helpers.js upPoint/downPoint): angles are in a "local, pre-faceDir" frame —
// dx/dy describe the target as if faceDir were +1; computeSkeleton (js/render.js) applies the real
// faceDir when turning the returned angle into an actual world position. Callers must convert a real
// world-space target into this local frame before calling: localDx = (targetX - shoulderX) * faceDir,
// localDy = targetY - shoulderY.
var EngineIK = {}; // var (not const) so it's reachable via window.EngineIK in tests/debugging
EngineIK.armReachAngles = function(dx, dy){
  let dist = Math.sqrt(dx*dx + dy*dy);
  const maxReach = UPPER_ARM + FORE_ARM - 1;
  const minReach = Math.abs(UPPER_ARM - FORE_ARM) + 1;
  dist = Math.max(minReach, Math.min(maxReach, dist));
  const targetAngle = Math.atan2(dx, dy);
  const cosElbow = (UPPER_ARM*UPPER_ARM + FORE_ARM*FORE_ARM - dist*dist) / (2*UPPER_ARM*FORE_ARM);
  const elbowInterior = Math.acos(Math.max(-1, Math.min(1, cosElbow)));
  const cosShoulderOff = (UPPER_ARM*UPPER_ARM + dist*dist - FORE_ARM*FORE_ARM) / (2*UPPER_ARM*dist);
  const shoulderOffset = Math.acos(Math.max(-1, Math.min(1, cosShoulderOff)));
  return { shoulderAngle: targetAngle - shoulderOffset, elbowBend: (Math.PI - elbowInterior) };
};
// Converts a world-space target point into the local pre-faceDir frame an arm's shoulder needs.
EngineIK.worldTargetToLocal = function(shoulderWorld, targetWorld, faceDir){
  return { dx: (targetWorld.x - shoulderWorld.x) * faceDir, dy: targetWorld.y - shoulderWorld.y };
};
