// ---------- animation clips: pure functions of (localT, opts) -> BonePose ----------
function poseIdle(t){
  return { torsoLean:0.02*Math.sin(t*1.2), headTilt:0.04*Math.sin(t*1.1), bounceY:Math.sin(t*2)*1.5,
    leftShoulderAngle:0.05*Math.sin(t*1.1), leftElbowBend:0.15, rightShoulderAngle:0.05*Math.sin(t*1.1+1), rightElbowBend:0.15,
    leftHipAngle:0, leftKneeBend:0, rightHipAngle:0, rightKneeBend:0, mouthOpen:0 };
}
function poseTalk(t, speaking){
  return {
    torsoLean: 0.03*Math.sin(t*1.1),
    headTilt: speaking ? 0.15*Math.sin(t*5) : 0.05*Math.sin(t*1.5),
    bounceY: Math.sin(t*2)*1.5,
    leftShoulderAngle: 0.1*Math.sin(t*1.3+1), leftElbowBend: 0.15,
    rightShoulderAngle: speaking ? 1.3+0.4*Math.sin(t*6) : 0.15*Math.sin(t*1.2),
    rightElbowBend: speaking ? -0.6+0.3*Math.sin(t*6+0.5) : 0.2,
    leftHipAngle: 0, leftKneeBend: 0, rightHipAngle: 0, rightKneeBend: 0,
    mouthOpen: speaking ? (Math.sin(t*10) > 0 ? 1 : 0.2) : 0
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
  const mouth = { x: head.x + 6, y: head.y + 8 }; // matches drawStickman's mouth position (head.x+faceDir*6, head.y+8)
  const reach = armReachAngles(mouth.x, mouth.y);
  const restShoulder = 0.4, restElbow = 0.6; // relaxed, cup resting near the lap
  base.rightShoulderAngle = restShoulder + (reach.shoulderAngle - restShoulder) * liftPhase;
  base.rightElbowBend = restElbow + (reach.elbowBend - restElbow) * liftPhase;
  base.mouthOpen = liftPhase > 0.6 ? 1 : 0;
  return base;
}
function posePhoneCall(t){
  const base = poseIdle(t);
  base.headTilt = base.headTilt + 0.15;
  const head = headPointsRelToShoulder(base.headTilt);
  const ear = { x: head.x + 11, y: head.y - 2 }; // side of the head, ear height
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
  jump: { label:'Jump', pose:(t)=>poseJump(t) }
};
const CLIP_LIST = [
  {id:'idle', label:'Idle'}, {id:'talk', label:'Talk'}, {id:'walk', label:'Walk'},
  {id:'wave', label:'Wave'}, {id:'dance', label:'Dance'}, {id:'kite', label:'Fly Kite'},
  {id:'sit', label:'Sit (chair)'}, {id:'drink', label:'Drink Coffee'}, {id:'phone', label:'Talk on Phone'},
  {id:'jump', label:'Jump'}
];
const SEATED_CLIPS = { sit:true, drink:true, phone:false };
