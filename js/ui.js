// ---------- main render loop ----------
let elapsed = 0, lastNow = performance.now();
// Cache of the most recently evaluated frame — used outside the render loop for canvas hit-testing
// (drag-to-reposition below) so we know exactly where each character was actually drawn this frame,
// rather than recomputing scene evaluation separately and risking it drifting out of sync.
let lastFrame = null;
function loop(now){
  const dt = (now - lastNow)/1000;
  lastNow = now;
  // While the Pose Designer is open, it takes over the single shared canvas (reparented into the
  // designer panel, see openPoseDesigner below) to preview the move being built, instead of the normal
  // scene — same renderFrame pipeline either way, just a different (synthesized) frame object.
  if(typeof designer !== 'undefined' && designer.active){
    if(designer.playing) designer.elapsed += dt;
    const pose = designer.playing ? evalKeyframePose(designer.elapsed, designer.keyframes) : Object.assign({}, designer.currentPose);
    pose.altitude = 0;
    renderFrame(buildDesignerFrame(pose));
  } else {
    if(state.playing) elapsed += dt*state.speed;
    lastFrame = evaluateScene(state.scene, elapsed);
    renderFrame(lastFrame);
    if(canvasDrag) drawCanvasDragGhost();
    updateTimelineStripPlayhead();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// Forces an immediate repaint outside the rAF loop. Needed because rAF is throttled/paused by the
// browser when the tab isn't focused/visible (and doesn't tick at all while playback is paused), so
// changing a dropdown (Art Style, Background, Weather, Furniture, Food) could otherwise sit invisibly
// in state until the next natural animation frame. Every listener that mutates state.scene outside of
// normal playback should call this right after.
function forceRedraw(){ lastFrame = evaluateScene(state.scene, elapsed); renderFrame(lastFrame); if(canvasDrag) drawCanvasDragGhost(); }

// ---------- Scene panel wiring ----------
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const generateStatus = document.getElementById('generateStatus');
const presetSelect = document.getElementById('presetSelect');
const bgSelect = document.getElementById('bgSelect');
const speedRange = document.getElementById('speedRange');
const speedLabel = document.getElementById('speedLabel');
const playPauseBtn = document.getElementById('playPauseBtn');
const restartBtn = document.getElementById('restartBtn');
const exportBtn = document.getElementById('exportBtn');
const previewVideo = document.getElementById('previewVideo');
const downloadLink = document.getElementById('downloadLink');
const segmentList = document.getElementById('segmentList');
const timelineStrip = document.getElementById('timelineStrip');
// Drag-and-drop segment reordering (Canva-style), layered on top of the existing up/down buttons
// rather than replacing them — dragging is faster once there are many segments, arrows still work
// for precise single-step moves or when a mouse drag isn't practical (touch/accessibility).
let dragSegId = null;
segmentList.addEventListener('dragstart', (e)=>{
  const card = e.target.closest('.segment-card');
  if(!card) return;
  dragSegId = card.getAttribute('data-seg-id');
  e.dataTransfer.effectAllowed = 'move';
  card.classList.add('dragging');
});
segmentList.addEventListener('dragend', (e)=>{
  const card = e.target.closest('.segment-card');
  if(card) card.classList.remove('dragging');
  dragSegId = null;
});
segmentList.addEventListener('dragover', (e)=>{
  e.preventDefault();
  const card = e.target.closest('.segment-card');
  if(card) card.classList.add('drag-over');
});
segmentList.addEventListener('dragleave', (e)=>{
  const card = e.target.closest('.segment-card');
  if(card) card.classList.remove('drag-over');
});
segmentList.addEventListener('drop', (e)=>{
  e.preventDefault();
  const card = e.target.closest('.segment-card');
  segmentList.querySelectorAll('.drag-over').forEach(el=> el.classList.remove('drag-over'));
  if(!card || !dragSegId) return;
  const targetId = card.getAttribute('data-seg-id');
  if(targetId === dragSegId) return;
  const fromIdx = state.scene.timeline.findIndex(s=> s.id === dragSegId);
  const toIdx = state.scene.timeline.findIndex(s=> s.id === targetId);
  if(fromIdx === -1 || toIdx === -1) return;
  const [moved] = state.scene.timeline.splice(fromIdx, 1);
  state.scene.timeline.splice(toIdx, 0, moved);
  renderSegmentList();
  forceRedraw();
});
const timelineTotal = document.getElementById('timelineTotal');
const addSegmentBtn = document.getElementById('addSegmentBtn');

function loadPreset(key){
  const p = PRESETS[key];
  if(!p) return;
  state.scene.timeline = resolveIndexedTimeline(p.timeline, p.charCount);
  renderCharacterList();
  renderSegmentList();
  elapsed = 0;
}
// Applies a scene-plan result — from EITHER source: the instant offline keyword parser
// (parsePromptToScene, js/scene.js) or the AI planner (POST /api/generate-scene) — through one shared
// path. Both sources are built to return the exact same shape (background/weather/furniture/food/
// bodyType/charCount/timeline/animals/vehicles/summary), so nothing downstream needs to know or care
// which one produced it.
function applyGeneratedScene(result, statusPrefix){
  state.scene.background = result.background;
  state.scene.furniture = result.furniture;
  state.scene.timeline = resolveIndexedTimeline(result.timeline, result.charCount);
  if(state.scene.characters[0]) state.scene.characters[0].bodyType = result.bodyType;
  bgSelect.value = result.background;
  furnitureSelect.value = result.furniture;
  if(result.food){ state.scene.food = result.food; foodSelect.value = result.food; }
  if(result.weather){ state.scene.weather = result.weather; weatherSelect.value = result.weather; }
  state.scene.animals = result.animals || [];
  state.scene.vehicles = result.vehicles || [];
  renderAnimalList();
  renderVehicleList();
  renderCharacterList();
  renderSegmentList();
  elapsed = 0;
  generateStatus.textContent = (statusPrefix||'Built') + ' ' + result.summary.actions.length + ' segment' + (result.summary.actions.length===1?'':'s') +
    ' (' + result.summary.actions.join(' → ') + '), ' + result.summary.totalDuration.toFixed(1) + 's total. Fine-tune in the Timeline panel.';
}
generateBtn.addEventListener('click', ()=>{
  const text = promptInput.value.trim();
  if(!text){ generateStatus.textContent = 'Type a description first.'; return; }
  applyGeneratedScene(parsePromptToScene(text), 'Built');
});
// AI-assisted generation: same textarea, but the sentence goes to /api/generate-scene (js/../api/
// generate-scene.js — a small serverless function that asks Claude Haiku to pick from the SAME fixed
// menu of clip/background/animal/vehicle ids the offline parser already uses, so the AI can never draw
// anything the app doesn't already know how to render). Falls back gracefully — with a clear message —
// if the endpoint isn't configured, is rate-limited, or the network call fails.
const aiGenerateBtn = document.getElementById('aiGenerateBtn');
if(aiGenerateBtn){
  aiGenerateBtn.addEventListener('click', async ()=>{
    const text = promptInput.value.trim();
    if(!text){ generateStatus.textContent = 'Type a description first.'; return; }
    aiGenerateBtn.disabled = true; generateBtn.disabled = true;
    const prevLabel = aiGenerateBtn.textContent;
    aiGenerateBtn.textContent = 'Generating with AI…';
    generateStatus.textContent = 'Asking AI to plan the scene…';
    try{
      const res = await fetch('/api/generate-scene', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const data = await res.json().catch(()=> null);
      if(!res.ok || !data || !data.timeline){
        generateStatus.textContent = (data && data.error) || 'AI generation failed. Try the offline Generate button instead.';
        return;
      }
      applyGeneratedScene(data, '✨ AI built');
    } catch(err){
      generateStatus.textContent = 'Couldn’t reach the AI planner (network issue). Try the offline Generate button instead.';
    } finally{
      aiGenerateBtn.disabled = false; generateBtn.disabled = false;
      aiGenerateBtn.textContent = prevLabel;
    }
  });
}
presetSelect.addEventListener('change', ()=> loadPreset(presetSelect.value));
const bgImageInput = document.getElementById('bgImageInput');
const furnitureSelect = document.getElementById('furnitureSelect');
const foodSelect = document.getElementById('foodSelect');
const styleSelect = document.getElementById('styleSelect');
const weatherSelect = document.getElementById('weatherSelect');
// Populate the Background/Food/Style/Weather dropdowns from their registries (js/backgrounds.js,
// js/food.js, js/styles.js, js/weather.js) — adding a new entry there is enough for it to show up
// here, no HTML edits needed.
bgSelect.innerHTML = BACKGROUND_LIST.map(b=> '<option value="'+b.id+'">'+escapeHtml(b.label)+'</option>').join('');
bgSelect.value = state.scene.background;
foodSelect.innerHTML = FOOD_LIST.map(f=> '<option value="'+f.id+'">'+escapeHtml(f.label)+'</option>').join('');
foodSelect.value = state.scene.food;
styleSelect.innerHTML = STYLE_LIST.map(s=> '<option value="'+s.id+'">'+escapeHtml(s.label)+'</option>').join('');
styleSelect.value = state.scene.style;
weatherSelect.innerHTML = WEATHER_LIST.map(w=> '<option value="'+w.id+'">'+escapeHtml(w.label)+'</option>').join('');
weatherSelect.value = state.scene.weather;
styleSelect.addEventListener('change', ()=> { state.scene.style = styleSelect.value; forceRedraw(); });
foodSelect.addEventListener('change', ()=> { state.scene.food = foodSelect.value; forceRedraw(); });
bgSelect.addEventListener('change', ()=> { state.scene.background = bgSelect.value; forceRedraw(); });
weatherSelect.addEventListener('change', ()=> { state.scene.weather = weatherSelect.value; forceRedraw(); });
furnitureSelect.addEventListener('change', ()=> { state.scene.furniture = furnitureSelect.value; forceRedraw(); });
bgImageInput.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    const img = new Image();
    img.onload = function(){
      state.scene.customBgImage = img;
      state.scene.background = 'custom';
      bgSelect.value = 'custom';
      forceRedraw();
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});
speedRange.addEventListener('input', ()=>{
  state.speed = parseFloat(speedRange.value); speedLabel.textContent = state.speed.toFixed(1)+'x';
});
playPauseBtn.addEventListener('click', ()=>{
  state.playing = !state.playing;
  playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
});
restartBtn.addEventListener('click', ()=>{ elapsed = 0; });

// ---------- Character panel (dynamic list, any number of characters) ----------
const characterList = document.getElementById('characterList');
const addCharacterBtn = document.getElementById('addCharacterBtn');

function skinOptionsHtml(sel){
  return [['#ffe9dc','Porcelain'],['#ffe0bd','Light'],['#e8b98a','Medium'],['#c68642','Tan'],['#8d5524','Deep'],['#5c3a21','Ebony']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function eyeOptionsHtml(sel){
  return [['dot','Dot'],['round','Round'],['happy','Happy'],['closed','Closed'],['star','Star'],['heart','Heart'],
          ['wink','Wink'],['sleepy','Sleepy'],['angry','Angry'],['spiral','Spiral (Dizzy)']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function hairOptionsHtml(sel){
  return [['none','Bald'],['short','Short'],['long','Long'],['ponytail','Ponytail'],['mohawk','Mohawk'],
          ['curly','Curly'],['afro','Afro'],['bun','Bun'],['braids','Braids'],
          ['buzzcut','Buzzcut'],['spiky','Spiky'],['pigtails','Pigtails'],['dreadlocks','Dreadlocks'],
          ['undercut','Undercut'],['sidepart','Side Part'],['waves','Waves'],['halfup','Half-Up'],
          ['fauxhawk','Faux Hawk'],['cornrows','Cornrows'],['bowlcut','Bowl Cut']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function accessoryOptionsHtml(sel){
  return [['none','None'],['glasses','Glasses'],['hat','Hat'],['bag','Bag'],
          ['chefhat','Chef Hat'],['police','Police Cap'],['headband','Headband'],['doctor','Stethoscope'],
          ['crown','Crown'],['backpack','Backpack'],['scarf','Scarf'],['mask','Mask'],
          ['cape','Cape'],['wizardhat','Wizard Hat'],['helmet','Helmet'],
          ['necktie','Necktie'],['bowtie','Bow Tie'],['earrings','Earrings'],['wristwatch','Wristwatch']]
    .map(o=> '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>').join('');
}
function costumeOptionsHtml(){
  return COSTUME_LIST.map(c=> '<option value="'+c.id+'">'+c.label+'</option>').join('');
}
// These three read straight from the registries (js/humanTypes.js, js/emotions.js) so adding a new
// age preset, build preset, or emotion there automatically shows up in the dropdown here.
function bodyTypeOptionsHtml(sel){
  return Object.keys(BODY_PRESETS).map(id=>
    '<option value="'+id+'"'+(id===sel?' selected':'')+'>'+BODY_PRESETS[id].label+'</option>'
  ).join('');
}
function buildOptionsHtml(sel){
  return Object.keys(BUILD_PRESETS).map(id=>
    '<option value="'+id+'"'+(id===sel?' selected':'')+'>'+BUILD_PRESETS[id].label+'</option>'
  ).join('');
}
function emotionOptionsHtml(sel){
  return EMOTION_LIST.map(e=>
    '<option value="'+e.id+'"'+(e.id===sel?' selected':'')+'>'+e.label+'</option>'
  ).join('');
}

function characterCardHtml(c, idx){
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<strong>Character ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn" data-cact="save" data-cid="'+c.id+'" title="Save to Library">&#9733;</button>' +
          '<button type="button" class="icon-btn danger" data-cact="remove" data-cid="'+c.id+'" '+(state.scene.characters.length<=1?'disabled':'')+'>&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="row">' +
        '<div class="field"><label>Name</label><input type="text" data-cfield="name" data-cid="'+c.id+'" value="'+escapeHtml(c.name)+'"></div>' +
        '<div class="field"><label>Outfit</label><div class="color-row"><input type="color" data-cfield="outfit" data-cid="'+c.id+'" value="'+c.outfit+'"></div></div>' +
      '</div>' +
      '<div class="field gender-toggle">' +
        '<label><input type="radio" name="gender_'+c.id+'" data-cfield="gender" data-cid="'+c.id+'" value="male" '+(c.gender==='male'?'checked':'')+'> Male</label>' +
        '<label><input type="radio" name="gender_'+c.id+'" data-cfield="gender" data-cid="'+c.id+'" value="female" '+(c.gender==='female'?'checked':'')+'> Female</label>' +
      '</div>' +
      '<div class="field"><label>Costume (sets outfit + accessory)</label><select data-cfield="costume" data-cid="'+c.id+'">'+costumeOptionsHtml()+'</select></div>' +
      '<div class="row">' +
        '<div class="field"><label>Age</label><select data-cfield="bodyType" data-cid="'+c.id+'">'+bodyTypeOptionsHtml(c.bodyType)+'</select></div>' +
        '<div class="field"><label>Build</label><select data-cfield="build" data-cid="'+c.id+'">'+buildOptionsHtml(c.build)+'</select></div>' +
      '</div>' +
      '<div class="field"><label>Height <span class="size-val" data-sizeval="'+c.id+'">'+(c.sizeScale||1).toFixed(2)+'x</span></label><input type="range" min="0.6" max="1.6" step="0.05" data-cfield="sizeScale" data-cid="'+c.id+'" value="'+(c.sizeScale||1)+'"></div>' +
      '<div class="row">' +
        '<div class="field"><label>Skin tone</label><select data-cfield="skin" data-cid="'+c.id+'">'+skinOptionsHtml(c.skin)+'</select></div>' +
        '<div class="field"><label>Eyes</label><select data-cfield="eyeStyle" data-cid="'+c.id+'">'+eyeOptionsHtml(c.eyeStyle)+'</select></div>' +
      '</div>' +
      '<div class="field"><label>Emotion</label><select data-cfield="emotion" data-cid="'+c.id+'">'+emotionOptionsHtml(c.emotion)+'</select></div>' +
      '<div class="row">' +
        '<div class="field"><label>Hairstyle</label><select data-cfield="hairStyle" data-cid="'+c.id+'">'+hairOptionsHtml(c.hairStyle)+'</select></div>' +
        '<div class="field"><label>Hair color</label><div class="color-row"><input type="color" data-cfield="hairColor" data-cid="'+c.id+'" value="'+c.hairColor+'"></div></div>' +
      '</div>' +
      '<div class="field"><label>Accessory</label><select data-cfield="accessory" data-cid="'+c.id+'">'+accessoryOptionsHtml(c.accessory)+'</select></div>' +
    '</div>'
  );
}

function findCharacter(id){ return state.scene.characters.find(c=> c.id === id); }

function renderCharacterList(){
  characterList.innerHTML = state.scene.characters.map((c,idx)=> characterCardHtml(c, idx)).join('');
  characterList.querySelectorAll('[data-cfield]').forEach(el=>{
    const evt = (el.tagName === 'SELECT' || el.type === 'radio') ? 'change' : 'input';
    el.addEventListener(evt, onCharacterFieldChange);
  });
  characterList.querySelectorAll('[data-cact]').forEach(btn=> btn.addEventListener('click', onCharacterAction));
  addCharacterBtn.disabled = state.scene.characters.length >= MAX_CHARACTERS;
}

function onCharacterFieldChange(e){
  const id = e.target.getAttribute('data-cid');
  const field = e.target.getAttribute('data-cfield');
  const c = findCharacter(id);
  if(!c) return;
  if(field === 'gender'){ if(e.target.checked) c.gender = e.target.value; }
  else if(field === 'name'){ c.name = e.target.value || 'Stickman'; renderSegmentList(); }
  else if(field === 'sizeScale'){
    c.sizeScale = parseFloat(e.target.value) || 1;
    const label = characterList.querySelector('[data-sizeval="'+id+'"]');
    if(label) label.textContent = c.sizeScale.toFixed(2) + 'x';
  }
  else if(field === 'costume'){
    // Costume is a one-shot shortcut (not a stored field): apply its outfit + accessory, then
    // re-render so the Outfit swatch and Accessory dropdown reflect the change immediately.
    const preset = COSTUMES[e.target.value];
    if(preset && preset.outfit !== null){
      c.outfit = preset.outfit;
      c.accessory = preset.accessory;
    }
    renderCharacterList();
  }
  else { c[field] = e.target.value; }
  forceRedraw();
}

function onCharacterAction(e){
  const id = e.currentTarget.getAttribute('data-cid');
  const act = e.currentTarget.getAttribute('data-cact');
  const c = findCharacter(id);
  if(!c) return;
  if(act === 'remove'){
    if(state.scene.characters.length <= 1) return;
    state.scene.characters = state.scene.characters.filter(ch=> ch.id !== id);
    state.scene.timeline.forEach(seg=>{
      if(seg.actions) delete seg.actions[id];
      if(seg.dialogue && seg.dialogue.speakerId === id) seg.dialogue = null;
    });
    renderCharacterList();
    renderSegmentList();
    forceRedraw();
  } else if(act === 'save'){
    const list = loadLibrary();
    const appearance = Object.assign({}, c);
    delete appearance.id;
    list.push({ label: c.name, appearance: appearance });
    saveLibrary(list);
    refreshLibSelect();
  }
}

addCharacterBtn.addEventListener('click', ()=>{
  if(state.scene.characters.length >= MAX_CHARACTERS) return;
  const newChar = makeDefaultCharacter(state.scene.characters.length);
  state.scene.characters.push(newChar);
  state.scene.timeline.forEach(seg=>{ if(seg.actions) seg.actions[newChar.id] = 'idle'; });
  renderCharacterList();
  renderSegmentList();
  forceRedraw();
});

// ---------- Animals panel (decorative scene creatures, simpler than characters: no customizer) ----------
const animalList = document.getElementById('animalList');
const animalTypeSelect = document.getElementById('animalTypeSelect');
const addAnimalBtn = document.getElementById('addAnimalBtn');
// Options come from the ANIMALS registry (js/animals.js) — add a new animal there and it shows up here.
animalTypeSelect.innerHTML = ANIMAL_LIST.map(a=> '<option value="'+a.id+'">'+escapeHtml(a.label)+'</option>').join('');

function animalCardHtml(a, idx){
  const label = (ANIMALS[a.type] && ANIMALS[a.type].label) || a.type;
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<strong>' + escapeHtml(label) + ' ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn danger" data-aact="remove" data-aid="'+a.id+'">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Size <span class="size-val" data-asizeval="'+a.id+'">'+(a.sizeScale||1).toFixed(2)+'x</span></label><input type="range" min="0.5" max="1.8" step="0.05" data-afield="sizeScale" data-aid="'+a.id+'" value="'+(a.sizeScale||1)+'"></div>' +
    '</div>'
  );
}

function findAnimal(id){ return state.scene.animals.find(a=> a.id === id); }

function renderAnimalList(){
  animalList.innerHTML = state.scene.animals.map((a,idx)=> animalCardHtml(a, idx)).join('');
  animalList.querySelectorAll('[data-afield]').forEach(el=> el.addEventListener('input', onAnimalFieldChange));
  animalList.querySelectorAll('[data-aact]').forEach(btn=> btn.addEventListener('click', onAnimalAction));
}

function onAnimalFieldChange(e){
  const id = e.target.getAttribute('data-aid');
  const field = e.target.getAttribute('data-afield');
  const a = findAnimal(id);
  if(!a) return;
  if(field === 'sizeScale'){
    a.sizeScale = parseFloat(e.target.value) || 1;
    const label = animalList.querySelector('[data-asizeval="'+id+'"]');
    if(label) label.textContent = a.sizeScale.toFixed(2) + 'x';
  }
}

function onAnimalAction(e){
  const id = e.currentTarget.getAttribute('data-aid');
  const act = e.currentTarget.getAttribute('data-aact');
  if(act === 'remove'){
    state.scene.animals = state.scene.animals.filter(a=> a.id !== id);
    renderAnimalList();
  }
}

addAnimalBtn.addEventListener('click', ()=>{
  state.scene.animals.push({ id: uid(), type: animalTypeSelect.value, sizeScale: 1 });
  renderAnimalList();
});

// ---------- Vehicles panel (static scene props, same pattern as Animals) ----------
const vehicleList = document.getElementById('vehicleList');
const vehicleTypeSelect = document.getElementById('vehicleTypeSelect');
const addVehicleBtn = document.getElementById('addVehicleBtn');
// Options come from the VEHICLES registry (js/vehicles.js) — add a new vehicle there and it shows up here.
vehicleTypeSelect.innerHTML = VEHICLE_LIST.map(v=> '<option value="'+v.id+'">'+escapeHtml(v.label)+'</option>').join('');

function vehicleCardHtml(v, idx){
  const label = (VEHICLES[v.type] && VEHICLES[v.type].label) || v.type;
  return (
    '<div class="segment-card">' +
      '<div class="segment-head">' +
        '<strong>' + escapeHtml(label) + ' ' + (idx+1) + '</strong>' +
        '<div class="segment-actions-row">' +
          '<button type="button" class="icon-btn danger" data-vact="remove" data-vid="'+v.id+'">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Size <span class="size-val" data-vsizeval="'+v.id+'">'+(v.sizeScale||1).toFixed(2)+'x</span></label><input type="range" min="0.5" max="1.8" step="0.05" data-vfield="sizeScale" data-vid="'+v.id+'" value="'+(v.sizeScale||1)+'"></div>' +
    '</div>'
  );
}

function findVehicle(id){ return state.scene.vehicles.find(v=> v.id === id); }

function renderVehicleList(){
  vehicleList.innerHTML = state.scene.vehicles.map((v,idx)=> vehicleCardHtml(v, idx)).join('');
  vehicleList.querySelectorAll('[data-vfield]').forEach(el=> el.addEventListener('input', onVehicleFieldChange));
  vehicleList.querySelectorAll('[data-vact]').forEach(btn=> btn.addEventListener('click', onVehicleAction));
}

function onVehicleFieldChange(e){
  const id = e.target.getAttribute('data-vid');
  const field = e.target.getAttribute('data-vfield');
  const v = findVehicle(id);
  if(!v) return;
  if(field === 'sizeScale'){
    v.sizeScale = parseFloat(e.target.value) || 1;
    const label = vehicleList.querySelector('[data-vsizeval="'+id+'"]');
    if(label) label.textContent = v.sizeScale.toFixed(2) + 'x';
  }
}

function onVehicleAction(e){
  const id = e.currentTarget.getAttribute('data-vid');
  const act = e.currentTarget.getAttribute('data-vact');
  if(act === 'remove'){
    state.scene.vehicles = state.scene.vehicles.filter(v=> v.id !== id);
    renderVehicleList();
  }
}

addVehicleBtn.addEventListener('click', ()=>{
  state.scene.vehicles.push({ id: uid(), type: vehicleTypeSelect.value, sizeScale: 1 });
  renderVehicleList();
});

// ---------- Character Library (saved to this browser via localStorage) ----------
const LIB_KEY = 'stickmanCharacterLibrary';
const libSelect = document.getElementById('libSelect');
function loadLibrary(){ try { return JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch(e){ return []; } }
function saveLibrary(list){ try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch(e){} }
function refreshLibSelect(){
  const list = loadLibrary();
  libSelect.innerHTML = list.length
    ? list.map((c,i)=> '<option value="'+i+'">'+escapeHtml(c.label)+'</option>').join('')
    : '<option value="">(none saved yet)</option>';
}
document.getElementById('addFromLibBtn').addEventListener('click', ()=>{
  const list = loadLibrary();
  const idx = parseInt(libSelect.value, 10);
  if(isNaN(idx) || !list[idx]) return;
  if(state.scene.characters.length >= MAX_CHARACTERS){ alert('Scene already has the max of ' + MAX_CHARACTERS + ' characters.'); return; }
  const appearance = Object.assign(makeCharacter(), list[idx].appearance, { id: charUid(), name: list[idx].label });
  state.scene.characters.push(appearance);
  state.scene.timeline.forEach(seg=>{ if(seg.actions) seg.actions[appearance.id] = 'idle'; });
  renderCharacterList();
  renderSegmentList();
});
document.getElementById('deleteLibBtn').addEventListener('click', ()=>{
  const list = loadLibrary();
  const idx = parseInt(libSelect.value, 10);
  if(isNaN(idx)) return;
  list.splice(idx,1);
  saveLibrary(list);
  refreshLibSelect();
});
refreshLibSelect();

// ---------- Timeline / segment editor ----------
// 'customPose' is a reserved id, appended after the real CLIP_LIST entries — deliberately NOT added to
// CLIP_LIST itself, since that array is also read by the AI scene planner/Scene Engine schemas, and
// picking "Design your own..." only makes sense with per-segment keyframe data a human just posed by
// hand (see js/scene.js's evaluateScene + the Pose Designer below), not something an AI should ever
// pick blind.
function clipOptionsHtml(selected){
  return CLIP_LIST.map(c=> `<option value="${c.id}" ${c.id===selected?'selected':''}>${c.label}</option>`).join('')
    + `<option value="customPose" ${selected==='customPose'?'selected':''}>&#9998; Design your own...</option>`;
}

function renderSegmentList(){
  const total = evaluateScene(state.scene, 0).totalDuration;
  timelineTotal.textContent = 'Total: ' + total.toFixed(1) + 's (' + state.scene.timeline.length + ' segment' + (state.scene.timeline.length===1?'':'s') + ')';

  segmentList.innerHTML = state.scene.timeline.map((seg, idx)=>{
    const actionFieldsHtml = state.scene.characters.map(c=>{
      const clipVal = (seg.actions&&seg.actions[c.id])||'idle';
      const kfCount = (seg.customPoses && seg.customPoses[c.id] && seg.customPoses[c.id].keyframes) ? seg.customPoses[c.id].keyframes.length : 0;
      const editBtn = clipVal === 'customPose'
        ? '<button type="button" class="icon-btn" data-designer-edit data-segid="'+seg.id+'" data-cid="'+c.id+'" title="Edit this move" style="width:auto; padding:0 6px; white-space:nowrap;">&#9998; ' + kfCount + '</button>'
        : '';
      return '<div class="field"><label>' + escapeHtml(c.name) + '</label>' +
        '<div class="row" style="align-items:center; gap:4px;">' +
          '<select data-field="action_'+c.id+'" data-id="'+seg.id+'" style="flex:1;">'+clipOptionsHtml(clipVal)+'</select>' +
          editBtn +
        '</div>' +
      '</div>';
    }).join('');
    const speakerOptions = state.scene.characters.map(c=>
      '<option value="'+c.id+'"'+(seg.dialogue&&seg.dialogue.speakerId===c.id?' selected':'')+'>'+escapeHtml(c.name)+'</option>'
    ).join('');
    const dialogueHtml = seg.dialogue ? (
      '<div class="row">' +
        '<div class="field" style="max-width:100px;"><label>Speaker</label><select data-field="dialogueSpeaker" data-id="'+seg.id+'">'+speakerOptions+'</select></div>' +
        '<div class="field"><label>Line</label><input type="text" data-field="dialogueText" data-id="'+seg.id+'" value="'+escapeHtml(seg.dialogue.text)+'"></div>' +
      '</div>'
    ) : '';
    // Per-segment background/weather overrides — "(Scene default)" means inherit the global Scene
    // panel setting; picking a real option only changes THIS segment, letting a "driving" sequence
    // cut between segments with different backgrounds/seasons to sell a journey without literal
    // point-to-point movement (js/scene.js: active.background||scene.background).
    const bgOverrideOptions = '<option value="">(Scene default)</option>' + BACKGROUND_LIST.map(b=>
      '<option value="'+b.id+'"'+(seg.background===b.id?' selected':'')+'>'+escapeHtml(b.label)+'</option>'
    ).join('');
    const weatherOverrideOptions = '<option value="">(Scene default)</option>' + WEATHER_LIST.map(w=>
      '<option value="'+w.id+'"'+(seg.weather===w.id?' selected':'')+'>'+escapeHtml(w.label)+'</option>'
    ).join('');
    const sceneOverrideHtml =
      '<div class="row">' +
        '<div class="field"><label>Background (this segment)</label><select data-field="segBackground" data-id="'+seg.id+'">'+bgOverrideOptions+'</select></div>' +
        '<div class="field"><label>Weather (this segment)</label><select data-field="segWeather" data-id="'+seg.id+'">'+weatherOverrideOptions+'</select></div>' +
      '</div>';
    // Direction override: "Auto" keeps each character's normal layout-assigned facing (inward toward
    // others); Right/Left forces which way they face AND, for a move/ride clip, which way they travel
    // this segment — this is what lets the same "walk"/"drivecar" action go either direction on screen.
    const directionFieldsHtml = state.scene.characters.map(c=>{
      const dirVal = (seg.directions && seg.directions[c.id]) || 'auto';
      const clipId = (seg.actions && seg.actions[c.id]) || 'idle';
      // Up/Down only apply to flying clips (flyplane/flyhelicopter) — climb/descend instead of
      // left/right travel. Shown only when relevant so the control doesn't confuse ground clips.
      const vertOptions = isFlyClip(clipId)
        ? '<option value="up"'+(dirVal==='up'?' selected':'')+'>Up &uarr; (climb)</option>' +
          '<option value="down"'+(dirVal==='down'?' selected':'')+'>Down &darr; (descend)</option>'
        : '';
      // A dragged end-position (task #28: drag the character directly on the canvas) overrides this
      // dropdown entirely for this character/segment — surface that as a small inline note + clear
      // button rather than letting the dropdown silently lie about what's actually happening.
      const dragNote = (seg.dragTargets && seg.dragTargets[c.id])
        ? '<div class="drag-target-note">Custom position set on canvas &middot; ' +
            '<button type="button" class="icon-btn" data-act="clearDrag" data-id="'+seg.id+'" data-char="'+c.id+'" title="Clear custom position">&times; Clear</button>' +
          '</div>'
        : '';
      return '<div class="field"><label>' + escapeHtml(c.name) + ' direction</label><select data-field="direction_'+c.id+'" data-id="'+seg.id+'">' +
        '<option value="auto"'+(dirVal==='auto'?' selected':'')+'>Auto</option>' +
        '<option value="right"'+(dirVal==='right'?' selected':'')+'>Right &rarr;</option>' +
        '<option value="left"'+(dirVal==='left'?' selected':'')+'>&larr; Left</option>' +
        vertOptions +
        '</select>' + dragNote + '</div>';
    }).join('');
    return (
      '<div class="segment-card" draggable="true" data-seg-id="'+seg.id+'">' +
        '<div class="segment-head">' +
          '<span class="drag-handle" title="Drag to reorder">&#8942;&#8942;</span>' +
          '<strong>Segment ' + (idx+1) + '</strong>' +
          '<div class="segment-actions-row">' +
            '<button type="button" class="icon-btn" data-act="up" data-id="'+seg.id+'" '+(idx===0?'disabled':'')+'>&uarr;</button>' +
            '<button type="button" class="icon-btn" data-act="down" data-id="'+seg.id+'" '+(idx===state.scene.timeline.length-1?'disabled':'')+'>&darr;</button>' +
            '<button type="button" class="icon-btn" data-act="duplicate" data-id="'+seg.id+'" title="Duplicate">&#10697;</button>' +
            '<button type="button" class="icon-btn danger" data-act="remove" data-id="'+seg.id+'" '+(state.scene.timeline.length<=1?'disabled':'')+'>&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="row">' +
          '<div class="field"><label>Duration (s)</label><input type="number" min="0.5" step="0.5" value="'+seg.duration+'" data-field="duration" data-id="'+seg.id+'"></div>' +
          actionFieldsHtml +
        '</div>' +
        '<div class="row">' + directionFieldsHtml + '</div>' +
        sceneOverrideHtml +
        '<div class="checkbox-field"><input type="checkbox" data-field="povCamera" data-id="'+seg.id+'" '+(seg.povCamera?'checked':'')+'> <label>Driver POV camera (windshield view, if someone is riding/driving)</label></div>' +
        '<div class="checkbox-field"><input type="checkbox" data-field="hasDialogue" data-id="'+seg.id+'" '+(seg.dialogue?'checked':'')+'> <label>Dialogue in this segment</label></div>' +
        dialogueHtml +
      '</div>'
    );
  }).join('');

  segmentList.querySelectorAll('[data-act]').forEach(btn=> btn.addEventListener('click', onSegmentAction));
  segmentList.querySelectorAll('select[data-field]').forEach(el=> el.addEventListener('change', onSegmentFieldChange));
  segmentList.querySelectorAll('input[data-field]').forEach(el=>{
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', onSegmentFieldChange);
  });
  segmentList.querySelectorAll('[data-designer-edit]').forEach(btn=> btn.addEventListener('click', (e)=>{
    openPoseDesigner(e.currentTarget.getAttribute('data-segid'), e.currentTarget.getAttribute('data-cid'));
  }));
  renderTimelineStrip();
}

// Canva/CapCut-style visual timeline strip: same segments as the detailed cards below, rendered as
// proportionally-sized colored blocks with a live playhead — this is a real scrubbable timeline, not
// just a static overview: click-drag anywhere on the strip background to scrub playback, drag a
// block's ⋮⋮ handle to reorder it (shares dragSegId with the segment-card drag handlers above, since
// only one drag can be in flight at a time), and drag a block's right edge to trim its duration.
const STRIP_COLORS = ['#6366f1','#0891b2','#16a34a','#d97706','#db2777','#7c3aed','#dc2626','#0d9488','#4f46e5','#059669'];
function segLabel(seg){
  const firstChar = state.scene.characters[0];
  const clipId = (firstChar && seg.actions && seg.actions[firstChar.id]) || 'idle';
  if(clipId === 'customPose') return 'Custom move';
  const clip = (typeof CLIPS !== 'undefined' && CLIPS[clipId]) || null;
  return clip ? clip.label : 'Idle';
}
function stripTimeAt(clientX){
  const rect = timelineStrip.getBoundingClientRect();
  const total = state.scene.timeline.reduce((s,seg)=> s + Math.max(0.1, seg.duration), 0) || 1;
  const frac = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
  return frac * total;
}
function renderTimelineStrip(){
  timelineStrip.innerHTML = '';
  const timeline = state.scene.timeline;
  timeline.forEach((seg, idx)=>{
    const block = document.createElement('div');
    block.className = 'timeline-strip-block';
    block.style.flex = Math.max(0.1, seg.duration) + ' 1 0%';
    block.style.background = STRIP_COLORS[idx % STRIP_COLORS.length];
    block.title = 'Segment ' + (idx+1) + ' (' + seg.duration + 's)';
    block.setAttribute('data-seg-id', seg.id);

    const handle = document.createElement('span');
    handle.className = 'strip-drag-handle';
    handle.setAttribute('draggable', 'true');
    handle.title = 'Drag to reorder';
    handle.textContent = '⋮⋮';
    handle.addEventListener('mousedown', (e)=> e.stopPropagation());
    handle.addEventListener('dragstart', (e)=>{ e.stopPropagation(); dragSegId = seg.id; block.classList.add('dragging'); });
    handle.addEventListener('dragend', (e)=>{ e.stopPropagation(); block.classList.remove('dragging'); dragSegId = null; });
    block.appendChild(handle);

    const label = document.createElement('span');
    label.className = 'strip-label';
    label.textContent = (idx+1) + '. ' + segLabel(seg);
    block.appendChild(label);

    const resize = document.createElement('span');
    resize.className = 'strip-resize-handle';
    resize.title = 'Drag to trim duration';
    resize.addEventListener('mousedown', (e)=>{
      e.stopPropagation(); e.preventDefault();
      const total = state.scene.timeline.reduce((s,sg)=> s + Math.max(0.1, sg.duration), 0) || 1;
      const stripWidth = timelineStrip.getBoundingClientRect().width || 1;
      const secsPerPx = total / stripWidth;
      const startX = e.clientX, startDuration = seg.duration;
      function onMove(ev){
        seg.duration = Math.max(0.5, startDuration + (ev.clientX - startX) * secsPerPx);
        renderTimelineStrip();
        renderSegmentList();
        forceRedraw();
      }
      function onUp(){ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    block.appendChild(resize);

    block.addEventListener('dragover', (e)=>{ e.preventDefault(); block.classList.add('drag-over'); });
    block.addEventListener('dragleave', ()=> block.classList.remove('drag-over'));
    block.addEventListener('drop', (e)=>{
      e.preventDefault();
      block.classList.remove('drag-over');
      if(!dragSegId || dragSegId === seg.id) return;
      const fromIdx = state.scene.timeline.findIndex(s=> s.id === dragSegId);
      const toIdx = state.scene.timeline.findIndex(s=> s.id === seg.id);
      if(fromIdx === -1 || toIdx === -1) return;
      const [moved] = state.scene.timeline.splice(fromIdx, 1);
      state.scene.timeline.splice(toIdx, 0, moved);
      renderSegmentList();
      forceRedraw();
    });
    timelineStrip.appendChild(block);
  });
  const playhead = document.createElement('div');
  playhead.className = 'timeline-strip-playhead';
  playhead.id = 'timelineStripPlayhead';
  timelineStrip.appendChild(playhead);
  updateTimelineStripPlayhead();
}
// Click-drag scrubbing: mousedown anywhere on the strip's own background (not a block's drag/resize
// handle, which stopPropagation their own mousedowns) starts scrubbing — playback pauses for the
// duration of the drag, like a real editor, and resumes to wherever it was left (paused or not).
timelineStrip.addEventListener('mousedown', (e)=>{
  const wasPlaying = state.playing;
  state.playing = false;
  elapsed = stripTimeAt(e.clientX);
  forceRedraw(); updateTimelineStripPlayhead();
  function onMove(ev){ elapsed = stripTimeAt(ev.clientX); forceRedraw(); updateTimelineStripPlayhead(); }
  function onUp(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    state.playing = wasPlaying;
    if(playPauseBtn) playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});
function updateTimelineStripPlayhead(){
  const playhead = document.getElementById('timelineStripPlayhead');
  if(!playhead) return;
  const total = state.scene.timeline.reduce((s,seg)=> s + Math.max(0.1, seg.duration), 0) || 1;
  const tt = ((elapsed % total) + total) % total;
  playhead.style.left = (tt/total*100) + '%';
}

function findSegment(id){ return state.scene.timeline.find(s=> s.id === id); }

// ---------- Canvas drag-to-reposition (task #28): click-drag a character (or whatever vehicle they're
// riding — the vehicle prop just follows the character's x) directly on the preview to pin where they
// should be by the END of whichever segment is currently on screen. This is the simplest of a few
// possible "direct manipulation" designs: it slides the character from wherever this segment started
// to the dropped point over the segment's duration (js/scene.js: seg.dragTargets), rather than
// authoring a full multi-point path. Dragging always edits the segment that's active at drag-start
// time, so scrub the strip/cards to the right segment first, then drag.
let canvasDrag = null; // { charId, segId, startX, x } while a drag is in progress
function canvasPointFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
// Generous hit box (the stickman silhouette is thin) — roughly head-to-feet vertically, centered on x,
// shifted up by however high a flying character currently is so mid-flight drags still land correctly.
function hitTestCharacterAt(px, py){
  if(!lastFrame || !lastFrame.characters) return null;
  let best = null, bestDist = Infinity;
  lastFrame.characters.forEach(c=>{
    const altitude = (c.pose && c.pose.altitude) || 0;
    const topY = GROUND_Y - altitude - 170, botY = GROUND_Y - altitude + 20;
    if(px >= c.x - 45 && px <= c.x + 45 && py >= topY && py <= botY){
      const d = Math.abs(px - c.x);
      if(d < bestDist){ bestDist = d; best = c; }
    }
  });
  return best;
}
// Drawn on top of the normal frame (by loop()/forceRedraw() above) while a drag is in progress: a
// dashed line from the drag's start x to the live cursor x, plus a small handle dot at the cursor.
function drawCanvasDragGhost(){
  if(!canvasDrag) return;
  ctx.save();
  ctx.setLineDash([6,5]);
  ctx.strokeStyle = 'rgba(37,99,235,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(canvasDrag.startX, GROUND_Y); ctx.lineTo(canvasDrag.x, GROUND_Y); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(37,99,235,0.9)';
  ctx.beginPath(); ctx.arc(canvasDrag.x, GROUND_Y, 8, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
canvas.addEventListener('mousedown', (e)=>{
  if(!lastFrame) return;
  const pt = canvasPointFromEvent(e);
  const hit = hitTestCharacterAt(pt.x, pt.y);
  if(!hit) return;
  const seg = findSegment(lastFrame.activeSegmentId);
  if(!seg) return;
  const wasPlaying = state.playing;
  state.playing = false;
  if(playPauseBtn) playPauseBtn.textContent = 'Play';
  canvasDrag = { charId: hit.id, segId: seg.id, startX: hit.x, x: hit.x };
  canvas.style.cursor = 'grabbing';
  forceRedraw();
  function onMove(ev){
    const p = canvasPointFromEvent(ev);
    canvasDrag.x = clamp(p.x, 60, W-60);
    forceRedraw();
  }
  function onUp(){
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    const targetSeg = findSegment(canvasDrag.segId);
    if(targetSeg){
      if(!targetSeg.dragTargets) targetSeg.dragTargets = {};
      targetSeg.dragTargets[canvasDrag.charId] = { x: canvasDrag.x };
      // Drag replaces the direction dropdown for this character/segment — clearing it avoids the
      // dropdown showing a stale "Right"/"Left" that no longer reflects what's actually happening.
      if(targetSeg.directions) delete targetSeg.directions[canvasDrag.charId];
    }
    canvasDrag = null;
    canvas.style.cursor = '';
    state.playing = wasPlaying;
    if(playPauseBtn) playPauseBtn.textContent = state.playing ? 'Pause' : 'Play';
    renderSegmentList();
    forceRedraw();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});
canvas.addEventListener('mousemove', (e)=>{
  if(canvasDrag) return; // an active drag is driven by the document-level listener installed above
  const pt = canvasPointFromEvent(e);
  canvas.style.cursor = hitTestCharacterAt(pt.x, pt.y) ? 'grab' : '';
});

function onSegmentAction(e){
  const id = e.currentTarget.getAttribute('data-id');
  const act = e.currentTarget.getAttribute('data-act');
  const idx = state.scene.timeline.findIndex(s=> s.id === id);
  if(idx === -1) return;
  if(act === 'remove'){
    if(state.scene.timeline.length > 1) state.scene.timeline.splice(idx, 1);
  } else if(act === 'up' && idx > 0){
    const tmp = state.scene.timeline[idx-1]; state.scene.timeline[idx-1] = state.scene.timeline[idx]; state.scene.timeline[idx] = tmp;
  } else if(act === 'down' && idx < state.scene.timeline.length-1){
    const tmp = state.scene.timeline[idx+1]; state.scene.timeline[idx+1] = state.scene.timeline[idx]; state.scene.timeline[idx] = tmp;
  } else if(act === 'duplicate'){
    const seg = state.scene.timeline[idx];
    const copy = { id: uid(), duration: seg.duration, actions: Object.assign({}, seg.actions), dialogue: seg.dialogue ? Object.assign({}, seg.dialogue) : null, background: seg.background, weather: seg.weather, directions: Object.assign({}, seg.directions), povCamera: !!seg.povCamera, dragTargets: Object.assign({}, seg.dragTargets), customPoses: Object.fromEntries(Object.entries(seg.customPoses||{}).map(([cid,d])=>[cid, { keyframes: (d.keyframes||[]).map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })) }])) };
    state.scene.timeline.splice(idx+1, 0, copy);
  } else if(act === 'clearDrag'){
    const charId = e.currentTarget.getAttribute('data-char');
    const seg = state.scene.timeline[idx];
    if(seg.dragTargets) delete seg.dragTargets[charId];
  }
  renderSegmentList();
  forceRedraw();
}

function onSegmentFieldChange(e){
  const id = e.target.getAttribute('data-id');
  const field = e.target.getAttribute('data-field');
  const seg = findSegment(id);
  if(!seg) return;
  if(field === 'duration'){
    seg.duration = Math.max(0.5, parseFloat(e.target.value) || 0.5);
    timelineTotal.textContent = 'Total: ' + evaluateScene(state.scene,0).totalDuration.toFixed(1) + 's (' + state.scene.timeline.length + ' segment' + (state.scene.timeline.length===1?'':'s') + ')';
  } else if(field.indexOf('action_') === 0){
    const charId = field.slice('action_'.length);
    if(!seg.actions) seg.actions = {};
    // Captured BEFORE overwriting below — openPoseDesigner needs the TRUE prior action (e.g. 'idle')
    // to revert to if the user Cancels out of a freshly-opened designer. Reading seg.actions[charId]
    // from inside openPoseDesigner itself would see 'customPose' (already written a few lines down),
    // making Cancel a no-op on a fresh pick — that was a real bug, fixed by passing this through.
    const priorAction = seg.actions[charId] || 'idle';
    seg.actions[charId] = e.target.value;
    // Selecting "Talk" with no dialogue set yet would otherwise render a silent, closed-mouth
    // character — poseTalk (js/poses.js) only opens the mouth and evaluateScene only draws a speech
    // bubble when a segment actually has dialogue text for that speaker. Presets/AI-generated scenes
    // already fill this in automatically; a manually-picked Talk action should "just work" the same
    // way instead of silently requiring a separate checkbox + text field to discover.
    if(e.target.value === 'talk' && !seg.dialogue){
      seg.dialogue = { speakerId: charId, text: "Hey, how's it going?" };
    }
    // Picking "Design your own..." opens the Pose Designer right away — with no keyframes saved yet
    // it'd otherwise silently fall back to idle (js/scene.js's evaluateScene) with no obvious next step.
    if(e.target.value === 'customPose'){
      openPoseDesigner(seg.id, charId, priorAction);
    }
    // Re-render so the direction select's Up/Down (climb/descend) options show up immediately when
    // switching a character into flyplane/flyhelicopter, and disappear when switching back out.
    renderSegmentList();
  } else if(field.indexOf('direction_') === 0){
    const charId = field.slice('direction_'.length);
    if(!seg.directions) seg.directions = {};
    seg.directions[charId] = e.target.value;
    // Direction and a dragged custom position (task #28) are mutually exclusive controls for the same
    // character/segment — picking a direction here means "go back to the normal auto-movement", so any
    // dragged end-position is cleared rather than silently overriding what the dropdown now shows.
    if(seg.dragTargets && seg.dragTargets[charId]){
      delete seg.dragTargets[charId];
      renderSegmentList();
    }
  } else if(field === 'povCamera'){
    seg.povCamera = e.target.checked;
  } else if(field === 'hasDialogue'){
    const firstId = state.scene.characters[0] && state.scene.characters[0].id;
    seg.dialogue = e.target.checked ? { speakerId: firstId, text: 'New line' } : null;
    renderSegmentList();
  } else if(field === 'dialogueSpeaker'){
    if(seg.dialogue) seg.dialogue.speakerId = e.target.value;
  } else if(field === 'dialogueText'){
    if(seg.dialogue) seg.dialogue.text = e.target.value || ' ';
  } else if(field === 'segBackground'){
    seg.background = e.target.value || null;
  } else if(field === 'segWeather'){
    seg.weather = e.target.value || null;
  }
  forceRedraw();
}

addSegmentBtn.addEventListener('click', ()=>{
  const actions = {};
  state.scene.characters.forEach(c=> actions[c.id] = 'idle');
  state.scene.timeline.push(makeSegment(2.5, actions, null));
  renderSegmentList();
  forceRedraw();
});

// ---------- Pose Designer: general-purpose keyframe move builder ----------
// Lets a user build any custom action (a fight combo, a dance move, a sports move — not just combat)
// by hand: pose the character with per-limb sliders, save that pose as a keyframe, add another, and the
// tool smoothly interpolates between them in order (js/poses.js's evalKeyframePose), looping. This is
// how "the fight action looks like dancing" gets solved for good on a per-user basis: instead of only
// ever picking a hand-coded clip like Fight, a character/segment can point at a fully custom sequence
// the user designed themselves. Reuses the single shared #stage canvas for its live preview by
// physically reparenting it into the designer panel while open (js/render.js's ctx/canvas are
// module-level consts closed over by every draw function, so a second canvas would need a much bigger
// refactor to support — moving the one real canvas costs nothing and loses no 2D context state).
const designerOverlay = document.getElementById('poseDesignerOverlay');
const designerTitleEl = document.getElementById('designerTitle');
const designerPreviewMount = document.getElementById('designerPreviewMount');
const designerSlidersEl = document.getElementById('designerSliders');
const designerKeyframeListEl = document.getElementById('designerKeyframeList');
const designerAddKeyframeBtn = document.getElementById('designerAddKeyframeBtn');
const designerPlayBtn = document.getElementById('designerPlayBtn');
const designerPreviewLabel = document.getElementById('designerPreviewLabel');
const designerSaveBtn = document.getElementById('designerSaveBtn');
const designerCancelBtn = document.getElementById('designerCancelBtn');
const designerCloseBtn = document.getElementById('designerCloseBtn');

// A light, neutral standing pose to start a brand-new move from — mirrors the engine's standingStance.
const DEFAULT_DESIGNER_POSE = {
  torsoLean: 0, headTilt: 0, bounceY: 0,
  leftShoulderAngle: 0.1, leftElbowBend: 0.15, rightShoulderAngle: 0.1, rightElbowBend: 0.15,
  leftHipAngle: 0.05, leftKneeBend: 0.06, rightHipAngle: -0.05, rightKneeBend: 0.06, mouthOpen: 0
};
// Ranges are generous enough to cover every hand-authored pose already in js/poses.js (checked against
// poseFight/poseKick/poseSleep/poseYoga's actual angle values) without letting a slider produce a
// physically nonsensical joint angle.
const DESIGNER_SLIDERS = [
  { field:'torsoLean', label:'Torso lean', min:-1.6, max:1.6, step:0.01 },
  { field:'headTilt', label:'Head tilt', min:-1.2, max:1.2, step:0.01 },
  { field:'bounceY', label:'Body height (crouch / lift)', min:-20, max:170, step:1 },
  { field:'leftShoulderAngle', label:'Left shoulder', min:-3.2, max:3.2, step:0.01 },
  { field:'leftElbowBend', label:'Left elbow bend', min:-2.5, max:2.5, step:0.01 },
  { field:'rightShoulderAngle', label:'Right shoulder', min:-3.2, max:3.2, step:0.01 },
  { field:'rightElbowBend', label:'Right elbow bend', min:-2.5, max:2.5, step:0.01 },
  { field:'leftHipAngle', label:'Left hip', min:-2, max:2, step:0.01 },
  { field:'leftKneeBend', label:'Left knee bend', min:-0.3, max:2.8, step:0.01 },
  { field:'rightHipAngle', label:'Right hip', min:-2, max:2, step:0.01 },
  { field:'rightKneeBend', label:'Right knee bend', min:-0.3, max:2.8, step:0.01 },
  { field:'mouthOpen', label:'Mouth open', min:0, max:1, step:0.05 }
];

const designer = {
  active: false, segId: null, charId: null, previousAction: 'idle',
  keyframes: [], currentPose: Object.assign({}, DEFAULT_DESIGNER_POSE), editingIdx: -1,
  playing: false, elapsed: 0, stageOriginalParent: null, stageOriginalNextSibling: null
};

// Full-scene-context preview: rather than an isolated character floating on a plain background, reuse
// the real evaluateScene pipeline for the exact segment being edited — real background/weather, every
// other character in their normal pose (including their OWN saved custom move, if they have one),
// vehicles, furniture — and swap in only the one pose actually being designed. This is what lets you
// see, live, how a hand-designed move will actually look in the finished scene (e.g. two boxers facing
// off) instead of guessing from a blank-background single figure.
function buildDesignerFrame(pose){
  const seg = findSegment(designer.segId);
  let offset = 0;
  for(let i=0;i<state.scene.timeline.length;i++){
    if(state.scene.timeline[i].id === designer.segId) break;
    offset += Math.max(0.1, state.scene.timeline[i].duration);
  }
  const segDuration = seg ? Math.max(0.1, seg.duration) : 1;
  // Stay strictly inside this segment (never spill into the next one) regardless of how long the
  // in-progress move's Play-sequence loop runs.
  const localT = Math.min(segDuration - 0.02, Math.max(0, designer.elapsed));
  const frame = evaluateScene(state.scene, offset + localT);
  frame.characters = frame.characters.map(c=>{
    if(c.id !== designer.charId) return c;
    // Preserve whatever altitude the real scene already computed for this character (e.g. mid-flight)
    // rather than forcing them back to ground level just because the designer's pose object has no
    // altitude field of its own.
    return Object.assign({}, c, { pose: Object.assign({}, pose, { altitude: c.pose.altitude || 0 }) });
  });
  return frame;
}

function renderDesignerSliders(){
  designerSlidersEl.innerHTML = DESIGNER_SLIDERS.map(s=>
    '<div class="designer-slider-row">' +
      '<label>' + s.label + ' <span class="designer-slider-val" data-valfor="'+s.field+'">' + (designer.currentPose[s.field]||0).toFixed(2) + '</span></label>' +
      '<input type="range" data-designer-slider="'+s.field+'" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'" value="'+(designer.currentPose[s.field]||0)+'">' +
    '</div>'
  ).join('');
  designerSlidersEl.querySelectorAll('[data-designer-slider]').forEach(inp=>{
    inp.addEventListener('input', (e)=>{
      const field = e.target.getAttribute('data-designer-slider');
      designer.currentPose[field] = parseFloat(e.target.value);
      designer.playing = false; // a manual slider tweak always drops back into live single-pose editing
      // The sliders no longer exactly match whichever keyframe was loaded (if any) the moment a value
      // actually changes — clear editingIdx so "Add keyframe" appends a NEW keyframe instead of
      // silently overwriting the one that used to be loaded (avoid a full list re-render on every drag
      // tick; just drop the 'active' highlight directly).
      if(designer.editingIdx !== -1){
        designer.editingIdx = -1;
        const activeRow = designerKeyframeListEl.querySelector('.designer-kf-row.active');
        if(activeRow) activeRow.classList.remove('active');
      }
      designerPlayBtn.textContent = 'Play sequence';
      designerPreviewLabel.textContent = 'Editing keyframe pose';
      const label = designerSlidersEl.querySelector('[data-valfor="'+field+'"]');
      if(label) label.textContent = designer.currentPose[field].toFixed(2);
    });
  });
}

function renderDesignerKeyframeList(){
  designerKeyframeListEl.innerHTML = designer.keyframes.length ? designer.keyframes.map((k,idx)=>
    '<div class="designer-kf-row'+(idx===designer.editingIdx?' active':'')+'">' +
      '<span>'+(idx+1)+'.</span>' +
      '<input type="number" min="0.1" step="0.1" value="'+k.duration+'" data-kf-duration="'+idx+'" title="Seconds to hold/transition"><span class="designer-kf-s">s</span>' +
      '<button type="button" class="icon-btn" data-kf-load="'+idx+'" title="Load onto sliders to edit">&#9998;</button>' +
      '<button type="button" class="icon-btn" data-kf-up="'+idx+'" '+(idx===0?'disabled':'')+' title="Move earlier">&uarr;</button>' +
      '<button type="button" class="icon-btn" data-kf-down="'+idx+'" '+(idx===designer.keyframes.length-1?'disabled':'')+' title="Move later">&darr;</button>' +
      '<button type="button" class="icon-btn danger" data-kf-delete="'+idx+'" title="Delete">&times;</button>' +
    '</div>'
  ).join('') : '<p style="font-size:12px; color:var(--muted); margin:4px 0;">No keyframes yet — pose the character with the sliders, then "Add keyframe". A single keyframe just holds that pose; two or more animate between them, looping.</p>';

  designerKeyframeListEl.querySelectorAll('[data-kf-duration]').forEach(inp=> inp.addEventListener('input', e=>{
    const idx = parseInt(e.target.getAttribute('data-kf-duration'),10);
    designer.keyframes[idx].duration = Math.max(0.1, parseFloat(e.target.value)||0.1);
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-load]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-load'),10);
    designer.currentPose = Object.assign({}, designer.keyframes[idx].pose);
    designer.editingIdx = idx; designer.playing = false;
    designerPlayBtn.textContent = 'Play sequence'; designerPreviewLabel.textContent = 'Editing keyframe pose';
    renderDesignerSliders(); renderDesignerKeyframeList();
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-up]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-up'),10);
    if(idx>0){ const t=designer.keyframes[idx-1]; designer.keyframes[idx-1]=designer.keyframes[idx]; designer.keyframes[idx]=t; if(designer.editingIdx===idx) designer.editingIdx=idx-1; else if(designer.editingIdx===idx-1) designer.editingIdx=idx; renderDesignerKeyframeList(); }
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-down]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-down'),10);
    if(idx<designer.keyframes.length-1){ const t=designer.keyframes[idx+1]; designer.keyframes[idx+1]=designer.keyframes[idx]; designer.keyframes[idx]=t; if(designer.editingIdx===idx) designer.editingIdx=idx+1; else if(designer.editingIdx===idx+1) designer.editingIdx=idx; renderDesignerKeyframeList(); }
  }));
  designerKeyframeListEl.querySelectorAll('[data-kf-delete]').forEach(btn=> btn.addEventListener('click', e=>{
    const idx = parseInt(e.currentTarget.getAttribute('data-kf-delete'),10);
    designer.keyframes.splice(idx,1);
    if(designer.editingIdx===idx) designer.editingIdx=-1;
    else if(designer.editingIdx>idx) designer.editingIdx -= 1;
    renderDesignerKeyframeList();
  }));
}

function openPoseDesigner(segId, charId, explicitPreviousAction){
  const seg = findSegment(segId);
  const character = findCharacter(charId);
  if(!seg || !character) return;
  designer.active = true; designer.segId = segId; designer.charId = charId;
  designer.playing = false; designer.elapsed = 0; designer.editingIdx = -1;
  // explicitPreviousAction is passed by the action-dropdown handler (onSegmentFieldChange), which
  // must capture the TRUE prior action before it overwrites seg.actions[charId] with 'customPose' —
  // reading seg.actions[charId] here directly would already see 'customPose' in that case, breaking
  // Cancel's revert-to-prior-action behavior. Callers that open the designer without having just
  // changed the action (the pencil edit button, the "Start designing" banner) omit this argument and
  // fall back to reading the current value, which is correct for them.
  designer.previousAction = explicitPreviousAction != null ? explicitPreviousAction : ((seg.actions && seg.actions[charId]) || 'idle');
  const existing = seg.customPoses && seg.customPoses[charId];
  designer.keyframes = (existing && existing.keyframes && existing.keyframes.length)
    ? existing.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration }))
    : [];
  designer.currentPose = designer.keyframes.length ? Object.assign({}, designer.keyframes[0].pose) : Object.assign({}, DEFAULT_DESIGNER_POSE);
  if(designer.keyframes.length) designer.editingIdx = 0;
  designerTitleEl.textContent = 'Design a Move — ' + character.name;
  designerPlayBtn.textContent = 'Play sequence';
  designerPreviewLabel.textContent = 'Editing keyframe pose';
  // Physically move the one shared canvas into the designer panel — see the block comment above.
  designer.stageOriginalParent = canvas.parentNode;
  designer.stageOriginalNextSibling = canvas.nextSibling;
  designerPreviewMount.insertBefore(canvas, designerPreviewMount.firstChild);
  renderDesignerSliders();
  renderDesignerKeyframeList();
  designerOverlay.style.display = 'flex';
}

function closePoseDesignerOverlay(){
  designer.active = false; designer.playing = false;
  if(designer.stageOriginalParent){
    if(designer.stageOriginalNextSibling) designer.stageOriginalParent.insertBefore(canvas, designer.stageOriginalNextSibling);
    else designer.stageOriginalParent.appendChild(canvas);
  }
  designerOverlay.style.display = 'none';
}

function cancelPoseDesigner(){
  const seg = findSegment(designer.segId);
  // Only snap the action back to whatever it was before opening if this was a fresh "Design your
  // own..." pick (previousAction wasn't already 'customPose') — cancelling out of re-editing an
  // existing saved move should leave that existing move exactly as it was, not revert to some earlier
  // unrelated action.
  if(seg && designer.previousAction !== 'customPose' && seg.actions){
    seg.actions[designer.charId] = designer.previousAction;
  }
  closePoseDesignerOverlay();
  renderSegmentList();
  forceRedraw();
}

function saveDesignerMove(){
  const seg = findSegment(designer.segId);
  if(seg){
    if(!seg.customPoses) seg.customPoses = {};
    if(!seg.actions) seg.actions = {};
    if(designer.keyframes.length === 0){
      // Saved with nothing posed — there's nothing to animate, so don't leave the action pointed at an
      // empty custom move; fall back to idle exactly like evaluateScene already would at render time.
      seg.actions[designer.charId] = 'idle';
      delete seg.customPoses[designer.charId];
    } else {
      seg.customPoses[designer.charId] = { keyframes: designer.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })) };
      seg.actions[designer.charId] = 'customPose';
    }
  }
  closePoseDesignerOverlay();
  renderSegmentList();
  forceRedraw();
}

designerAddKeyframeBtn.addEventListener('click', ()=>{
  // editingIdx means "the sliders currently reflect this exact saved keyframe" — true right after
  // loading one (pencil button) or right after appending one (below), and invalidated the instant any
  // slider actually moves (see renderDesignerSliders' input handler). Without that invalidation this
  // branch would keep re-triggering after the FIRST Add forever, silently overwriting keyframe 0 on
  // every later click instead of ever appending a second/third pose — that was a real bug, fixed here
  // by making sure editingIdx only stays "live" while the sliders truly still match that keyframe.
  if(designer.editingIdx >= 0 && designer.editingIdx < designer.keyframes.length){
    designer.keyframes[designer.editingIdx].pose = Object.assign({}, designer.currentPose);
  } else {
    designer.keyframes.push({ pose: Object.assign({}, designer.currentPose), duration: 0.6 });
    designer.editingIdx = designer.keyframes.length - 1;
  }
  renderDesignerKeyframeList();
});
designerPlayBtn.addEventListener('click', ()=>{
  if(designer.keyframes.length < 2) return; // nothing to animate between yet
  designer.playing = !designer.playing;
  designer.elapsed = 0;
  designerPlayBtn.textContent = designer.playing ? 'Pause preview' : 'Play sequence';
  designerPreviewLabel.textContent = designer.playing ? 'Previewing full sequence (looping)' : 'Editing keyframe pose';
});
designerSaveBtn.addEventListener('click', saveDesignerMove);
designerCancelBtn.addEventListener('click', cancelPoseDesigner);
designerCloseBtn.addEventListener('click', cancelPoseDesigner);

// ---------- Move Library (saved to this browser via localStorage) ----------
// Mirrors the Character Library pattern above exactly (same localStorage approach, same
// select+load+delete shape) but for a reusable KEYFRAME SEQUENCE rather than a whole character — save
// a move once (e.g. "Boxing Jab-Cross"), then load it onto any character, in any scene, later.
const MOVE_LIB_KEY = 'stickmanMoveLibrary';
const designerMoveLibSelect = document.getElementById('designerMoveLibSelect');
const designerLoadMoveBtn = document.getElementById('designerLoadMoveBtn');
const designerDeleteMoveBtn = document.getElementById('designerDeleteMoveBtn');
const designerSaveToLibBtn = document.getElementById('designerSaveToLibBtn');
function loadMoveLibrary(){ try { return JSON.parse(localStorage.getItem(MOVE_LIB_KEY) || '[]'); } catch(e){ return []; } }
function saveMoveLibrary(list){ try { localStorage.setItem(MOVE_LIB_KEY, JSON.stringify(list)); } catch(e){} }
function refreshMoveLibSelect(){
  const list = loadMoveLibrary();
  designerMoveLibSelect.innerHTML = list.length
    ? list.map((m,i)=> '<option value="'+i+'">'+escapeHtml(m.label)+' ('+m.keyframes.length+' keyframes)</option>').join('')
    : '<option value="">(none saved yet)</option>';
}
designerSaveToLibBtn.addEventListener('click', ()=>{
  if(!designer.keyframes.length){ alert('Add at least one keyframe before saving this move to the library.'); return; }
  const name = (prompt('Name this move (e.g. "Boxing Jab-Cross"):', '') || '').trim();
  if(!name) return;
  const list = loadMoveLibrary();
  list.push({ label: name, keyframes: designer.keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration })) });
  saveMoveLibrary(list);
  refreshMoveLibSelect();
  designerMoveLibSelect.value = String(list.length - 1);
});
designerLoadMoveBtn.addEventListener('click', ()=>{
  const list = loadMoveLibrary();
  const idx = parseInt(designerMoveLibSelect.value, 10);
  if(isNaN(idx) || !list[idx]) return;
  designer.keyframes = list[idx].keyframes.map(k=>({ pose: Object.assign({}, k.pose), duration: k.duration }));
  designer.editingIdx = designer.keyframes.length ? 0 : -1;
  designer.currentPose = designer.keyframes.length ? Object.assign({}, designer.keyframes[0].pose) : Object.assign({}, DEFAULT_DESIGNER_POSE);
  designer.playing = false;
  designerPlayBtn.textContent = 'Play sequence'; designerPreviewLabel.textContent = 'Editing keyframe pose';
  renderDesignerSliders();
  renderDesignerKeyframeList();
});
designerDeleteMoveBtn.addEventListener('click', ()=>{
  const list = loadMoveLibrary();
  const idx = parseInt(designerMoveLibSelect.value, 10);
  if(isNaN(idx) || !list[idx]) return;
  if(!confirm('Delete the saved move "' + list[idx].label + '"? This cannot be undone.')) return;
  list.splice(idx, 1);
  saveMoveLibrary(list);
  refreshMoveLibSelect();
});
refreshMoveLibSelect();

// ---------- Design Your Own Scene: prominent entry point ----------
// A visible callout (rather than only a buried dropdown option) that jumps straight into the Pose
// Designer for the first character/segment — the fastest way to actually see what the feature does.
// Building a full multi-character scene from here is just: use this to try it once, then add more
// characters via the Characters panel and repeat per character/segment as described in the callout.
const startSceneDesignBtn = document.getElementById('startSceneDesignBtn');
if(startSceneDesignBtn){
  startSceneDesignBtn.addEventListener('click', ()=>{
    const seg = state.scene.timeline[0];
    const character = state.scene.characters[0];
    if(!seg || !character) return;
    const layoutEl = document.querySelector('.layout');
    if(layoutEl && layoutEl.scrollIntoView) layoutEl.scrollIntoView({ behavior:'smooth', block:'start' });
    openPoseDesigner(seg.id, character.id);
  });
}

// ---------- export ----------
exportBtn.addEventListener('click', ()=>{
  if(!canvas.captureStream || !window.MediaRecorder){
    alert('Video export needs a Chrome/Edge browser (MediaRecorder API). Playback still works everywhere.');
    return;
  }
  const totalDur = evaluateScene(state.scene, 0).totalDuration;
  elapsed = 0;
  state.playing = true;

  const stream = canvas.captureStream(30);
  let mime = 'video/webm;codecs=vp9';
  if(!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm;codecs=vp8';
  if(!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  recorder.ondataavailable = e => { if(e.data.size>0) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    previewVideo.src = url; previewVideo.style.display = 'block';
    downloadLink.href = url; downloadLink.download = 'stickman_video.webm';
    downloadLink.style.display = 'inline-block';
    downloadLink.textContent = 'Download stickman_video.webm';
    exportBtn.disabled = false; exportBtn.textContent = 'Export Video (.webm)';
  };
  exportBtn.disabled = true; exportBtn.textContent = 'Recording…';
  recorder.start();
  setTimeout(()=> recorder.stop(), totalDur*1000/state.speed + 250);
});

// ---------- init ----------
renderCharacterList();
renderAnimalList();
renderVehicleList();
renderSegmentList();
