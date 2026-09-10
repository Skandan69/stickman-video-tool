// A bounded sparring game sharing the studio renderer, with single-shot attack phases.
const DUEL_WEAPONS={
  '':{label:'Fists',clipId:'punch',duration:.64,impactT:.28,cooldown:.22,damage:8,range:135},
  sword:{label:'Sword',clipId:'slash',duration:.72,impactT:.32,cooldown:.32,damage:14,range:175},
  katana:{label:'Katana',clipId:'slash',duration:.65,impactT:.30,cooldown:.3,damage:13,range:170},
  pistol:{label:'Pistol',clipId:'shoot',duration:.4,impactT:.10,cooldown:.55,damage:10,range:420},
  ak47:{label:'AK47',clipId:'shoot',duration:.4,impactT:.10,cooldown:.5,damage:12,range:450}
};
const DUEL_KICK={label:'Kick',clipId:'kick',duration:.82,impactT:.36,cooldown:.35,damage:12,range:155};
function makeDuelFighter(i,x,faceDir){return{appearance:makeCharacter({...DEFAULT_CHARACTER_PALETTE[i],accessory:'none'}),x,faceDir,hp:100,weapon:'',state:'idle',stateT:0,idleT:0,cooldown:0,impactApplied:false,moving:0,blocking:false,attack:null};}
const duel={active:false,phase:'setup',fighters:[],keysDown:{},mode:'computer',effects:[],time:0,aiNext:0,stageOriginalParent:null,stageOriginalNextSibling:null,focus:null};
function resetDuelFighters(){const weapons=duel.fighters.map(f=>f.weapon);duel.fighters=[makeDuelFighter(0,260,1),makeDuelFighter(1,540,-1)];duel.fighters.forEach((f,i)=>{f.weapon=weapons[i]||'';f.appearance.accessory=f.weapon||'none';});duel.effects=[];duel.keysDown={};duel.time=0;duel.aiNext=.6;}
resetDuelFighters();
function duelOpponent(i){return duel.fighters[1-i];}
function duelTryAttack(i,kick=false){const f=duel.fighters[i];if(!duel.active||duel.phase!=='fighting'||f.cooldown>0||['attack','hitstun'].includes(f.state))return;f.attack=kick?DUEL_KICK:DUEL_WEAPONS[f.weapon];f.state='attack';f.stateT=0;f.impactApplied=false;f.blocking=false;}
function buildDuelFrame(){return{characters:duel.fighters.map((f,i)=>{
  let pose,clipId='guard';f.faceDir=duelOpponent(i).x>=f.x?1:-1;
  if(f.hp<=0){pose=poseFall(.9);clipId='fall';}
  else if(f.state==='attack'){clipId=f.attack.clipId;pose=['punch','kick'].includes(clipId)?poseCombat(f.stateT,clipId,false):CLIPS[clipId].pose(f.stateT,{});}
  else if(f.state==='hitstun'){pose=poseGuard(f.idleT);const k=Math.max(0,1-f.stateT/.3);pose.torsoLean=-.35*k;pose.headTilt=-.25*k;pose.bounceY-=8*k;}
  else if(f.blocking){pose=poseBlock(f.idleT);clipId='block';}
  else if(f.moving){pose=poseWalk(f.idleT);const guard=poseGuard(f.idleT);for(const key of ['leftShoulderAngle','rightShoulderAngle','leftElbowBend','rightElbowBend'])pose[key]=guard[key];clipId='walk';}
  else pose=poseGuard(f.idleT);
  return{id:f.appearance.id,x:f.x,faceDir:f.faceDir,appearance:f.appearance,pose,clipId};
}),animals:[],vehicles:[],customElements:[],dialogue:null,background:'stadium',weather:'none',furniture:'chair',food:'sandwich',style:state.scene.style,localT:duel.time,totalDuration:1,povDriver:null};}
function drawDuelHud(){ctx.save();ctx.font='bold 15px sans-serif';duel.fighters.forEach((f,i)=>{const x=i?516:24;ctx.fillStyle='#243049';ctx.fillRect(x,20,260,18);ctx.fillStyle=f.hp>35?'#22c55e':'#f97316';ctx.fillRect(x,20,260*f.hp/100,18);ctx.fillStyle='#172036';ctx.fillText((i===1&&duel.mode==='computer'?'Computer':'Player '+(i+1))+' · '+Math.ceil(f.hp),x,57);});for(const e of duel.effects){const k=1-e.age/.22;ctx.globalAlpha=Math.max(0,k);ctx.strokeStyle=e.block?'#38bdf8':'#fbbf24';ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,8+(1-k)*25,0,Math.PI*2);ctx.stroke();}ctx.restore();}
function tickDuel(dt){dt=Math.min(.05,Math.max(0,dt));duel.time+=dt;duel.effects=duel.effects.filter(e=>(e.age+=dt)<.22);
  if(duel.phase==='fighting'){
    if(duel.mode==='computer'){
      const ai=duel.fighters[1],player=duel.fighters[0],distance=Math.abs(ai.x-player.x);duel.keysDown.arrowleft=distance>125&&ai.x>player.x;duel.keysDown.arrowright=distance>125&&ai.x<player.x;duel.keysDown.arrowdown=player.state==='attack'&&Math.sin(duel.time*3)>.1;
      if(duel.time>duel.aiNext){if(distance<165)duelTryAttack(1,Math.sin(duel.time)>0);duel.aiNext=duel.time+.6+(.5+.5*Math.sin(duel.time*7))*.6;}
    }
    duel.fighters.forEach((f,i)=>{
      if(duel.phase!=='fighting')return;f.idleT+=dt;f.cooldown=Math.max(0,f.cooldown-dt);f.stateT+=dt;f.moving=0;f.faceDir=duelOpponent(i).x>=f.x?1:-1;
      f.blocking=f.state==='idle'&&!!duel.keysDown[i?'arrowdown':'s'];
      if(f.state==='attack'){
        const a=f.attack;if(!f.impactApplied&&f.stateT>=a.impactT){f.impactApplied=true;const opponent=duelOpponent(i);if(Math.abs(opponent.x-f.x)<=a.range){const blocked=opponent.blocking;opponent.hp=Math.max(0,opponent.hp-a.damage*(blocked?.18:1));if(!blocked){opponent.state='hitstun';opponent.stateT=0;}opponent.x=clamp(opponent.x+f.faceDir*(blocked?3:12),60,740);duel.effects.push({x:opponent.x,y:GROUND_Y-150,age:0,block:blocked});if(opponent.hp<=0){duel.phase='ended';document.getElementById('duelResult').style.display='';document.getElementById('duelWinnerText').textContent=(i===1&&duel.mode==='computer'?'Computer':'Player '+(i+1))+' wins';}}}
        if(f.stateT>=a.duration){f.state='idle';f.stateT=0;f.cooldown=a.cooldown;}
      }else if(f.state==='hitstun'){if(f.stateT>.3){f.state='idle';f.stateT=0;}}
      else {f.moving=(duel.keysDown[i?'arrowright':'d']?1:0)-(duel.keysDown[i?'arrowleft':'a']?1:0);f.x=clamp(f.x+f.moving*(f.blocking?60:170)*dt,60,740);}
    });
    const [a,b]=duel.fighters;if(b.x-a.x<90){const mid=clamp((a.x+b.x)/2,105,695);a.x=mid-45;b.x=mid+45;}
  }
  renderFrame(buildDuelFrame());drawDuelHud();
}
function openDuelOverlay(){if(duel.active||exportInProgress)return;if(designer.active)cancelPoseDesigner();duel.focus=document.activeElement;duel.active=true;duel.phase='setup';resetDuelFighters();duel.stageOriginalParent=canvas.parentNode;duel.stageOriginalNextSibling=canvas.nextSibling;document.getElementById('duelPreviewMount').prepend(canvas);document.getElementById('duelOverlay').style.display='flex';document.getElementById('duelSetup').style.display='';document.getElementById('duelResult').style.display='none';duel.fighters.forEach((f,i)=>document.getElementById('duelP'+(i+1)+'Weapon').value=f.weapon);tickDuel(0);document.getElementById('duelStartBtn').focus();}
function closeDuelOverlay(){if(!duel.active)return;duel.active=false;duel.keysDown={};duel.stageOriginalParent.insertBefore(canvas,duel.stageOriginalNextSibling);document.getElementById('duelOverlay').style.display='none';forceRedraw();duel.focus?.focus();}
function startDuel(){resetDuelFighters();duel.mode=document.getElementById('duelMode').value;duel.fighters.forEach((f,i)=>{f.weapon=document.getElementById('duelP'+(i+1)+'Weapon').value;f.appearance.accessory=f.weapon||'none';});duel.phase='fighting';document.getElementById('duelSetup').style.display='none';document.getElementById('duelResult').style.display='none';document.getElementById('duelP2Touch').hidden=duel.mode==='computer';document.getElementById('duelCloseBtn').focus();}
for(const id of ['startDuelBtn','navDuelLink'])document.getElementById(id).onclick=e=>{e.preventDefault();openDuelOverlay();};
document.getElementById('duelCloseBtn').onclick=closeDuelOverlay;
document.getElementById('duelStartBtn').onclick=startDuel;document.getElementById('duelRematchBtn').onclick=startDuel;
document.getElementById('duelToCreateBtn').onclick=()=>{closeDuelOverlay();document.getElementById('startSceneDesignBtn').click();};
document.addEventListener('keydown',e=>{if(!duel.active)return;if(e.key==='Escape'){closeDuelOverlay();return;}if(e.target.matches('input,select,textarea'))return;const k=e.key.toLowerCase();if(['a','d','s','f','g','arrowleft','arrowright','arrowdown','l','k'].includes(k)){e.preventDefault();if(duel.mode==='computer'&&['arrowleft','arrowright','arrowdown','l','k'].includes(k))return;duel.keysDown[k]=true;if(!e.repeat){if(k==='f'||k==='g')duelTryAttack(0,k==='g');if(k==='l'||k==='k')duelTryAttack(1,k==='k');}}});
document.addEventListener('keyup',e=>{delete duel.keysDown[e.key.toLowerCase()];});
window.addEventListener('blur',()=>duel.keysDown={});
for(const b of document.querySelectorAll('[data-duel-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);duel.keysDown[b.dataset.duelKey]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>delete duel.keysDown[b.dataset.duelKey]);}
for(const b of document.querySelectorAll('[data-duel-attack]'))b.onclick=()=>duelTryAttack(Number(b.dataset.duelAttack));
for(const b of document.querySelectorAll('[data-duel-kick]'))b.onclick=()=>duelTryAttack(Number(b.dataset.duelKick),true);
