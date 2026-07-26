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

// "jeep" isn't its own action in api/generate-engine-scene.js's schema — it's a pure visual skin on
// top of whichever ride-type action the AI picked (see engine/scene.js's JEEP_ELIGIBLE_ACTIONS), so
// it's detected locally from the raw text rather than asking the AI to track a separate field for it.
function detectJeepOverride(text){
  return /\b(jeep|4x4|off.?road)\b/i.test(text) ? 'jeep' : null;
}

// Local, offline fallback used ONLY if the AI call fails (not configured / rate-limited / network
// error) — deliberately simple keyword matching, not a substitute for the AI path, just enough to keep
// the page useful when the AI is unavailable rather than showing a dead end.
function localFallbackGraph(text){
  const lower = text.toLowerCase();
  const wantsHug = /\bhug/.test(lower);
  let background = 'mountain';
  const bgMatch = BACKGROUND_LIST.find(b => b.id !== 'custom' && (lower.includes(b.id) || lower.includes(b.label.toLowerCase())));
  if(bgMatch) background = bgMatch.id;
  const movesLikeVehicle = /\b(jeep|bike|bicycle|cycle|motorcycle|car|drive|ride|4x4)\b/.test(lower);
  const action1 = /\bwalk/.test(lower) ? 'walk' : /\brun/.test(lower) ? 'run' : /\bdanc/.test(lower) ? 'dance' :
    /\bwave/.test(lower) ? 'wave' : (wantsHug || movesLikeVehicle) ? 'ridebike' : 'idle';
  const graph = { background: background, weather: 'none', characterCount: wantsHug ? 2 : 1,
    character1: { name:'Alex', action: action1, gender:'male' }, vehicleOverride: detectJeepOverride(text) };
  if(wantsHug){ graph.character2 = { name:'Sam', action:'idle', gender:'female' }; graph.interaction = 'hugFromBehind'; }
  return graph;
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
    generateBtn.addEventListener('click', async ()=>{
      const text = promptInput.value.trim();
      if(!text){ if(statusEl) statusEl.textContent = 'Type a description first.'; return; }
      generateBtn.disabled = true;
      const prevLabel = generateBtn.textContent;
      generateBtn.textContent = 'Generating…';
      if(statusEl) statusEl.textContent = 'Asking AI to plan the scene…';
      try {
        const res = await fetch('/api/generate-engine-scene', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: text })
        });
        const data = await res.json().catch(()=> null);
        if(!res.ok || !data || !data.character1){
          currentEngineScene = localFallbackGraph(text);
          if(statusEl) statusEl.textContent = ((data && data.error) || 'AI generation failed') + ' — showing a simple keyword-matched scene instead.';
        } else {
          data.vehicleOverride = detectJeepOverride(text);
          currentEngineScene = data;
          if(statusEl){
            const desc = data.characterCount === 2
              ? (data.character1.action + ' + ' + data.character2.action + (data.interaction === 'hugFromBehind' ? ' (hugging from behind)' : ''))
              : data.character1.action;
            statusEl.textContent = '✨ AI built: ' + desc + ', background=' + data.background + (data.vehicleOverride ? ', vehicle skin=jeep' : '') + '.';
          }
        }
      } catch(e){
        currentEngineScene = localFallbackGraph(text);
        if(statusEl) statusEl.textContent = 'Network error — showing a simple keyword-matched scene instead.';
      } finally {
        engineElapsed = 0;
        generateBtn.disabled = false;
        generateBtn.textContent = prevLabel;
      }
    });
  }
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', engineInit);
} else {
  engineInit();
}
