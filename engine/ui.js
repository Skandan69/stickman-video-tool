// ---------- Scene Engine (Beta): minimal standalone player ----------
// Intentionally small — this page exists to prove the two-pass IK composition works end to end, not to
// duplicate the full editor (timeline, presets, character library, export) from the main tool. That
// editor stays exactly as-is at the main page; this is a separate, additive proof of concept.
let engineElapsed = 0, engineLastNow = 0, enginePlaying = true;

function engineLoop(now){
  const dt = (now - engineLastNow) / 1000;
  engineLastNow = now;
  if(enginePlaying) engineElapsed += dt;
  const frame = resolveEngineFrame(EngineScene.demo, engineElapsed);
  renderEngineFrame(frame);
  requestAnimationFrame(engineLoop);
}

function engineInit(){
  engineLastNow = performance.now();
  requestAnimationFrame(engineLoop);

  const playBtn = document.getElementById('enginePlayPauseBtn');
  const restartBtn = document.getElementById('engineRestartBtn');
  if(playBtn){
    playBtn.addEventListener('click', ()=>{
      enginePlaying = !enginePlaying;
      playBtn.textContent = enginePlaying ? 'Pause' : 'Play';
    });
  }
  if(restartBtn){
    restartBtn.addEventListener('click', ()=>{ engineElapsed = 0; });
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', engineInit);
} else {
  engineInit();
}
