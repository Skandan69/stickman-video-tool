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
const ENGINE_NAME_POOL_UI = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Jordan', 'Avery', 'Quinn', 'Drew', 'Reese'];
const ENGINE_CHAR_KEYS_UI = ['character1', 'character2', 'character3', 'character4', 'character5', 'character6', 'character7', 'character8', 'character9', 'character10', 'character11', 'character12'];
const NUMBER_WORDS = { two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12 };
// Small-squad sports get an explicit headcount before falling through to generic number/word
// detection — "a cricket team" doesn't literally say "11", but should still seat a full XI rather
// than the generic 6-person "team" fallback below.
function detectGroupCount(lower){
  if(/\bcricket\b/.test(lower) && /\b(team|squad|eleven|xi)\b/.test(lower)) return 11;
  if(/\b(football|soccer)\b/.test(lower) && /\b(team|squad)\b/.test(lower)) return 11;
  if(/\btennis\b/.test(lower) && /\bdoubles\b/.test(lower)) return 4;
  const digitMatch = lower.match(/\b([2-9]|1[0-2])\s*(people|person|stickmen|stickman|characters|friends|guys|players)\b/);
  if(digitMatch) return parseInt(digitMatch[1], 10);
  const wordMatch = lower.match(/\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(people|person|stickmen|stickman|characters|friends|guys|players)?\b/);
  if(wordMatch && NUMBER_WORDS[wordMatch[1]]) return NUMBER_WORDS[wordMatch[1]];
  if(/\b(group|crowd|team|squad|everyone|several)\b/.test(lower)) return 6;
  return null;
}
function localFallbackGraph(text){
  const lower = text.toLowerCase();
  const wantsHug = /\bhug/.test(lower);
  let background = 'mountain';
  const bgMatch = BACKGROUND_LIST.find(b => b.id !== 'custom' && (lower.includes(b.id) || lower.includes(b.label.toLowerCase())));
  if(bgMatch) background = bgMatch.id;
  const movesLikeVehicle = /\b(jeep|bike|bicycle|cycle|motorcycle|car|drive|ride|4x4)\b/.test(lower);
  // "kite" is checked before the broader "fly" match so "flying a kite" doesn't get misread as piloting
  // an aircraft. No dedicated "play cricket/football/tennis" pose exists yet — approximate with the
  // closest existing action (kick/throw) rather than defaulting sports scenes to idle.
  const action1 = /\bkite\b/.test(lower) ? 'kite' :
    /\b(helicopter|chopper)\b/.test(lower) ? 'flyhelicopter' :
    /\b(plane|airplane|jet|aircraft)\b/.test(lower) || /\bfly/.test(lower) ? 'flyplane' :
    /\bswim/.test(lower) ? 'swim' : /\bwalk/.test(lower) ? 'walk' : /\brun/.test(lower) ? 'run' : /\bdanc/.test(lower) ? 'dance' :
    /\bwave/.test(lower) ? 'wave' : /\b(football|soccer)\b/.test(lower) ? 'kick' : /\b(cricket|tennis)\b/.test(lower) ? 'throw' :
    (wantsHug || movesLikeVehicle) ? 'ridebike' : 'idle';
  const groupCount = detectGroupCount(lower);
  // hugFromBehind only makes sense between exactly 2 — a detected group size wins over "hug" wanting 2.
  const characterCount = wantsHug && !groupCount ? 2 : (groupCount || 1);
  const graph = { background: background, weather: 'none', characterCount,
    character1: { name: ENGINE_NAME_POOL_UI[0], action: action1, gender:'male' }, vehicleOverride: detectJeepOverride(text) };
  for(let i=1;i<characterCount;i++){
    graph['character' + (i+1)] = { name: ENGINE_NAME_POOL_UI[i], action: action1, gender: i % 2 ? 'male' : 'female' };
  }
  if(characterCount === 2 && wantsHug){ graph.character2.action = 'idle'; graph.interaction = 'hugFromBehind'; }
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
            // action:'custom' means no named clip fit — the AI generated pose parameters instead
            // (engine/primitives.js's evalParametricPose), so label it as such rather than showing
            // the literal word "custom" with no context.
            const describeAction = a => a === 'custom' ? 'custom AI-generated pose' : a;
            const n = data.characterCount || 1;
            let desc;
            if(n === 1){ desc = describeAction(data.character1.action); }
            else if(n === 2){ desc = describeAction(data.character1.action) + ' + ' + describeAction(data.character2.action) + (data.interaction === 'hugFromBehind' ? ' (hugging from behind)' : ''); }
            else {
              const actions = ENGINE_CHAR_KEYS_UI.slice(0, n).map(k => data[k] && data[k].action).filter(Boolean).map(describeAction);
              desc = n + ' characters (' + actions.join(', ') + ')';
            }
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
