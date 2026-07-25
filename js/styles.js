// ---------- art styles registry: alternate visual renderers for the same skeleton/pose ----------
// Every style calls the shared computeSkeleton(x,faceDir,appearance,pose) from js/render.js, so
// poses/actions/IK are identical no matter which style is selected — only the pixels differ. To add
// a new style: add one entry with a drawStickman(x,faceDir,appearance,pose) function that returns
// { leftHand, rightHand, head } (used to attach hand-held props like coffee cups/food); it
// automatically appears in the Art Style dropdown via STYLE_LIST.
const STYLES = {
  bold: {
    label: 'Bold Cartoon',
    // This is the original/default style — its full implementation lives in js/render.js
    // (drawStickman) since that's also what drawFace/drawHair/accessories etc. are tuned for.
    drawStickman: (x, faceDir, appearance, pose)=> drawStickman(x, faceDir, appearance, pose)
  },
  neon: {
    label: 'Neon Glow',
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const glow = sk.outfit;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = glow; ctx.shadowBlur = 14;
      ctx.strokeStyle = glow; ctx.lineWidth = 4; ctx.fillStyle = glow;
      [[sk.hip,sk.lKnee,sk.lFoot],[sk.hip,sk.rKnee,sk.rFoot]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      ctx.beginPath(); ctx.moveTo(sk.hip.x,sk.hip.y); ctx.lineTo(sk.shoulder.x,sk.shoulder.y); ctx.stroke();
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      // silhouette head: glowing ring only, no fill/face — matches the reference's dark-figure look
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R*0.85, 0, Math.PI*2); ctx.stroke();
      [sk.lHand, sk.rHand, sk.lFoot, sk.rFoot].forEach(p=>{
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ddd'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  clipart: {
    label: 'Flat Clipart',
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      const limbW = LW * 2.2; // thicker capsule-style limbs for a flat-vector look, not thin stick lines
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = limbW;
      [[sk.hip,sk.lKnee,sk.lFoot],[sk.hip,sk.rKnee,sk.rFoot]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lFoot, sk.rFoot].forEach(p=>{
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(p.x+faceDir*3, p.y, 8, 4, 0, 0, Math.PI*2); ctx.fill();
      });
      ctx.strokeStyle = sk.outfit; ctx.lineWidth = limbW*1.3;
      ctx.beginPath(); ctx.moveTo(sk.hip.x,sk.hip.y); ctx.lineTo(sk.shoulder.x,sk.shoulder.y); ctx.stroke();
      ctx.lineWidth = limbW;
      [[sk.shoulder,sk.lElbow,sk.lHand],[sk.shoulder,sk.rElbow,sk.rHand]].forEach(seg=>{
        ctx.beginPath(); ctx.moveTo(seg[0].x,seg[0].y); ctx.lineTo(seg[1].x,seg[1].y); ctx.lineTo(seg[2].x,seg[2].y); ctx.stroke();
      });
      [sk.lHand, sk.rHand].forEach(p=>{
        ctx.fillStyle = sk.skin; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
      });
      // businessman tie accent (GraphicMama-style clipart reference, purely decorative default look)
      // — skipped for female appearances, and layered UNDER the necktie/bowtie accessory if selected.
      if(sk.gender !== 'female' && sk.accessory !== 'necktie' && sk.accessory !== 'bowtie'){
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(sk.shoulder.x, sk.shoulder.y+2);
        ctx.lineTo(sk.shoulder.x-4, sk.shoulder.y+10);
        ctx.lineTo(sk.shoulder.x, sk.shoulder.y+26);
        ctx.lineTo(sk.shoulder.x+4, sk.shoulder.y+10);
        ctx.closePath(); ctx.fill();
      }
      // Body-worn accessories, shared with the bold style's drawStickman (js/render.js) so every
      // accessory works identically no matter which art style is selected.
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      ctx.fillStyle = sk.skin; ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      drawHair(sk.head, faceDir, sk.hairStyle, sk.hairColor);
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);
      drawFace(sk.head, faceDir, sk.eyeStyle, sk.emotion, pose.mouthOpen);
      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);
      ctx.fillStyle = '#333'; ctx.font = '13px Arial, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  },
  sketchy: {
    label: 'Hand-Drawn Sketch',
    drawStickman: (x, faceDir, appearance, pose)=>{
      const sk = computeSkeleton(x, faceDir, appearance, pose);
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.8;
      // deterministic pseudo-random jitter (seeded by position, not by frame time) so the wobble
      // reads as a consistent hand-drawn line rather than flickering noise between frames
      function jitter(seed){ const v = Math.sin(seed*12.9898)*43758.5453; return (v - Math.floor(v) - 0.5)*3; }
      function sketchLine(p1, p2, seed){
        for(let pass=0; pass<2; pass++){
          const jx1 = jitter(seed+pass*7.1), jy1 = jitter(seed+pass*3.3+1);
          const jx2 = jitter(seed+pass*5.7+2), jy2 = jitter(seed+pass*9.1+3);
          ctx.beginPath(); ctx.moveTo(p1.x+jx1, p1.y+jy1); ctx.lineTo(p2.x+jx2, p2.y+jy2); ctx.stroke();
        }
      }
      let seed = x*0.13;
      sketchLine(sk.hip, sk.lKnee, seed++); sketchLine(sk.lKnee, sk.lFoot, seed++);
      sketchLine(sk.hip, sk.rKnee, seed++); sketchLine(sk.rKnee, sk.rFoot, seed++);
      sketchLine(sk.hip, sk.shoulder, seed++);
      sketchLine(sk.shoulder, sk.lElbow, seed++); sketchLine(sk.lElbow, sk.lHand, seed++);
      sketchLine(sk.shoulder, sk.rElbow, seed++); sketchLine(sk.rElbow, sk.rHand, seed++);
      ctx.beginPath();
      const steps = 20;
      for(let i=0;i<=steps;i++){
        const ang = (i/steps)*Math.PI*2;
        const jr = 1.2*Math.sin(ang*3+seed);
        const px = sk.head.x + Math.cos(ang)*(HEAD_R+jr);
        const py = sk.head.y + Math.sin(ang)*(HEAD_R+jr);
        if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.stroke();
      // Fill the head with skin tone (a sketch is still a person, not just an outline) before the
      // shared drawHair/drawFace/accessory functions add hair, face, and accessories on top — this
      // gives full parity with the bold style for every customization option (skin/hair/eyes/accessory).
      ctx.fillStyle = sk.skin; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(sk.head.x, sk.head.y, HEAD_R-1, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // Body-worn accessories, shared with the bold style's drawStickman (js/render.js).
      if(sk.accessory === 'bag'){
        const bagAnchor = faceDir > 0 ? sk.lHand : sk.rHand;
        ctx.strokeStyle = '#5a3d24'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(sk.shoulder.x - faceDir*4, sk.shoulder.y); ctx.lineTo(bagAnchor.x, bagAnchor.y-6); ctx.stroke();
        ctx.fillStyle = sk.outfit; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(bagAnchor.x-7, bagAnchor.y-6, 14, 12); ctx.fill(); ctx.stroke();
      }
      if(sk.accessory === 'backpack') drawBackpack(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'scarf') drawScarf(sk.neck, sk.outfit);
      if(sk.accessory === 'cape') drawCape(sk.shoulder, sk.hip, faceDir, sk.outfit);
      if(sk.accessory === 'necktie') drawNecktie(sk.neck, sk.outfit);
      if(sk.accessory === 'bowtie') drawBowtie(sk.neck, sk.outfit);
      if(sk.accessory === 'wristwatch') drawWristwatch(sk.rHand);
      drawHair(sk.head, faceDir, sk.hairStyle, sk.hairColor);
      if(sk.accessory === 'hat') drawHat(sk.head, sk.hairColor);
      if(sk.accessory === 'chefhat') drawChefHat(sk.head);
      if(sk.accessory === 'police') drawPoliceCap(sk.head);
      if(sk.accessory === 'headband') drawHeadband(sk.head, sk.outfit);
      if(sk.accessory === 'crown') drawCrown(sk.head);
      if(sk.accessory === 'wizardhat') drawWizardHat(sk.head);
      if(sk.accessory === 'helmet') drawHelmet(sk.head);
      drawFace(sk.head, faceDir, sk.eyeStyle, sk.emotion, pose.mouthOpen);
      if(sk.accessory === 'glasses') drawGlasses(sk.head);
      if(sk.accessory === 'doctor') drawStethoscope(sk.neck);
      if(sk.accessory === 'mask') drawMask(sk.head);
      if(sk.accessory === 'earrings') drawEarrings(sk.head);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.8;
      [sk.lHand, sk.rHand].forEach(p=>{ ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.stroke(); });
      ctx.fillStyle = '#555'; ctx.font = 'italic 12px "Comic Sans MS", cursive'; ctx.textAlign = 'center';
      ctx.fillText(sk.name, sk.hip.x, GROUND_Y + 18);
      ctx.restore();
      return { leftHand: sk.lHand, rightHand: sk.rHand, head: sk.head };
    }
  }
};
const STYLE_LIST = Object.keys(STYLES).map(id => ({ id, label: STYLES[id].label }));
