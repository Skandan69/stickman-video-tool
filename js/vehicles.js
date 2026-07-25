// ---------- vehicles registry: static scene props (like furniture, but placeable as a list) ----------
// Simpler than animals: no legs/limbs, just a body + spinning wheels for a bit of life. To add a
// new vehicle: add one entry here with a draw(x,faceDir,t,sizeScale) function — it automatically
// appears in the "Add a vehicle" dropdown via VEHICLE_LIST.
const VEHICLES = {
  car: {
    label: 'Car',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bx = x, by = gy - 14*s;
      const wheelR = 9*s, spin = t*4;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#e0453f';
      ctx.beginPath();
      ctx.moveTo(bx-32*s, by+6*s);
      ctx.lineTo(bx-32*s, by-4*s);
      ctx.quadraticCurveTo(bx-20*s, by-20*s, bx-6*s, by-20*s);
      ctx.lineTo(bx+10*s, by-20*s);
      ctx.quadraticCurveTo(bx+20*s, by-20*s, bx+26*s, by-6*s);
      ctx.lineTo(bx+34*s, by-4*s);
      ctx.lineTo(bx+34*s, by+6*s);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.beginPath();
      ctx.moveTo(bx-16*s, by-18*s);
      ctx.lineTo(bx-8*s, by-6*s);
      ctx.lineTo(bx+22*s, by-6*s);
      ctx.lineTo(bx+16*s, by-18*s);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      [-18, 18].forEach(ox=>{
        const wx = bx+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(bx+faceDir*33*s, by, 3*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bicycle: {
    label: 'Bicycle',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const wheelR = 14*s, spin = t*6;
      const wy = gy, backX = x-16*s, frontX = x+16*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [backX, frontX].forEach(wx=>{
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.stroke();
        for(let i=0;i<6;i++){
          const ang = spin + i*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR, wy+Math.sin(ang)*wheelR); ctx.stroke();
        }
      });
      const seatX = x-4*s, seatY = wy-wheelR-10*s;
      const pedalX = x, pedalY = wy-wheelR*0.4;
      const handleX = x+12*s, handleY = wy-wheelR-6*s;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(backX, wy); ctx.lineTo(pedalX, pedalY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pedalX, pedalY); ctx.lineTo(seatX, seatY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(seatX, seatY); ctx.lineTo(backX, wy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pedalX, pedalY); ctx.lineTo(frontX, wy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pedalX, pedalY); ctx.lineTo(handleX, handleY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(handleX-6*s, handleY); ctx.lineTo(handleX+6*s, handleY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(handleX, handleY); ctx.lineTo(frontX, wy); ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.ellipse(seatX, seatY-2*s, 6*s, 3*s, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  bus: {
    label: 'Bus',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bx = x, by = gy - 16*s;
      const wheelR = 9*s, spin = t*3;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.rect(bx-46*s, by-30*s, 92*s, 40*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      for(let i=0;i<4;i++){
        ctx.fillRect(bx-38*s+i*22*s, by-24*s, 16*s, 14*s);
        ctx.strokeRect(bx-38*s+i*22*s, by-24*s, 16*s, 14*s);
      }
      [-28, 28].forEach(ox=>{
        const wx = bx+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  truck: {
    label: 'Truck',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 16*s, wheelR = 10*s, spin = t*3.5;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath(); ctx.rect(x-44*s, by-18*s, 60*s, 34*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(x+16*s, by-30*s); ctx.lineTo(x+40*s, by-30*s);
      ctx.lineTo(x+44*s, by-6*s); ctx.lineTo(x+16*s, by-6*s);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(x+20*s, by-26*s, 16*s, 12*s); ctx.strokeRect(x+20*s, by-26*s, 16*s, 12*s);
      [[-26,wheelR],[26,wheelR]].forEach(([ox])=>{
        const wx = x+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  motorcycle: {
    label: 'Motorcycle',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const wheelR = 12*s, spin = t*7;
      const wy = gy, backX = x-14*s, frontX = x+14*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [backX, frontX].forEach(wx=>{
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.stroke();
        for(let i=0;i<6;i++){
          const ang = spin + i*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR, wy+Math.sin(ang)*wheelR); ctx.stroke();
        }
      });
      const seatX = x-2*s, seatY = wy-wheelR-16*s;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(backX, wy-wheelR*0.6); ctx.lineTo(seatX-6*s, seatY+4*s); ctx.lineTo(seatX+14*s, seatY);
      ctx.lineTo(frontX, wy-wheelR*0.6); ctx.lineTo(seatX+2*s, wy-wheelR*0.3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      const handleX = x+14*s, handleY = wy-wheelR-14*s;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(handleX-6*s, handleY); ctx.lineTo(handleX+6*s, handleY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(handleX, handleY); ctx.lineTo(frontX, wy-wheelR*0.5); ctx.stroke();
      ctx.restore();
    }
  },
  train: {
    label: 'Train',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 20*s, wheelR = 9*s, spin = t*3;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.rect(x-56*s, by-24*s, 112*s, 40*s); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x-50*s, by-38*s, 26*s, 16*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      for(let i=0;i<5;i++){
        ctx.fillRect(x-34*s+i*20*s, by-16*s, 12*s, 12*s);
        ctx.strokeRect(x-34*s+i*20*s, by-16*s, 12*s, 12*s);
      }
      [-40,-14,14,40].forEach(ox=>{
        const wx = x+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  }
};
const VEHICLE_LIST = Object.keys(VEHICLES).map(id => ({ id, label: VEHICLES[id].label }));
function drawVehicleProp(x, faceDir, type, t, sizeScale){
  const entry = VEHICLES[type] || VEHICLES.car;
  entry.draw(x, faceDir, t, sizeScale);
}
