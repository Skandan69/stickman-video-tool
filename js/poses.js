// ---------- animation clips: pure functions of (localT, opts) -> BonePose ----------
// Idle/talk arms deliberately layer 2-3 sine terms at non-multiple frequencies (rather than one clean
// oscillation) — a single sine reads as a metronome/robotic tick, while several slightly-offbeat waves
// summed together produce the small, irregular-looking drift real held-still gestures have. Also used
// by poseTalk below for the speaking gesture and by the mouth-open curve, which is now a continuous
// shaped wave instead of a hard on/off step (previously: fully open or fully 0.2, snapping between the
// two every ~0.3s — now eases through the range instead).
function poseIdle(t){
  return {
    torsoLean: 0.018*Math.sin(t*1.2) + 0.008*Math.sin(t*0.53+1.3),
    headTilt: 0.03*Math.sin(t*0.9+0.6) + 0.015*Math.sin(t*2.3+2),
    bounceY: Math.sin(t*2)*1.4 + 0.4*Math.sin(t*0.87+0.4),
    leftShoulderAngle: 0.05*Math.sin(t*1.05) + 0.025*Math.sin(t*0.47+1.1),
    leftElbowBend: 0.15 + 0.04*Math.sin(t*0.6+0.8),
    rightShoulderAngle: 0.05*Math.sin(t*1.05+1) + 0.025*Math.sin(t*0.47+2.4),
    rightElbowBend: 0.15 + 0.04*Math.sin(t*0.6+2.1),
    leftHipAngle:0, leftKneeBend:0, rightHipAngle:0, rightKneeBend:0, mouthOpen:0
  };
}
function poseTalk(t, speaking){
  // Two non-harmonic gesture waves (5.3 and 2.7 rad/s, not integer multiples of each other) summed
  // together so the speaking-hand-raise drifts and varies instead of ticking on one fixed beat.
  const gestureA = Math.sin(t*5.3), gestureB = Math.sin(t*2.7+0.9);
  const mouthWave = Math.sin(t*9.2)*0.5 + Math.sin(t*13.7+1)*0.15;
  return {
    torsoLean: 0.03*Math.sin(t*1.1) + (speaking ? 0.018*Math.sin(t*2.2+0.5) : 0),
    headTilt: speaking ? 0.1*gestureA + 0.05*gestureB : 0.05*Math.sin(t*1.5),
    bounceY: Math.sin(t*2)*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.3+1) + (speaking ? 0.05*Math.sin(t*3.1+2) : 0), leftElbowBend: 0.15,
    rightShoulderAngle: speaking ? 1.1 + 0.35*gestureA + 0.15*gestureB : 0.15*Math.sin(t*1.2),
    rightElbowBend: speaking ? -0.55 + 0.25*gestureB + 0.12*gestureA : 0.2,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: speaking ? Math.max(0.12, Math.min(1, 0.55 + mouthWave)) : 0
  };
}
function poseKite(t){
  return {
    torsoLean: -0.08+0.06*Math.sin(t*1.5),
    headTilt: -0.35+0.05*Math.sin(t*2),
    bounceY: Math.abs(Math.sin(t*2))*2,
    leftShoulderAngle: 2.5+0.08*Math.sin(t*3), leftElbowBend: -0.2+0.1*Math.sin(t*3+1),
    rightShoulderAngle: 0.2*Math.sin(t*1.5), rightElbowBend: 0.2,
    leftHipAngle: 0.05*Math.sin(t*1.2), leftKneeBend: 0.05,
    rightHipAngle: -0.05*Math.sin(t*1.2), rightKneeBend: 0.05,
    mouthOpen: 0
  };
}
function poseWalk(t){
  const w = t*6;
  return {
    torsoLean: 0.05*Math.sin(w), headTilt: 0.03*Math.sin(w), bounceY: Math.abs(Math.sin(w))*4,
    leftShoulderAngle: -0.5*Math.sin(w), leftElbowBend: 0.3, rightShoulderAngle: 0.5*Math.sin(w), rightElbowBend: 0.3,
    leftHipAngle: 0.6*Math.sin(w), leftKneeBend: 0.9*Math.max(0, Math.sin(w+Math.PI)),
    rightHipAngle: -0.6*Math.sin(w), rightKneeBend: 0.9*Math.max(0, Math.sin(w)),
    mouthOpen: 0
  };
}
function poseRun(t){
  const w = t*10;
  return {
    torsoLean: 0.25 + 0.05*Math.sin(w), headTilt: 0.08*Math.sin(w), bounceY: Math.abs(Math.sin(w))*7,
    leftShoulderAngle: -0.9*Math.sin(w), leftElbowBend: 0.9, rightShoulderAngle: 0.9*Math.sin(w), rightElbowBend: 0.9,
    leftHipAngle: 0.9*Math.sin(w), leftKneeBend: 1.3*Math.max(0, Math.sin(w+Math.PI)),
    rightHipAngle: -0.9*Math.sin(w), rightKneeBend: 1.3*Math.max(0, Math.sin(w)),
    mouthOpen: 0
  };
}
// NOTE on fight/argue/hug/high-five: each character's pose is still computed independently (no
// cross-character contact solving, same as the existing 'dance' clip) — placing two characters
// close together with phase-offset motion reads as "interacting" without literal hand contact.
// True skeletal contact would need pose functions to receive the partner's transform, which the
// evaluateScene(scene,t) pipeline doesn't pass today.
function poseFight(t, offset){
  const w = t*6 + (offset||0);
  const punch = Math.max(0, Math.sin(w));
  return {
    torsoLean: 0.15 + 0.1*Math.sin(w*2), headTilt: -0.05*Math.sin(w), bounceY: Math.abs(Math.sin(w*2))*3,
    leftShoulderAngle: 0.6 - 0.3*Math.sin(w), leftElbowBend: -0.9,
    rightShoulderAngle: 1.4*punch, rightElbowBend: -1.5*punch - 0.3,
    leftHipAngle: 0.15, leftKneeBend: 0.3, rightHipAngle: -0.1, rightKneeBend: 0.2,
    mouthOpen: 0
  };
}
function poseArgue(t, offset){
  const w = t*3 + (offset||0);
  return {
    torsoLean: 0.12*Math.sin(w), headTilt: 0.1*Math.sin(w*1.5), bounceY: Math.abs(Math.sin(w*2))*1.5,
    leftShoulderAngle: 0.2, leftElbowBend: 0.5,
    rightShoulderAngle: 1.1 + 0.3*Math.sin(w*2), rightElbowBend: -0.5,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: Math.sin(w*4) > 0 ? 1 : 0.2
  };
}
function poseHug(t){
  const settle = Math.min(1, t/0.6);
  return {
    torsoLean: 0.1*settle, headTilt: 0.05*Math.sin(t*1.5), bounceY: Math.sin(t*2)*1,
    leftShoulderAngle: 1.3*settle, leftElbowBend: -0.4*settle,
    rightShoulderAngle: 1.3*settle, rightElbowBend: -0.4*settle,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseHighFive(t){
  const cycle = t % 2;
  const raise = cycle < 1 ? Math.sin(cycle*Math.PI) : 0;
  return {
    torsoLean: 0.05*Math.sin(t*1.3), headTilt: 0.05*Math.sin(t*1.3), bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.3), leftElbowBend: 0.15,
    rightShoulderAngle: 2.2*raise, rightElbowBend: -0.5*raise,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseShake(t){
  const settle = Math.min(1, t/0.5);
  const shake = t > 0.5 ? Math.sin((t-0.5)*14)*0.15 : 0;
  return {
    torsoLean: 0.08*settle, headTilt: 0.05*Math.sin(t*1.5), bounceY: Math.abs(Math.sin(t*2))*1,
    leftShoulderAngle: 0.1*Math.sin(t*1.3), leftElbowBend: 0.15,
    rightShoulderAngle: 1.5*settle+shake, rightElbowBend: -0.6*settle,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseWave(t){
  return {
    torsoLean: 0.02*Math.sin(t*1.3), headTilt: 0.05*Math.sin(t*1.3), bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.3), leftElbowBend: 0.15, rightShoulderAngle: 2.6+0.5*Math.sin(t*8), rightElbowBend: -0.3,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseDance(t, offset){
  const w = t*5+(offset||0);
  return {
    torsoLean: 0.15*Math.sin(w), headTilt: 0.1*Math.sin(w+1), bounceY: Math.abs(Math.sin(w*2))*5,
    leftShoulderAngle: 1.2+0.8*Math.sin(w), leftElbowBend: -0.3, rightShoulderAngle: 1.2-0.8*Math.sin(w), rightElbowBend: -0.3,
    leftHipAngle: 0.4*Math.sin(w), leftKneeBend: 0.3, rightHipAngle: -0.4*Math.sin(w), rightKneeBend: 0.3,
    mouthOpen: 0
  };
}

// 2-bone IK: given a target point (dx,dy) offset from the shoulder in the pose's local,
// pre-faceDir frame (same convention as upPoint/downPoint: x=sin(angle)*len, y=cos(angle)*len),
// solve for shoulderAngle/elbowBend so the hand actually reaches that point (law of cosines).
function armReachAngles(dx, dy){
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
}
function headPointsRelToShoulder(headTilt){
  const neckX = Math.sin(headTilt)*NECK_LEN, neckY = -Math.cos(headTilt)*NECK_LEN;
  const headX = neckX + Math.sin(headTilt)*(HEAD_R*0.9), headY = neckY - Math.cos(headTilt)*(HEAD_R*0.9);
  return { x: headX, y: headY };
}

function poseSit(t){
  return {
    torsoLean: 0.03*Math.sin(t*1.1), headTilt: 0.05*Math.sin(t*1.3),
    bounceY: -22 + Math.sin(t*1.5)*0.8,
    leftShoulderAngle: 0.15*Math.sin(t*1.2), leftElbowBend: 0.3,
    rightShoulderAngle: 0.15*Math.sin(t*1.2+1), rightElbowBend: 0.3,
    leftHipAngle: 1.3, leftKneeBend: -1.3, rightHipAngle: 1.3, rightKneeBend: -1.3,
    mouthOpen: 0
  };
}
function poseDrinkCoffee(t){
  const cycle = t % 4;
  const liftPhase = cycle < 1.2 ? Math.sin((cycle/1.2)*Math.PI) : 0;
  const base = poseSit(t);
  base.headTilt = base.headTilt + 0.06*liftPhase;
  const head = headPointsRelToShoulder(base.headTilt);
  const mouth = { x: head.x + 7.2, y: head.y + 9.6 }; // matches drawFace's mouth position (head.x+faceDir*6*S, head.y+8*S)
  const reach = armReachAngles(mouth.x, mouth.y);
  const restShoulder = 0.4, restElbow = 0.6; // relaxed, cup resting near the lap
  base.rightShoulderAngle = restShoulder + (reach.shoulderAngle - restShoulder) * liftPhase;
  base.rightElbowBend = restElbow + (reach.elbowBend - restElbow) * liftPhase;
  base.mouthOpen = liftPhase > 0.6 ? 1 : 0;
  return base;
}
function poseEat(t){
  const cycle = t % 3;
  const liftPhase = cycle < 1 ? Math.sin(cycle*Math.PI) : 0;
  const base = poseSit(t);
  base.headTilt = base.headTilt + 0.05*liftPhase;
  const head = headPointsRelToShoulder(base.headTilt);
  const mouth = { x: head.x + 7.2, y: head.y + 9.6 }; // matches drawFace's mouth position (head.x+faceDir*6*S, head.y+8*S)
  const reach = armReachAngles(mouth.x, mouth.y);
  const restShoulder = 0.4, restElbow = 0.6; // relaxed, food resting near the lap between bites
  base.rightShoulderAngle = restShoulder + (reach.shoulderAngle - restShoulder) * liftPhase;
  base.rightElbowBend = restElbow + (reach.elbowBend - restElbow) * liftPhase;
  base.mouthOpen = liftPhase > 0.5 ? 1 : 0;
  return base;
}
function posePhoneCall(t){
  const base = poseIdle(t);
  base.headTilt = base.headTilt + 0.15;
  const head = headPointsRelToShoulder(base.headTilt);
  const ear = { x: head.x + 13.2, y: head.y - 2.4 }; // side of the head, ear height (scaled with the bigger head — see drawFace's S)
  const reach = armReachAngles(ear.x, ear.y);
  base.rightShoulderAngle = reach.shoulderAngle + 0.03*Math.sin(t*2);
  base.rightElbowBend = reach.elbowBend;
  base.leftShoulderAngle = 0.1*Math.sin(t*1.1);
  base.leftElbowBend = 0.2;
  base.mouthOpen = Math.sin(t*9) > 0.2 ? 1 : 0.15;
  return base;
}

function poseJump(t){
  const cycle = 1.1;
  const phase = (t % cycle) / cycle;
  const height = Math.max(0, Math.sin(phase*Math.PI)) * 26;
  const crouch = phase < 0.12 ? (0.12-phase)/0.12 : (phase > 0.9 ? (phase-0.9)/0.1 : 0);
  return {
    torsoLean: -0.05 + 0.05*Math.sin(phase*Math.PI),
    headTilt: 0.05*Math.sin(phase*Math.PI),
    bounceY: height - crouch*8,
    leftShoulderAngle: -0.9 - crouch*0.4 + 0.5*Math.sin(phase*Math.PI), leftElbowBend: 0.4,
    rightShoulderAngle: 0.9 + crouch*0.4 - 0.5*Math.sin(phase*Math.PI), rightElbowBend: -0.4,
    leftHipAngle: crouch*0.7 - height*0.015, leftKneeBend: crouch*1.1 + height*0.02,
    rightHipAngle: crouch*0.7 - height*0.015, rightKneeBend: crouch*1.1 + height*0.02,
    mouthOpen: height > 18 ? 1 : 0
  };
}

function poseKick(t){
  const w = t*4;
  const kick = Math.max(0, Math.sin(w));
  return {
    torsoLean: 0.1, headTilt: 0.05*Math.sin(w), bounceY: Math.abs(Math.sin(w*2))*3,
    leftShoulderAngle: 0.3*Math.sin(w), leftElbowBend: 0.4,
    rightShoulderAngle: -0.2*Math.sin(w), rightElbowBend: 0.4,
    leftHipAngle: -1.3*kick, leftKneeBend: 1.1*kick + 0.2,
    rightHipAngle: 0.15, rightKneeBend: 0.2,
    mouthOpen: 0
  };
}
function poseThrow(t){
  const w = t*3;
  const wind = Math.sin(w);
  return {
    torsoLean: 0.15 + 0.15*Math.max(0,-wind), headTilt: 0.05*wind, bounceY: Math.abs(Math.sin(w*2))*2,
    leftShoulderAngle: 0.2, leftElbowBend: 0.3,
    rightShoulderAngle: -1.6*Math.max(0,wind) + 0.6*Math.max(0,-wind), rightElbowBend: -1.2*Math.max(0,wind) - 0.2,
    leftHipAngle: 0.1, leftKneeBend: 0.2, rightHipAngle: -0.1, rightKneeBend: 0.15,
    mouthOpen: 0
  };
}
function poseSwim(t){
  const w = t*5;
  return {
    torsoLean: 0.55, headTilt: 0.4, bounceY: 3+Math.sin(w*2)*2,
    leftShoulderAngle: 1.6*Math.sin(w), leftElbowBend: -0.6-0.4*Math.max(0,Math.sin(w)),
    rightShoulderAngle: 1.6*Math.sin(w+Math.PI), rightElbowBend: -0.6-0.4*Math.max(0,Math.sin(w+Math.PI)),
    leftHipAngle: 0.1*Math.sin(w*2), leftKneeBend: 0.5+0.3*Math.max(0,Math.sin(w*2)),
    rightHipAngle: 0.1*Math.sin(w*2+Math.PI), rightKneeBend: 0.5+0.3*Math.max(0,Math.sin(w*2+Math.PI)),
    mouthOpen: 0
  };
}
// "Sleep" lies the figure flat on the ground: computeSkeleton (render.js) special-cases
// pose.lying to drop the hip anchor near ground level, and every angle here is set close to
// +-1.5rad (~90deg) so torso/head/legs form one coherent horizontal line — since joint angles in
// this engine are world-relative, not parent-relative, matching angles is what keeps segments
// visually connected instead of bending at a sharp disconnected joint.
function poseSleep(t){
  const breathe = Math.sin(t*1.2)*0.025;
  return {
    lying: true,
    torsoLean: 1.5 + breathe, headTilt: 1.42, bounceY: 0,
    leftShoulderAngle: -1.2, leftElbowBend: 0.4,
    rightShoulderAngle: -1.6, rightElbowBend: -0.3,
    leftHipAngle: -1.48, leftKneeBend: 0.15,
    rightHipAngle: -1.52, rightKneeBend: 0.08,
    mouthOpen: 0
  };
}
function poseRead(t){
  const turn = Math.sin(t*1.5)*0.15;
  return {
    torsoLean: 0.05, headTilt: 0.35, bounceY: Math.sin(t*2)*1,
    leftShoulderAngle: 0.75+turn, leftElbowBend: -1.0,
    rightShoulderAngle: 0.75-turn, rightElbowBend: -1.0,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseClap(t){
  const w = t*6;
  return {
    torsoLean: 0.05, headTilt: 0.05*Math.sin(w*0.5), bounceY: Math.abs(Math.sin(w*0.5))*2,
    leftShoulderAngle: 0.6+0.35*Math.sin(w), leftElbowBend: -0.9,
    rightShoulderAngle: 0.6-0.35*Math.sin(w), rightElbowBend: -0.9,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseBow(t){
  const w = t*1.8;
  const bend = Math.max(0, Math.sin(w));
  return {
    torsoLean: 0.9*bend, headTilt: 0.9*bend, bounceY: 0,
    leftShoulderAngle: 0.1, leftElbowBend: 0.15,
    rightShoulderAngle: -0.1, rightElbowBend: 0.15,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}

function poseYoga(t){
  const w = t*1.5;
  return {
    torsoLean: 0.05*Math.sin(w), headTilt: 0, bounceY: 0,
    leftShoulderAngle: 2.9, leftElbowBend: 0.3,
    rightShoulderAngle: -2.9, rightElbowBend: -0.3,
    leftHipAngle: -1.2, leftKneeBend: 1.8,
    rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseCry(t){
  const w = t*8;
  return {
    torsoLean: 0.15, headTilt: 0.5+0.05*Math.sin(w), bounceY: Math.abs(Math.sin(w))*1.5,
    leftShoulderAngle: 0.7, leftElbowBend: -1.3,
    rightShoulderAngle: -0.7, rightElbowBend: -1.3,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function posePoint(t){
  const w = t*1.5;
  return {
    torsoLean: 0.05, headTilt: 0.05*Math.sin(w), bounceY: 0,
    leftShoulderAngle: 0.1, leftElbowBend: 0.15,
    rightShoulderAngle: 1.55, rightElbowBend: -0.1,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseSalute(t){
  return {
    torsoLean: 0, headTilt: 0, bounceY: Math.sin(t*2)*0.6,
    leftShoulderAngle: 0.05, leftElbowBend: 0.1,
    rightShoulderAngle: 0.3, rightElbowBend: -2.0,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseShrug(t){
  return {
    torsoLean: 0, headTilt: 0.1*Math.sin(t*2), bounceY: Math.abs(Math.sin(t*2))*2,
    leftShoulderAngle: 0.3, leftElbowBend: -0.9,
    rightShoulderAngle: -0.3, rightElbowBend: -0.9,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseStretch(t){
  const w = t*1.2;
  return {
    torsoLean: 0.15*Math.sin(w), headTilt: 0.1*Math.sin(w), bounceY: 0,
    leftShoulderAngle: 3.0+0.2*Math.sin(w), leftElbowBend: 0,
    rightShoulderAngle: -3.0-0.2*Math.sin(w), rightElbowBend: 0,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
// "Fall down" cycles a stumble into a sprawled lying moment (reusing the pose.lying anchor scheme
// from poseSleep) — the loop resetting back to the stumble at the top reads as "gets back up".
function poseFallDown(t){
  const cycle = 2.5;
  const phase = (t % cycle) / cycle;
  if(phase < 0.3){
    const stumble = phase/0.3;
    return {
      torsoLean: 0.3+0.9*stumble, headTilt: 0.2+0.7*stumble, bounceY: 0,
      leftShoulderAngle: -0.5, leftElbowBend: 0.3,
      rightShoulderAngle: 0.8, rightElbowBend: -0.3,
      leftHipAngle: 0.3*stumble, leftKneeBend: 0.5*stumble,
      rightHipAngle: -0.2*stumble, rightKneeBend: 0.3*stumble,
      mouthOpen: stumble>0.5 ? 1 : 0
    };
  }
  return {
    lying: true,
    torsoLean: 1.5, headTilt: 1.3, bounceY: 0,
    leftShoulderAngle: -0.6, leftElbowBend: 0.6,
    rightShoulderAngle: -2.2, rightElbowBend: -0.5,
    leftHipAngle: -1.9, leftKneeBend: 0.6,
    rightHipAngle: -1.1, rightKneeBend: -0.3,
    mouthOpen: 0
  };
}

// Push-up: lying-anchored (like sleep/fall) with the whole body oscillating up/down as elbows bend.
function posePushup(t){
  const w = t*3;
  const down = Math.max(0, Math.sin(w));
  return {
    lying: true,
    torsoLean: 1.5, headTilt: 1.4, bounceY: -down*4,
    leftShoulderAngle: -1.0, leftElbowBend: 0.3+1.2*down,
    rightShoulderAngle: -1.0, rightElbowBend: 0.3+1.2*down,
    leftHipAngle: -1.5, leftKneeBend: 0.1,
    rightHipAngle: -1.5, rightKneeBend: 0.1,
    mouthOpen: 0
  };
}
function poseCheer(t){
  const w = t*4;
  return {
    torsoLean: 0.05*Math.sin(w), headTilt: 0, bounceY: Math.abs(Math.sin(w))*5,
    leftShoulderAngle: 2.7+0.15*Math.sin(w), leftElbowBend: 0.1,
    rightShoulderAngle: -2.7-0.15*Math.sin(w), rightElbowBend: -0.1,
    leftHipAngle: 0.1*Math.sin(w), leftKneeBend: 0.3*Math.abs(Math.sin(w)),
    rightHipAngle: -0.1*Math.sin(w), rightKneeBend: 0.3*Math.abs(Math.sin(w)),
    mouthOpen: Math.sin(w) > 0.3 ? 1 : 0
  };
}
function poseDrum(t){
  const w = t*10;
  return {
    torsoLean: 0.05*Math.sin(t*2), headTilt: 0.08*Math.sin(t*2.5), bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 1.1+0.5*Math.sin(w), leftElbowBend: -0.8+0.3*Math.sin(w),
    rightShoulderAngle: 1.1+0.5*Math.sin(w+Math.PI), rightElbowBend: -0.8+0.3*Math.sin(w+Math.PI),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseCartwheel(t){
  const cycle = 1.2;
  const phase = ((t % cycle) / cycle) * Math.PI*2;
  return {
    torsoLean: Math.sin(phase)*1.4,
    headTilt: Math.sin(phase)*1.2,
    bounceY: -Math.abs(Math.sin(phase))*12,
    leftShoulderAngle: 2.6+Math.sin(phase)*0.6, leftElbowBend: 0.1,
    rightShoulderAngle: -2.6-Math.sin(phase)*0.6, rightElbowBend: -0.1,
    leftHipAngle: Math.sin(phase)*1.3, leftKneeBend: 0.2,
    rightHipAngle: -Math.sin(phase)*1.3, rightKneeBend: 0.2,
    mouthOpen: 0
  };
}
function posePaint(t){
  const w = t*3;
  return {
    torsoLean: 0.08, headTilt: 0.1*Math.sin(w*0.5), bounceY: 0,
    leftShoulderAngle: 0.4, leftElbowBend: -0.6,
    rightShoulderAngle: 0.7+0.5*Math.sin(w), rightElbowBend: -0.3+0.3*Math.sin(w*1.3),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseWrite(t){
  const w = t*5;
  return {
    torsoLean: 0.3, headTilt: 0.4, bounceY: 0,
    leftShoulderAngle: 0.6, leftElbowBend: -1.1,
    rightShoulderAngle: 0.9, rightElbowBend: -1.0+0.15*Math.sin(w),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseFish(t){
  const w = t*1.4;
  const tug = Math.sin(w*4) > 0.85 ? 1 : 0;
  return {
    torsoLean: 0.1+tug*0.15, headTilt: 0.05*Math.sin(w), bounceY: 0,
    leftShoulderAngle: 0.9, leftElbowBend: -0.4,
    rightShoulderAngle: 1.2-tug*0.4, rightElbowBend: -0.7,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}

function poseGuitar(t){
  const strum = t*8;
  return {
    torsoLean: 0.08, headTilt: 0.15, bounceY: Math.sin(t*2)*1,
    leftShoulderAngle: 0.5, leftElbowBend: -0.3,
    rightShoulderAngle: 0.9+0.3*Math.sin(strum), rightElbowBend: -0.7+0.2*Math.sin(strum),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseUmbrella(t){
  return {
    torsoLean: 0.03*Math.sin(t*1.2), headTilt: 0.05, bounceY: Math.abs(Math.sin(t*2))*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.2), leftElbowBend: 0.15,
    rightShoulderAngle: 2.4, rightElbowBend: -0.2,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
function poseSkateboard(t){
  const w = t*6;
  return {
    torsoLean: 0.15+0.05*Math.sin(w), headTilt: 0.05*Math.sin(w), bounceY: Math.sin(w)*1.5,
    leftShoulderAngle: -1.4, leftElbowBend: 0.2,
    rightShoulderAngle: 1.4, rightElbowBend: -0.2,
    leftHipAngle: -0.4, leftKneeBend: 0.7,
    rightHipAngle: 0.3, rightKneeBend: 0.5,
    mouthOpen: 0
  };
}
function poseLaptop(t){
  const w = t*10;
  return {
    torsoLean: 0.1, headTilt: 0.2, bounceY: 0,
    leftShoulderAngle: 0.7, leftElbowBend: -0.9,
    rightShoulderAngle: 0.7, rightElbowBend: -0.9+0.1*Math.sin(w),
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}
// Shared "seated, hands forward on a wheel/handlebar" pose for the drive/ride clips. Deliberately
// reuses poseSit's exact hip/knee angles and bounceY (-22) rather than inventing new ones — those
// numbers are already tuned so the feet land right at GROUND_Y (proven by the existing chair-seated
// clips), which the vehicle art below depends on to place the footwell/wheels correctly. Only the arms
// change, reaching forward onto a wheel/handlebar instead of resting at the sides.
function poseRide(t){
  const w = t*3;
  return {
    torsoLean: 0.03*Math.sin(w*0.5), headTilt: 0.03*Math.sin(w*0.7),
    bounceY: -22 + Math.sin(w)*1.1,
    leftShoulderAngle: 0.85, leftElbowBend: -0.75,
    rightShoulderAngle: 0.85, rightElbowBend: -0.75,
    leftHipAngle: 1.3, leftKneeBend: -1.3, rightHipAngle: 1.3, rightKneeBend: -1.3,
    mouthOpen: 0
  };
}
function poseCamera(t){
  return {
    torsoLean: 0.05, headTilt: 0, bounceY: Math.sin(t*2)*0.5,
    leftShoulderAngle: 1.6, leftElbowBend: -1.5,
    rightShoulderAngle: 1.6, rightElbowBend: -1.5,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: 0
  };
}

const CLIPS = {
  idle: { label:'Idle', pose:(t)=>poseIdle(t) },
  talk: { label:'Talk', pose:(t,opts)=>poseTalk(t, !!(opts&&opts.speaking)) },
  walk: { label:'Walk', pose:(t)=>poseWalk(t) },
  wave: { label:'Wave', pose:(t)=>poseWave(t) },
  dance:{ label:'Dance', pose:(t,opts)=>poseDance(t, opts&&opts.phase) },
  kite: { label:'Fly Kite', pose:(t)=>poseKite(t) },
  sit:  { label:'Sit (chair)', pose:(t)=>poseSit(t) },
  drink:{ label:'Drink Coffee', pose:(t)=>poseDrinkCoffee(t) },
  phone:{ label:'Talk on Phone', pose:(t)=>posePhoneCall(t) },
  jump: { label:'Jump', pose:(t)=>poseJump(t) },
  eat:  { label:'Eat', pose:(t)=>poseEat(t) },
  run:  { label:'Run', pose:(t)=>poseRun(t) },
  fight:{ label:'Fight', pose:(t,opts)=>poseFight(t, opts&&opts.phase) },
  argue:{ label:'Argue', pose:(t,opts)=>poseArgue(t, opts&&opts.phase) },
  hug:  { label:'Hug', pose:(t)=>poseHug(t) },
  highfive: { label:'High Five', pose:(t)=>poseHighFive(t) },
  kick: { label:'Kick', pose:(t)=>poseKick(t) },
  throw:{ label:'Throw', pose:(t)=>poseThrow(t) },
  swim: { label:'Swim', pose:(t)=>poseSwim(t) },
  sleep:{ label:'Sleep', pose:(t)=>poseSleep(t) },
  read: { label:'Read', pose:(t)=>poseRead(t) },
  clap: { label:'Clap', pose:(t)=>poseClap(t) },
  bow:  { label:'Bow', pose:(t)=>poseBow(t) },
  yoga: { label:'Yoga', pose:(t)=>poseYoga(t) },
  cry:  { label:'Cry', pose:(t)=>poseCry(t) },
  point:{ label:'Point', pose:(t)=>posePoint(t) },
  salute:{ label:'Salute', pose:(t)=>poseSalute(t) },
  shrug:{ label:'Shrug', pose:(t)=>poseShrug(t) },
  stretch:{ label:'Stretch', pose:(t)=>poseStretch(t) },
  fall: { label:'Fall Down', pose:(t)=>poseFallDown(t) },
  pushup: { label:'Push-up', pose:(t)=>posePushup(t) },
  cheer: { label:'Cheer', pose:(t)=>poseCheer(t) },
  drum: { label:'Play Drums', pose:(t)=>poseDrum(t) },
  cartwheel: { label:'Cartwheel', pose:(t)=>poseCartwheel(t) },
  paint: { label:'Paint', pose:(t)=>posePaint(t) },
  write: { label:'Write', pose:(t)=>poseWrite(t) },
  fish: { label:'Fish', pose:(t)=>poseFish(t) },
  shake: { label:'Shake Hands', pose:(t)=>poseShake(t) },
  guitar: { label:'Play Guitar', pose:(t)=>poseGuitar(t) },
  umbrella: { label:'Hold Umbrella', pose:(t)=>poseUmbrella(t) },
  skateboard: { label:'Skateboard', pose:(t)=>poseSkateboard(t) },
  laptop: { label:'Type on Laptop', pose:(t)=>poseLaptop(t) },
  camera: { label:'Take Photo', pose:(t)=>poseCamera(t) },
  drivecar: { label:'Drive a Car', pose:(t)=>poseRide(t) },
  drivesportscar: { label:'Drive a Sports Car', pose:(t)=>poseRide(t) },
  drivelimo: { label:'Drive a Limo', pose:(t)=>poseRide(t) },
  ridebike: { label:'Ride a Bicycle', pose:(t)=>poseRide(t) },
  ridemotorcycle: { label:'Ride a Motorcycle', pose:(t)=>poseRide(t) }
};
const CLIP_LIST = [
  {id:'idle', label:'Idle'}, {id:'talk', label:'Talk'}, {id:'walk', label:'Walk'},
  {id:'wave', label:'Wave'}, {id:'dance', label:'Dance'}, {id:'kite', label:'Fly Kite'},
  {id:'sit', label:'Sit (chair)'}, {id:'drink', label:'Drink Coffee'}, {id:'phone', label:'Talk on Phone'},
  {id:'jump', label:'Jump'}, {id:'eat', label:'Eat'}, {id:'run', label:'Run'},
  {id:'fight', label:'Fight'}, {id:'argue', label:'Argue'}, {id:'hug', label:'Hug'}, {id:'highfive', label:'High Five'},
  {id:'kick', label:'Kick'}, {id:'throw', label:'Throw'}, {id:'swim', label:'Swim'}, {id:'sleep', label:'Sleep'},
  {id:'read', label:'Read'}, {id:'clap', label:'Clap'}, {id:'bow', label:'Bow'},
  {id:'yoga', label:'Yoga'}, {id:'cry', label:'Cry'}, {id:'point', label:'Point'}, {id:'salute', label:'Salute'},
  {id:'shrug', label:'Shrug'}, {id:'stretch', label:'Stretch'}, {id:'fall', label:'Fall Down'},
  {id:'pushup', label:'Push-up'}, {id:'cheer', label:'Cheer'}, {id:'drum', label:'Play Drums'},
  {id:'cartwheel', label:'Cartwheel'}, {id:'paint', label:'Paint'}, {id:'write', label:'Write'}, {id:'fish', label:'Fish'},
  {id:'shake', label:'Shake Hands'},
  {id:'guitar', label:'Play Guitar'}, {id:'umbrella', label:'Hold Umbrella'}, {id:'skateboard', label:'Skateboard'},
  {id:'laptop', label:'Type on Laptop'}, {id:'camera', label:'Take Photo'},
  {id:'drivecar', label:'Drive a Car'}, {id:'drivesportscar', label:'Drive a Sports Car'}, {id:'drivelimo', label:'Drive a Limo'},
  {id:'ridebike', label:'Ride a Bicycle'}, {id:'ridemotorcycle', label:'Ride a Motorcycle'}
];
const SEATED_CLIPS = { sit:true, drink:true, phone:false, eat:true, read:true, write:true, laptop:true };
// Interactive clips read best when BOTH characters perform them together (like 'dance' already does) —
// resolveIndexedTimeline/parsePromptToScene special-case this instead of defaulting partner to idle.
const INTERACTIVE_CLIPS = { fight:true, argue:true, hug:true, highfive:true, dance:true, shake:true };
