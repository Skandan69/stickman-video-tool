// ---------- Scene Engine (Beta): minimal standalone player ----------
// Intentionally small — this page exists to prove the two-pass IK composition works end to end, not to
// duplicate the full editor (timeline, presets, character library, export) from the main tool. That
// editor stays exactly as-is at the main page; this is a separate, additive proof of concept.
let engineElapsed = 0, engineLastNow = 0, enginePlaying = true;
let currentEngineScene = EngineScene.demo;

function engineLoop(now){
  const dt = (now - engineLastNow) / 1000;
  engineLastNow = now;
  if(enginePlaying) engineElapsed += dt;
  const frame = resolveEngineFrame(currentEngineScene, engineElapsed);
  renderEngineFrame(frame);
  requestAnimationFrame(engineLoop);
}

// Deliberately simple keyword matching, NOT the full AI-composed decomposition planned for later
// (see conversation: an AI that breaks a description into primitives it already knows, the same way
// api/generate-scene.js already does for the main tool's fixed pose menu). This exists so free-text
// input can be tried right now against the two things the engine currently understands — which
// vehicle, and which background — instead of shipping the prompt box with nothing behind it yet.
function interpretEnginePrompt(text){
  const lower = text.toLowerCase();
  const vehicleType = /\b(jeep|4x4|off.?road|truck)\b/.test(lower) ? 'jeep' : 'bicycle';

  let background = 'mountain';
  const bgMatch = BACKGROUND_LIST.find(b => b.id !== 'custom' && (lower.includes(b.id) || lower.includes(b.label.toLowerCase())));
  if(bgMatch) background = bgMatch.id;

  return Object.assign({}, EngineScene.demo, { vehicleType: vehicleType, background: background });
}

function engineInit(){
  engineLastNow = performance.now();
  requestAnimationFrame(engineLoop);

  const playBtn = document.getElementById('enginePlayPauseBtn');
  const restartBtn = document.getElementById('engineRestartBtn');
  const generateBtn = document.getElementById('engineGenerateBtn');
  const promptInput = document.getElementById('enginePromptInput');
  const statusEl = document.getElementById('engineStatus');

  if(playBtn){
    playBtn.addEventListener('click', ()=>{
      enginePlaying = !enginePlaying;
      playBtn.textContent = enginePlaying ? 'Pause' : 'Play';
    });
  }
  if(restartBtn){
    restartBtn.addEventListener('click', ()=>{ engineElapsed = 0; });
  }
  if(generateBtn && promptInput){
    generateBtn.addEventListener('click', ()=>{
      const text = promptInput.value.trim();
      if(!text){ if(statusEl) statusEl.textContent = 'Type a description first.'; return; }
      currentEngineScene = interpretEnginePrompt(text);
      engineElapsed = 0;
      if(statusEl){
        statusEl.textContent = 'Matched: vehicle = ' + currentEngineScene.vehicleType + ', background = ' + currentEngineScene.background +
          '. (Beta: this is simple keyword matching, not AI-composed yet — only vehicle + background react to your text right now, the hug interaction itself is still fixed.)';
      }
    });
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', engineInit);
} else {
  engineInit();
}
