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
  },
  airplane: {
    label: 'Airplane',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 12*s;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(x-44*s, by); ctx.quadraticCurveTo(x, by-14*s, x+50*s, by-2*s);
      ctx.lineTo(x+44*s, by+4*s); ctx.quadraticCurveTo(x, by+8*s, x-44*s, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath(); ctx.moveTo(x-10*s, by-4*s); ctx.lineTo(x-30*s, by-24*s); ctx.lineTo(x-14*s, by-24*s); ctx.lineTo(x+4*s, by-4*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath(); ctx.moveTo(x+30*s, by-2*s); ctx.lineTo(x+48*s, by-16*s); ctx.lineTo(x+52*s, by-16*s); ctx.lineTo(x+44*s, by); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      [-30,-16,-2,12].forEach(ox=>{
        ctx.beginPath(); ctx.arc(x+ox*s, by-3*s, 3*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });
      ctx.restore();
    }
  },
  boat: {
    label: 'Boat',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*2)*3*s;
      const by = gy - 6*s - bob;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath();
      ctx.moveTo(x-40*s, by); ctx.lineTo(x-30*s, by+16*s); ctx.lineTo(x+30*s, by+16*s); ctx.lineTo(x+40*s, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-48*s, by+3*s); ctx.quadraticCurveTo(x, by+10*s, x+48*s, by+3*s); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x, by-40*s); ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.moveTo(x, by-38*s); ctx.lineTo(x+26*s, by-14*s); ctx.lineTo(x, by-14*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  helicopter: {
    label: 'Helicopter',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 60*s + Math.sin(t*2)*4*s;
      const spin = t*20;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath(); ctx.ellipse(x, by, 22*s, 13*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-faceDir*22*s, by+2*s); ctx.lineTo(x-faceDir*40*s, by-2*s); ctx.lineTo(x-faceDir*40*s, by+4*s); ctx.lineTo(x-faceDir*22*s, by+7*s); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, by-12*s); ctx.lineTo(x, by-18*s); ctx.stroke();
      ctx.save(); ctx.translate(x, by-18*s); ctx.rotate(spin);
      ctx.strokeStyle = 'rgba(20,20,20,0.6)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-42*s,0); ctx.lineTo(42*s,0); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x-8*s, by+12*s); ctx.lineTo(x-8*s, by+20*s); ctx.moveTo(x+8*s, by+12*s); ctx.lineTo(x+8*s, by+20*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-14*s, by+20*s); ctx.lineTo(x+14*s, by+20*s); ctx.stroke();
      ctx.restore();
    }
  },
  scooter: {
    label: 'Scooter',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const wheelR = 7*s, spin = t*8;
      const wy = gy, backX = x-14*s, frontX = x+14*s;
      ctx.save();
      ctx.lineWidth = 2.5; ctx.strokeStyle = INK;
      [backX, frontX].forEach(wx=>{
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.stroke();
        for(let i=0;i<4;i++){
          const ang = spin + i*Math.PI/2;
          ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke();
        }
      });
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(backX-6*s, wy-wheelR); ctx.lineTo(frontX+4*s, wy-wheelR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(frontX, wy-wheelR); ctx.lineTo(frontX, wy-wheelR-22*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(frontX-7*s, wy-wheelR-22*s); ctx.lineTo(frontX+7*s, wy-wheelR-22*s); ctx.stroke();
      ctx.restore();
    }
  },
  tractor: {
    label: 'Tractor',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const spin = t*3;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#16a34a';
      ctx.beginPath(); ctx.rect(x-26*s, gy-32*s, 34*s, 20*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath(); ctx.rect(x-20*s, gy-52*s, 20*s, 22*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.beginPath(); ctx.rect(x-16*s, gy-48*s, 12*s, 12*s); ctx.fill(); ctx.stroke();
      const bigR = 15*s, smallR = 8*s;
      ctx.fillStyle = '#222'; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.arc(x+2*s, gy, bigR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      for(let i=0;i<5;i++){ const ang = spin+i*Math.PI*2/5; ctx.beginPath(); ctx.moveTo(x+2*s,gy); ctx.lineTo(x+2*s+Math.cos(ang)*bigR*0.7, gy+Math.sin(ang)*bigR*0.7); ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x-20*s, gy, smallR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  ambulance: {
    label: 'Ambulance',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const by = gy - 16*s, wheelR = 10*s, spin = t*4;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.rect(x-44*s, by-24*s, 88*s, 40*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#bfe3ff';
      ctx.beginPath(); ctx.rect(x+18*s, by-18*s, 20*s, 14*s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x-16*s, by-14*s, 24*s, 6*s); ctx.fillRect(x-8*s, by-22*s, 8*s, 22*s);
      const flash = Math.sin(t*20) > 0;
      ctx.fillStyle = flash ? '#f87171' : '#93c5fd';
      ctx.beginPath(); ctx.rect(x-6*s, by-32*s, 12*s, 6*s); ctx.fill(); ctx.stroke();
      [-24,26].forEach(ox=>{
        const wx = x+ox*s, wy = gy;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(wx, wy, wheelR, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        for(let i=0;i<4;i++){ const ang = spin+i*Math.PI/2; ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+Math.cos(ang)*wheelR*0.7, wy+Math.sin(ang)*wheelR*0.7); ctx.stroke(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 3;
      });
      ctx.restore();
    }
  },
  submarine: {
    label: 'Submarine',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*1.5)*4*s;
      const by = gy - 30*s + bob;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.ellipse(x, by, 50*s, 16*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(x-8*s, by-26*s, 16*s, 14*s); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#a16207'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, by-26*s); ctx.lineTo(x, by-34*s); ctx.stroke();
      ctx.fillStyle = '#0f2e3f';
      [-24,-6,12,30].forEach(ox=>{ ctx.beginPath(); ctx.arc(x+ox*s, by, 4.5*s, 0, Math.PI*2); ctx.fill(); ctx.stroke(); });
      ctx.restore();
    }
  },
  hotairballoon: {
    label: 'Hot Air Balloon',
    draw: (x, faceDir, t, sizeScale)=>{
      const s = sizeScale || 1, INK = '#111', gy = GROUND_Y;
      const bob = Math.sin(t*1.2)*5*s;
      const by = gy - 90*s + bob;
      ctx.save();
      ctx.lineWidth = 3; ctx.strokeStyle = INK;
      ctx.fillStyle = '#e0453f';
      ctx.beginPath(); ctx.ellipse(x, by, 34*s, 42*s, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.moveTo(x-34*s,by); ctx.quadraticCurveTo(x,by+18*s,x+34*s,by); ctx.lineTo(x+34*s,by+2*s); ctx.quadraticCurveTo(x,by+20*s,x-34*s,by+2*s); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x-14*s, by+38*s); ctx.lineTo(x-10*s, by+56*s); ctx.moveTo(x+14*s, by+38*s); ctx.lineTo(x+10*s, by+56*s); ctx.stroke();
      ctx.fillStyle = '#a16207';
      ctx.beginPath(); ctx.rect(x-10*s, by+56*s, 20*s, 14*s); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
};
const VEHICLE_LIST = Object.keys(VEHICLES).map(id => ({ id, label: VEHICLES[id].label }));
function drawVehicleProp(x, faceDir, type, t, sizeScale){
  const entry = VEHICLES[type] || VEHICLES.car;
  entry.draw(x, faceDir, t, sizeScale);
}

// ---------- rideable car variants: purpose-built for a character actually SITTING in them (unlike
// VEHICLES.car above, which is a small decorative background prop). Open-top/convertible silhouette
// so the seated character's torso+head are naturally visible above the door line with no window cutout
// needed, sized against poseRide's known geometry (js/poses.js: reuses poseSit's leg angles, so feet
// land at roughly x + 37*faceDir, right at GROUND_Y) — the footwell and both wheels are deliberately
// positioned clear of that point so feet never overlap a wheel the way the old tiny car did.
const RIDE_CAR_VARIANTS = {
  sedan: { body:'#e0453f', trim:'#7a1f1c', backSpan:58, frontSpan:98, doorTop:46, hoodTop:30, trunkTop:34, wheelR:19, spoiler:false, windows:0 },
  sports:{ body:'#f59e0b', trim:'#7a4a08', backSpan:44, frontSpan:82, doorTop:36, hoodTop:22, trunkTop:26, wheelR:20, spoiler:true,  windows:0 },
  limo:  { body:'#1f2430', trim:'#000000', backSpan:72, frontSpan:170, doorTop:46, hoodTop:30, trunkTop:34, wheelR:19, spoiler:false, windows:4 }
};
function drawRideCarProp(x, faceDir, t, sizeScale, variant){
  const v = RIDE_CAR_VARIANTS[variant] || RIDE_CAR_VARIANTS.sedan;
  const s = sizeScale || 1, INK = '#111', gy = GROUND_Y, fd = faceDir || 1;
  const backX = x - v.backSpan*s*fd, frontX = x + v.frontSpan*s*fd;
  const floorY = gy - 4*s, doorY = gy - v.doorTop*s, hoodY = gy - v.hoodTop*s, trunkY = gy - v.trunkTop*s;
  const spin = t*4;
  ctx.save();
  ctx.lineWidth = 3; ctx.strokeStyle = INK;
  // body: open-top convertible profile (no roof/windshield to draw around) — back bumper up over the
  // trunk, along the door top (this is the "seat back" height the character's hip sits just above),
  // down the sloped hood, and along the floor back to the start.
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.moveTo(backX, floorY);
  ctx.lineTo(backX, trunkY);
  ctx.quadraticCurveTo(backX + 10*s*fd, doorY, backX + 26*s*fd, doorY);
  ctx.lineTo(frontX - 30*s*fd, doorY);
  ctx.quadraticCurveTo(frontX - 6*s*fd, doorY, frontX - 2*s*fd, hoodY);
  ctx.quadraticCurveTo(frontX + 6*s*fd, hoodY + 4*s, frontX, floorY);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // low dashboard hint just ahead of the seat, roughly where the character's forward-reaching hands
  // land (poseRide's arms reach forward-and-down from the shoulder) — purely decorative detail.
  ctx.strokeStyle = v.trim; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x + 20*s*fd, doorY + 4*s); ctx.lineTo(x + 32*s*fd, doorY - 10*s); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  if(v.spoiler){
    ctx.beginPath(); ctx.moveTo(backX, trunkY); ctx.lineTo(backX, trunkY - 14*s); ctx.lineTo(backX + 16*s*fd, trunkY - 14*s); ctx.stroke();
  }
  if(v.windows > 0){
    ctx.fillStyle = '#93c5fd';
    const span = (frontX - 30*s*fd - (backX + 26*s*fd));
    for(let i=0;i<v.windows;i++){
      const wx = backX + 26*s*fd + fd*(Math.abs(span)/(v.windows+1))*(i+1) - 6*s*fd;
      ctx.fillRect(wx, doorY - 16*s, 10*s, 10*s);
      ctx.strokeRect(wx, doorY - 16*s, 10*s, 10*s);
    }
  }
  // headlight/taillight accents
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(frontX - 4*s*fd, floorY - 6*s, 3*s, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f87171';
  ctx.beginPath(); ctx.arc(backX + 2*s*fd, floorY - 6*s, 3*s, 0, Math.PI*2); ctx.fill();
  // wheels: rear sits behind the seat, front sits well beyond where the seated character's feet land
  // (~37px*s forward of x), so neither wheel ever visually overlaps a foot.
  const wheelXs = variant === 'limo' ? [x - 40*s*fd, x + 20*s*fd, frontX - 30*s*fd] : [x - 32*s*fd, frontX - 26*s*fd];
  wheelXs.forEach(wx=>{
    ctx.fillStyle = '#222'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(wx, gy, v.wheelR*s, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
    for(let i=0;i<4;i++){
      const ang = spin + i*Math.PI/2;
      ctx.beginPath(); ctx.moveTo(wx, gy); ctx.lineTo(wx+Math.cos(ang)*v.wheelR*s*0.65, gy+Math.sin(ang)*v.wheelR*s*0.65); ctx.stroke();
    }
    ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(wx, gy, v.wheelR*s*0.25, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}
