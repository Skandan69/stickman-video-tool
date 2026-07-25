// ---------- animals registry: decorative scene creatures (not full stickman characters) ----------
// Animals are simpler than stickmen: no skeleton/IK, just a handful of procedural canvas shapes
// with a small idle animation (bob/hop + tail wag/ear twitch/wing flap), positioned along the
// stage like furniture/props. To add a new animal: add one entry here with a draw(x,faceDir,t,
// sizeScale) function — it automatically appears in the "Add an animal" dropdown via ANIMAL_LIST.
const ANIMALS = {
  dog: {
    label: 'Dog',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.5*s;
      const bx = x, by = gy - 22*s - bob;
      const swing = Math.sin(t*5)*4*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-14,swing],[6,-swing],[-6,-swing],[14,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+10*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const wag = Math.sin(t*8)*10*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*24*s, by);
      ctx.quadraticCurveTo(bx-faceDir*34*s, by-14*s+wag, bx-faceDir*30*s, by-22*s);
      ctx.stroke();
      ctx.fillStyle = '#c98a4b';
      ctx.beginPath(); ctx.ellipse(bx, by, 24*s, 13*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*22*s, hy = by-8*s;
      ctx.beginPath(); ctx.arc(hx, hy, 11*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hx+faceDir*9*s, hy+3*s, 6*s, 4*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx-faceDir*4*s, hy-8*s);
      ctx.quadraticCurveTo(hx-faceDir*14*s, hy-2*s, hx-faceDir*10*s, hy+10*s);
      ctx.quadraticCurveTo(hx-faceDir*4*s, hy+4*s, hx-faceDir*2*s, hy-6*s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-2*s, 1.5*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  cat: {
    label: 'Cat',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*3)*1.2*s;
      const bx = x, by = gy - 20*s - bob;
      const swing = Math.sin(t*5)*3*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [[-12,swing],[5,-swing],[-5,-swing],[12,swing]].forEach(([ox,sw])=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s+sw*0.3, gy); ctx.stroke();
      });
      const sway = Math.sin(t*2)*6*s;
      ctx.beginPath();
      ctx.moveTo(bx-faceDir*20*s, by);
      ctx.quadraticCurveTo(bx-faceDir*30*s, by-20*s, bx-faceDir*20*s+sway, by-34*s);
      ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.beginPath(); ctx.ellipse(bx, by, 20*s, 11*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*18*s, hy = by-9*s;
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx-faceDir*6*s, hy-7*s); ctx.lineTo(hx-faceDir*9*s, hy-15*s); ctx.lineTo(hx-faceDir*2*s, hy-9*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hx+faceDir*2*s, hy-9*s); ctx.lineTo(hx+faceDir*5*s, hy-16*s); ctx.lineTo(hx+faceDir*7*s, hy-7*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*3*s, hy-1*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bird: {
    label: 'Bird',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const hop = Math.abs(Math.sin(t*4))*4*s;
      const bx = x, by = gy - 14*s - hop;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.moveTo(bx-3*s, by+8*s); ctx.lineTo(bx-3*s, gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx+3*s, by+8*s); ctx.lineTo(bx+3*s, gy); ctx.stroke();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.ellipse(bx, by, 12*s, 9*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const flap = Math.sin(t*8)*2*s;
      ctx.beginPath(); ctx.ellipse(bx-faceDir*2*s, by+flap, 7*s, 4*s, 0.3*faceDir, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*11*s, hy = by-6*s;
      ctx.beginPath(); ctx.arc(hx, hy, 6*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(hx+faceDir*5*s, hy); ctx.lineTo(hx+faceDir*11*s, hy+1*s); ctx.lineTo(hx+faceDir*5*s, hy+3*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*2*s, hy-2*s, 1.2*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  rabbit: {
    label: 'Rabbit',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const hop = Math.abs(Math.sin(t*4))*6*s;
      const bx = x, by = gy - 20*s - hop;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      [-10,8].forEach(ox=>{
        ctx.beginPath(); ctx.moveTo(bx+ox*s, by+9*s); ctx.lineTo(bx+ox*s, gy-hop*0.3); ctx.stroke();
      });
      ctx.fillStyle = '#f3f4f6';
      ctx.beginPath(); ctx.arc(bx-faceDir*18*s, by, 4*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath(); ctx.ellipse(bx, by, 18*s, 12*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const hx = bx+faceDir*16*s, hy = by-10*s;
      ctx.beginPath(); ctx.arc(hx, hy, 9*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      const twitch = Math.sin(t*3)*0.15;
      [-1,1].forEach(dir=>{
        ctx.save();
        ctx.translate(hx+dir*3*s, hy-8*s);
        ctx.rotate(dir*0.15+twitch*dir);
        ctx.beginPath(); ctx.ellipse(0,-10*s,3*s,10*s,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(hx+faceDir*4*s, hy-1*s, 1.3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
};
const ANIMAL_LIST = Object.keys(ANIMALS).map(id => ({ id, label: ANIMALS[id].label }));
function drawAnimalProp(x, faceDir, type, t, sizeScale){
  const entry = ANIMALS[type] || ANIMALS.dog;
  entry.draw(x, faceDir, t, sizeScale);
}
