// ---------- backgrounds registry ----------
// Each entry's draw() renders onto the already-cleared canvas (ctx/W/H/GROUND_Y come from render.js's
// module-level setup). To add a new background: add one entry here — it automatically appears in the
// Background dropdown (via BACKGROUND_LIST, read by ui.js) and can be targeted by the prompt parser's
// detectBackground() in scene.js.
const BACKGROUNDS = {
  white: {
    label: 'Plain whiteboard',
    draw: ()=>{ ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,W,H); }
  },
  sky: {
    label: 'Sky / park',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(700,70,32,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      [[120,70,26],[160,80,20],[95,85,18],[400,50,22],[440,60,18]].forEach(c=>{
        ctx.beginPath(); ctx.arc(c[0],c[1],c[2],0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#cdeccb'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  grid: {
    label: 'Graph paper',
    draw: ()=>{
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = '#e5e9f2'; ctx.lineWidth = 1;
      for(let x=0;x<=W;x+=25){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for(let y=0;y<=H;y+=25){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    }
  },
  cafe: {
    label: 'Cafe (indoor)',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#f3e0c8'); g.addColorStop(1,'#f8ecd9');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#cfe8f0'; ctx.fillRect(60,50,150,110);
      ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 6; ctx.strokeRect(60,50,150,110);
      ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(135,50); ctx.lineTo(135,160); ctx.moveTo(60,105); ctx.lineTo(210,105); ctx.stroke();
      ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(650,0); ctx.lineTo(650,36); ctx.stroke();
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath(); ctx.moveTo(628,36); ctx.lineTo(672,36); ctx.lineTo(662,62); ctx.lineTo(638,62); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9a877'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  office: {
    label: 'Office',
    draw: ()=>{
      ctx.fillStyle = '#eef1f5'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#cfe3f2'; ctx.fillRect(600,40,150,100);
      ctx.strokeStyle = '#8a94a3'; ctx.lineWidth = 4; ctx.strokeRect(600,40,150,100);
      ctx.beginPath(); ctx.moveTo(675,40); ctx.lineTo(675,140); ctx.moveTo(600,90); ctx.lineTo(750,90); ctx.stroke();
      ctx.fillStyle = '#8b5e3c'; ctx.fillRect(80, GROUND_Y-50, 160, 12);
      ctx.strokeStyle = '#6b4a30'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(90, GROUND_Y-38); ctx.lineTo(90, GROUND_Y); ctx.moveTo(230, GROUND_Y-38); ctx.lineTo(230, GROUND_Y); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.fillRect(120, GROUND_Y-95, 60, 40);
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(125, GROUND_Y-90, 50, 30);
      ctx.fillStyle = '#333'; ctx.fillRect(145, GROUND_Y-55, 10, 6);
      ctx.fillStyle = '#e6e9ee'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  bedroom: {
    label: 'Bedroom',
    draw: ()=>{
      ctx.fillStyle = '#f6e9ee'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#c9a0ad'; ctx.fillRect(600, GROUND_Y-70, 170, 70);
      ctx.strokeStyle = '#8a5b68'; ctx.lineWidth = 3; ctx.strokeRect(600, GROUND_Y-70, 170, 70);
      ctx.fillStyle = '#fff'; ctx.fillRect(608, GROUND_Y-64, 40, 24);
      ctx.strokeRect(608, GROUND_Y-64, 40, 24);
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(60, GROUND_Y); ctx.lineTo(60, GROUND_Y-90); ctx.stroke();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.moveTo(35,GROUND_Y-90); ctx.lineTo(85,GROUND_Y-90); ctx.lineTo(75,GROUND_Y-120); ctx.lineTo(45,GROUND_Y-120); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8d3c5'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  street: {
    label: 'City street',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#c9d6e3'); g.addColorStop(1,'#e8eef4');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#9aa8bb';
      [[20,120,60,160],[100,90,70,190],[190,140,50,140],[560,100,70,180],[650,130,60,150],[720,80,60,200]].forEach(b=>{
        ctx.fillRect(b[0], b[1], b[2], b[3]);
      });
      ctx.fillStyle = '#b7bec9'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
      ctx.strokeStyle = '#9aa1ad'; ctx.lineWidth = 1.5;
      for(let x=20;x<W;x+=60){ ctx.beginPath(); ctx.moveTo(x,GROUND_Y); ctx.lineTo(x-10,H); ctx.stroke(); }
    }
  },
  beach: {
    label: 'Beach',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,GROUND_Y-40);
      g.addColorStop(0,'#bdeaff'); g.addColorStop(1,'#e7f8ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,GROUND_Y-40);
      ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(700,60,30,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4fb3d9'; ctx.fillRect(0,GROUND_Y-40,W,40);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,GROUND_Y-20); ctx.quadraticCurveTo(W/2,GROUND_Y-10,W,GROUND_Y-20); ctx.stroke();
      ctx.fillStyle = '#f2e2b6'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  forest: {
    label: 'Forest',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#cdeccb'); g.addColorStop(1,'#eafaf0');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      [[60,260],[150,240],[600,250],[700,270],[500,230]].forEach(([tx,ty])=>{
        ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(tx,GROUND_Y); ctx.lineTo(tx,ty); ctx.stroke();
        ctx.fillStyle = '#4a8f4f';
        ctx.beginPath(); ctx.arc(tx,ty-10,34,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#8fce6a'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  gym: {
    label: 'Gym',
    draw: ()=>{
      ctx.fillStyle = '#e9ecf1'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = '#c3c9d4'; ctx.lineWidth = 4;
      for(let x=100;x<720;x+=100){ ctx.beginPath(); ctx.moveTo(x,60); ctx.lineTo(x,GROUND_Y-20); ctx.stroke(); }
      ctx.fillStyle = '#333'; ctx.fillRect(560, GROUND_Y-50, 90, 12);
      [568,588,608,628].forEach(x=>{ ctx.beginPath(); ctx.arc(x,GROUND_Y-44,10,0,Math.PI*2); ctx.fill(); });
      const g = ctx.createLinearGradient(0,GROUND_Y,0,H);
      g.addColorStop(0,'#c98a4b'); g.addColorStop(1,'#a5713a');
      ctx.fillStyle = g; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  school: {
    label: 'Classroom',
    draw: ()=>{
      ctx.fillStyle = '#fdf6e9'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#2f5233'; ctx.fillRect(60,40,220,120);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 6; ctx.strokeRect(60,40,220,120);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(90,90); ctx.lineTo(180,90); ctx.moveTo(90,120); ctx.lineTo(220,120); ctx.stroke();
      ctx.fillStyle = '#cfe3f2'; ctx.fillRect(620,50,110,90);
      ctx.strokeStyle = '#8a94a3'; ctx.lineWidth = 3; ctx.strokeRect(620,50,110,90);
      ctx.fillStyle = '#e6d8bd'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  space: {
    label: 'Outer Space',
    draw: ()=>{
      ctx.fillStyle = '#0b1026'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff';
      for(let i=0;i<60;i++){
        const sx = (i*97) % W, sy = (i*53) % (GROUND_Y-10);
        ctx.beginPath(); ctx.arc(sx, sy, (i%3===0)?1.6:0.9, 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = '#f4a261';
      ctx.beginPath(); ctx.arc(650,90,36,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(650,90,54,14,-0.3,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#3a3f5a'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  restaurant: {
    label: 'Restaurant',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#3a2a2a'); g.addColorStop(1,'#5a3f3a');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#f2c879';
      [[150,90],[400,70],[620,100]].forEach(([lx,ly])=>{
        ctx.beginPath(); ctx.arc(lx,ly,20,0,Math.PI*2); ctx.fill();
      });
      ctx.fillStyle = '#6b4a30'; ctx.fillRect(60, GROUND_Y-30, 120, 8);
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(75, GROUND_Y-22); ctx.lineTo(75, GROUND_Y); ctx.moveTo(165, GROUND_Y-22); ctx.lineTo(165, GROUND_Y); ctx.stroke();
      ctx.fillStyle = '#4a3530'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  farm: {
    label: 'Farm',
    draw: ()=>{
      const g = ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#bfe3ff'); g.addColorStop(1,'#eaf7ff');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(580, GROUND_Y-110, 130, 90);
      ctx.beginPath(); ctx.moveTo(570,GROUND_Y-110); ctx.lineTo(645,GROUND_Y-160); ctx.lineTo(720,GROUND_Y-110); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(625, GROUND_Y-70, 30, 50);
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 3;
      for(let x=20;x<300;x+=40){ ctx.beginPath(); ctx.moveTo(x,GROUND_Y); ctx.lineTo(x,GROUND_Y-24); ctx.lineTo(x+40,GROUND_Y-24); ctx.stroke(); }
      ctx.fillStyle = '#e0a94c';
      ctx.beginPath(); ctx.ellipse(400,GROUND_Y-14,26,14,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c9a877'; ctx.fillRect(0,GROUND_Y,W,H-GROUND_Y);
    }
  },
  custom: {
    label: 'Custom photo…',
    draw: ()=>{
      if(state.scene.customBgImage){
        ctx.drawImage(state.scene.customBgImage, 0, 0, W, H);
      } else {
        ctx.fillStyle = '#f4f5f7'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = '#9aa1ad'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Upload a background image to see it here', W/2, H/2);
        ctx.textAlign = 'left';
      }
    }
  }
};
const BACKGROUND_LIST = Object.keys(BACKGROUNDS).map(id => ({ id, label: BACKGROUNDS[id].label }));
