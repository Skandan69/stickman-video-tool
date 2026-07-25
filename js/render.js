// ---------- canvas setup (shared by every draw* function below and by ui.js for export) ----------
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const GROUND_Y = 380;

// ---------- background ----------
// Actual scenery lives in the BACKGROUNDS registry (js/backgrounds.js) — this just clears the
// canvas, delegates to the selected entry's draw(), then draws the shared ground line on top.
function drawBackground(bg){
  ctx.clearRect(0,0,W,H);
  const entry = BACKGROUNDS[bg] || BACKGROUNDS.white;
  entry.draw();
  ctx.strokeStyle = '#9aa1ad'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(W,GROUND_Y); ctx.stroke();
}

// ---------- face: eyebrows + eyes + mouth, driven by eyeStyle (shape) and emotion (expression) ----------
// Emotion shapes/angles come from the EMOTIONS registry (js/emotions.js) — this function just draws
// whatever that registry says, so adding a new emotion never requires touching this code.
function drawFace(head, faceDir, eyeStyle, emotion, mouthOpen){
  const em = EMOTIONS[emotion] || EMOTIONS.neutral;
  // S scales all the feature offsets/sizes below, which were originally tuned for the old, smaller
  // head radius — keeping them proportionate to today's bigger "bold cartoon" head (see humanTypes.js).
  const S = 1.2;
  const ex = head.x + faceDir*7*S, ey = head.y - 3*S;
  const wide = em.eyeScale || 1;
  const INK = '#111';

  // eyebrow: angle communicates the emotion even though the eye shape stays the same
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ex - faceDir*5*S, ey + em.browLeftY*S);
  ctx.lineTo(ex + faceDir*5*S, ey + em.browRightY*S);
  ctx.stroke();

  // eye (shape controlled by eyeStyle, size bumped up for wide-eyed emotions like surprise)
  ctx.fillStyle = INK;
  if(eyeStyle === 'round'){
    ctx.beginPath(); ctx.arc(ex, ey, 3.5*wide*S, 0, Math.PI*2); ctx.fill();
  } else if(eyeStyle === 'happy'){
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey, 3.5*wide*S, Math.PI, 0); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(ex, ey, 2.4*wide*S, 0, Math.PI*2); ctx.fill();
  }

  // mouth: talking (mouthOpen) always wins so dialogue still reads clearly; otherwise the emotion's shape applies
  const mx = head.x + faceDir*6*S, my = head.y + 8*S;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.5;
  if(mouthOpen > 0.5){
    ctx.beginPath(); ctx.ellipse(mx, my, 4*S, 3.5*S, 0, 0, Math.PI*2); ctx.fill();
  } else if(em.mouth === 'o'){
    ctx.beginPath(); ctx.arc(mx, my, 3*S, 0, Math.PI*2); ctx.fill();
  } else if(em.mouth === 'smile'){
    ctx.beginPath(); ctx.arc(mx - faceDir*2*S, my-2*S, 6*S, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
  } else if(em.mouth === 'frown'){
    ctx.beginPath(); ctx.arc(mx - faceDir*2*S, my+5*S, 6*S, 1.15*Math.PI, 1.85*Math.PI); ctx.stroke();
  } else if(em.mouth === 'grimace'){
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(head.x+faceDir*2*S, head.y+9*S); ctx.lineTo(head.x+faceDir*10*S, head.y+7*S); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(head.x+faceDir*2*S, head.y+8*S); ctx.lineTo(head.x+faceDir*10*S, head.y+8*S); ctx.stroke();
  }
  ctx.lineWidth = LW;
}

// ---------- skeleton math: shared by every art style so poses/IK stay identical no matter how the
// figure is rendered. Also resolves appearance defaults (outfit/skin/hair/etc) in one place so each
// style's draw function can just read sk.* instead of repeating the same fallback logic.
function computeSkeleton(x, faceDir, appearance, pose){
  const outfit = appearance.outfit || appearance.color || '#1d4ed8';
  const gender = appearance.gender || 'male';
  const name = appearance.name || '';
  const skin = appearance.skin || '#ffe0bd';
  const hairStyle = appearance.hairStyle || (gender === 'female' ? 'long' : 'short');
  const hairColor = appearance.hairColor || '#2b1b12';
  const eyeStyle = appearance.eyeStyle || 'dot';
  const emotion = appearance.emotion || 'neutral';
  const accessory = appearance.accessory || 'none';
  const bodyPreset = applyBodyScale(appearance.bodyType, appearance.sizeScale, appearance.build); // sets HEAD_R/TORSO_LEN/etc for THIS character
  const stoop = bodyPreset.stoop || 0;
  const effTorsoLean = pose.torsoLean + stoop;
  const effHeadTilt = pose.headTilt + stoop*0.5;

  const hip = { x: x, y: GROUND_Y - HIP_HEIGHT - pose.bounceY };
  const shoulder = upPoint(hip, effTorsoLean, TORSO_LEN, faceDir);
  const neck = upPoint(shoulder, effHeadTilt, NECK_LEN, faceDir);
  const head = upPoint(neck, effHeadTilt, HEAD_R*0.9, faceDir);

  const lKnee = downPoint(hip, pose.leftHipAngle, UPPER_LEG, faceDir);
  const lFoot = downPoint(lKnee, pose.leftHipAngle+pose.leftKneeBend, LOWER_LEG, faceDir);
  const rKnee = downPoint(hip, pose.rightHipAngle, UPPER_LEG, faceDir);
  const rFoot = downPoint(rKnee, pose.rightHipAngle+pose.rightKneeBend, LOWER_LEG, faceDir);

  const lElbow = downPoint(shoulder, pose.leftShoulderAngle, UPPER_ARM, faceDir);
  const lHand = downPoint(lElbow, pose.leftShoulderAngle+pose.leftElbowBend, FORE_ARM, faceDir);
  const rElbow = downPoint(shoulder, pose.rightShoulderAngle, UPPER_ARM, faceDir);
  const rHand = downPoint(rElbow, pose.rightShoulderAngle+pose.rightElbowBend, FORE_ARM, faceDir);

  return { outfit, gender, name, skin, hairStyle, hairColor, eyeStyle, emotion, accessory, bodyPreset,
    hip, shoulder, neck, head, lKnee, lFoot, rKnee, rFoot, lElbow, lHand, rElbow, rHand };
}

// ---------- "Bold Cartoon" stickman renderer (the default/original style) ----------
function drawStickman(x, faceDir, appearance, pose){
  const sk = computeSkeleton(x, faceDir, appearance, pose);
  const outfit = sk.outfit, gender = sk.gender, name = sk.name, skin = sk.skin,
    hairStyle = sk.hairStyle, hairColor = sk.hairColor, eyeStyle = sk.eyeStyle,
    emotion = sk.emotion, accessory = sk.accessory, color = outfit;
  const hip = sk.hip, shoulder = sk.shoulder, neck = sk.neck, head = sk.head,
    lKnee = sk.lKnee, lFoot = sk.lFoot, rKnee = sk.rKnee, rFoot = sk.rFoot,
    lElbow = sk.lElbow, lHand = sk.lHand, rElbow = sk.rElbow, rHand = sk.rHand;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = LW;

  [[hip,lKnee,lFoot],[hip,rKnee,rFoot]].forEach(seg=>{
    ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
  });
  drawShoeBlob(lFoot, faceDir);
  drawShoeBlob(rFoot, faceDir);

  if(gender === 'female'){
    ctx.beginPath();
    ctx.moveTo(hip.x-15, hip.y+4);
    ctx.lineTo(hip.x+15, hip.y+4);
    ctx.lineTo(hip.x, hip.y+48);
    ctx.closePath();
    ctx.fillStyle = color + '33';
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath(); ctx.moveTo(hip.x,hip.y); ctx.lineTo(shoulder.x,shoulder.y); ctx.stroke();

  [[shoulder,lElbow,lHand],[shoulder,rElbow,rHand]].forEach(seg=>{
    ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
  });
  drawHandBlob(lHand, skin);
  drawHandBlob(rHand, skin);

  if(accessory === 'bag'){
    const bagAnchor = faceDir > 0 ? lHand : rHand;
    ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(shoulder.x - faceDir*4, shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
    ctx.fillStyle = outfit; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
    ctx.lineWidth = LW;
  }

  // bold black head outline (like the reference "cartoon stickman" style) — outfit color stays on
  // the body/limbs for per-character identity, but the face itself always reads in high-contrast black
  ctx.beginPath(); ctx.arc(head.x, head.y, HEAD_R, 0, Math.PI*2);
  ctx.fillStyle = skin; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = LW*0.85; ctx.stroke();

  drawHair(head, faceDir, hairStyle, hairColor);
  if(accessory === 'hat') drawHat(head, hairColor);
  if(accessory === 'chefhat') drawChefHat(head);
  if(accessory === 'police') drawPoliceCap(head);
  if(accessory === 'headband') drawHeadband(head, outfit);
  ctx.strokeStyle = outfit; ctx.lineWidth = LW;

  drawFace(head, faceDir, eyeStyle, emotion, pose.mouthOpen);
  if(accessory === 'glasses') drawGlasses(head);
  if(accessory === 'doctor') drawStethoscope(neck);

  ctx.fillStyle = '#444';
  ctx.font = '13px "Comic Sans MS", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, hip.x, GROUND_Y + 18);

  return { leftHand: lHand, rightHand: rHand, head: head };
}

function drawSpeechBubble(anchor, text, faceDir){
  ctx.font = '15px "Comic Sans MS", cursive, sans-serif';
  const lines = wrapText(ctx, text, 150);
  const lineH = 18;
  const boxW = Math.min(180, Math.max(...lines.map(l=>ctx.measureText(l).width)) + 24);
  const boxH = lines.length*lineH + 18;
  const bx = anchor.x - boxW/2 + faceDir*20;
  const by = anchor.y - 55 - boxH;

  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx+10, by);
  ctx.lineTo(bx+boxW-10, by);
  ctx.quadraticCurveTo(bx+boxW, by, bx+boxW, by+10);
  ctx.lineTo(bx+boxW, by+boxH-10);
  ctx.quadraticCurveTo(bx+boxW, by+boxH, bx+boxW-10, by+boxH);
  ctx.lineTo(bx+boxW/2+8, by+boxH);
  ctx.lineTo(anchor.x, anchor.y-18);
  ctx.lineTo(bx+boxW/2-8, by+boxH);
  ctx.lineTo(bx+10, by+boxH);
  ctx.quadraticCurveTo(bx, by+boxH, bx, by+boxH-10);
  ctx.lineTo(bx, by+10);
  ctx.quadraticCurveTo(bx, by, bx+10, by);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#222'; ctx.textAlign = 'center';
  lines.forEach((l,i)=> ctx.fillText(l, bx+boxW/2, by+22+i*lineH));
}

function drawKiteProp(hand, t, anchor){
  const kx = anchor.x + 50*Math.sin(2*Math.PI*t/5) + 15*Math.sin(2*Math.PI*t/1.7);
  const ky = anchor.y + 25*Math.cos(2*Math.PI*t/4);
  const ctrl = { x: (hand.x+kx)/2 + 20*Math.sin(t*1.3), y: (hand.y+ky)/2 + 30 };
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.quadraticCurveTo(ctrl.x, ctrl.y, kx, ky); ctx.stroke();
  for(let i=1;i<=4;i++){
    const dt = t - i*0.25;
    const tx = anchor.x + 50*Math.sin(2*Math.PI*dt/5) + 15*Math.sin(2*Math.PI*dt/1.7);
    const ty = anchor.y + 25*Math.cos(2*Math.PI*dt/4) + i*14;
    ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#22c55e';
    ctx.beginPath(); ctx.moveTo(tx-5,ty); ctx.lineTo(tx+5,ty); ctx.lineTo(tx,ty+8); ctx.closePath(); ctx.fill();
  }
  ctx.save(); ctx.translate(kx,ky);
  ctx.strokeStyle = '#e11d48'; ctx.fillStyle = 'rgba(225,29,72,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0,-26); ctx.lineTo(20,0); ctx.lineTo(0,32); ctx.lineTo(-20,0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(0,32); ctx.moveTo(-20,0); ctx.lineTo(20,0); ctx.stroke();
  ctx.restore();
}

function drawHair(head, faceDir, hairStyle, hairColor){
  if(hairStyle === 'none') return;
  ctx.save();
  ctx.strokeStyle = hairColor; ctx.fillStyle = hairColor;
  if(hairStyle === 'short'){
    ctx.beginPath();
    for(let i=-2;i<=2;i++){
      ctx.moveTo(head.x+i*7, head.y-HEAD_R+3);
      ctx.lineTo(head.x+i*8, head.y-HEAD_R-6);
    }
    ctx.lineWidth = LW-2; ctx.stroke();
  } else if(hairStyle === 'mohawk'){
    ctx.beginPath();
    for(let i=-1;i<=1;i++){
      ctx.moveTo(head.x+i*4, head.y-HEAD_R+2);
      ctx.lineTo(head.x+i*3, head.y-HEAD_R-12);
    }
    ctx.lineWidth = LW-1; ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(head.x-HEAD_R+2, head.y-4);
    ctx.quadraticCurveTo(head.x-HEAD_R-6, head.y+18, head.x-HEAD_R+4, head.y+30);
    ctx.moveTo(head.x+HEAD_R-2, head.y-4);
    ctx.quadraticCurveTo(head.x+HEAD_R+6, head.y+18, head.x+HEAD_R-4, head.y+30);
    ctx.lineWidth = LW-1.5; ctx.stroke();
    if(hairStyle === 'ponytail'){
      ctx.beginPath();
      ctx.moveTo(head.x - faceDir*HEAD_R*0.6, head.y-6);
      ctx.quadraticCurveTo(head.x - faceDir*HEAD_R*1.7, head.y+8, head.x - faceDir*HEAD_R*1.3, head.y+30);
      ctx.lineWidth = LW-1; ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(head.x-2, head.y-HEAD_R-2);
    ctx.lineTo(head.x-10, head.y-HEAD_R-9);
    ctx.lineTo(head.x-10, head.y-HEAD_R+5);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(head.x+2, head.y-HEAD_R-2);
    ctx.lineTo(head.x+10, head.y-HEAD_R-9);
    ctx.lineTo(head.x+10, head.y-HEAD_R+5);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------- mitten hands + oval shoes (bold-cartoon look — replaces bare line-ends) ----------
function drawHandBlob(pos, skin){
  ctx.save();
  ctx.fillStyle = skin; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawShoeBlob(pos, faceDir){
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.ellipse(pos.x + faceDir*3, pos.y, 9, 4.5, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawGlasses(head){
  ctx.save();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2.3;
  ctx.beginPath(); ctx.arc(head.x-7.2, head.y-2.4, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(head.x+7.2, head.y-2.4, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(head.x-1.2, head.y-2.4); ctx.lineTo(head.x+1.2, head.y-2.4); ctx.stroke();
  ctx.restore();
}

function drawHat(head, color){
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+3, HEAD_R+5, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.rect(head.x-HEAD_R*0.55, head.y-HEAD_R-13, HEAD_R*1.1, 14); ctx.fill();
  ctx.restore();
}

// ---------- costume accessories (chef/police/athlete/doctor) — used by the COSTUMES registry (js/costumes.js) ----------
function drawChefHat(head){
  ctx.save();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+2, HEAD_R+3, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(head.x-HEAD_R*0.5, head.y-HEAD_R-24, HEAD_R, 24); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R-24, HEAD_R*0.5, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawPoliceCap(head){
  ctx.save();
  ctx.fillStyle = '#1e3a5f';
  ctx.beginPath(); ctx.ellipse(head.x, head.y-HEAD_R+2, HEAD_R+2, 6, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.rect(head.x-HEAD_R*0.6, head.y-HEAD_R-10, HEAD_R*1.2, 12); ctx.fill();
  ctx.fillStyle = '#facc15';
  ctx.beginPath(); ctx.arc(head.x, head.y-HEAD_R-4, 3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawHeadband(head, color){
  ctx.save();
  ctx.strokeStyle = color || '#dc2626'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(head.x, head.y-2, HEAD_R-1, Math.PI*1.1, Math.PI*1.9); ctx.stroke();
  ctx.restore();
}
function drawStethoscope(neck){
  ctx.save();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(neck.x, neck.y+4, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(neck.x-5, neck.y+8); ctx.lineTo(neck.x-5, neck.y+22); ctx.stroke();
  ctx.beginPath(); ctx.arc(neck.x-5, neck.y+24, 3, 0, Math.PI*2); ctx.stroke();
  ctx.restore();
}

function drawChairProp(x, groundY){
  const seatY = groundY - 20;
  ctx.strokeStyle = '#8b5e3c'; ctx.fillStyle = '#a97c50'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x-24, groundY); ctx.lineTo(x-24, seatY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+24, groundY); ctx.lineTo(x+24, seatY); ctx.stroke();
  ctx.fillRect(x-26, seatY-6, 52, 8);
  ctx.strokeRect(x-26, seatY-6, 52, 8);
  ctx.beginPath(); ctx.moveTo(x-24, seatY-6); ctx.lineTo(x-24, seatY-46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x-24, seatY-46); ctx.lineTo(x+24, seatY-46); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x+24, seatY-46); ctx.lineTo(x+24, seatY-6); ctx.stroke();
}

function drawSofaProp(x, groundY){
  const seatY = groundY - 22;
  ctx.strokeStyle = '#6b4a30'; ctx.fillStyle = '#8a6a4a'; ctx.lineWidth = 3;
  ctx.fillRect(x-55, seatY-8, 110, 30); ctx.strokeRect(x-55, seatY-8, 110, 30);
  ctx.fillRect(x-55, seatY-46, 110, 20); ctx.strokeRect(x-55, seatY-46, 110, 20);
  ctx.fillRect(x-62, seatY-40, 12, 46); ctx.strokeRect(x-62, seatY-40, 12, 46);
  ctx.fillRect(x+50, seatY-40, 12, 46); ctx.strokeRect(x+50, seatY-40, 12, 46);
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x-45, groundY-2); ctx.lineTo(x-45, groundY+8); ctx.moveTo(x+45, groundY-2); ctx.lineTo(x+45, groundY+8); ctx.stroke();
}

function drawCoffeeCupProp(hand){
  ctx.save();
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7c5a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.rect(hand.x-6, hand.y-4, 12, 10); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(hand.x+9, hand.y+1, 4, -Math.PI/2, Math.PI/2); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,150,150,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(hand.x-2, hand.y-6); ctx.quadraticCurveTo(hand.x-6, hand.y-14, hand.x-1, hand.y-20); ctx.stroke();
  ctx.restore();
}

function drawPhoneProp(hand){
  ctx.save();
  ctx.fillStyle = '#222';
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(hand.x-5, hand.y-9, 10, 18, 2); ctx.fill(); }
  else { ctx.fillRect(hand.x-5, hand.y-9, 10, 18); }
  ctx.restore();
}
