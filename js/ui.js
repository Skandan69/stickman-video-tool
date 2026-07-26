// ---------- main render loop ----------
let elapsed = 0, lastNow = performance.now();
function loop(now){
  const dt = (now - lastNow)/1000;
  lastNow = now;
  if(state.playing) elapsed += dt*state.speed;
  renderFrame(evaluateScene(state.scene, elapsed));
  updateTimelineStripPlayhead();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// Forces an immediate repaint outside the rAF loop. Needed because rAF is throttled/paused by the
// browser when the tab isn't focused/visible (and doesn't tick at all while playback is paused), so
// changing a dropdown (Art Style, Background, Weather, Furniture, Food) or uploading a custom rig part
// could otherwise sit invisibly in state until the next natural animation frame. Every listener that
// mutates state.scene outside of normal playback should call this right after.
function forceRedraw(){ renderFrame(evaluateScene(state.scene, elapsed)); }

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
generateBtn.addEventListener('click', ()=>{
  const text = promptInput.value.trim();
  if(!text){ generateStatus.textContent = 'Type a description first.'; return; }
  const result = parsePromptToScene(text);
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
  generateStatus.textContent = 'Built ' + result.summary.actions.length + ' segment' + (result.summary.actions.length===1?'':'s') +
    ' (' + result.summary.actions.join(' → ') + '), ' + result.summary.totalDuration.toFixed(1) + 's total. Fine-tune in the Timeline panel.';
});
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
      customRigFieldsHtml(c) +
    '</div>'
  );
}

// "My Own Stickman" (custom art rig) upload fields — only meaningful when Art Style is set to
// "My Own Drawing" (js/styles.js), but shown on every card so the parts can be prepped in advance.
// Torso/arms/legs should be drawn pointing right; the head should be drawn upright/facing-forward.
const RIG_PARTS = [
  ['head', 'Head (upright)'], ['torso', 'Torso (pointing →)'],
  ['leftArm', 'Left arm (→)'], ['rightArm', 'Right arm (→)'],
  ['leftLeg', 'Left leg (→)'], ['rightLeg', 'Right leg (→)']
];
function customRigFieldsHtml(c){
  const rig = c.customRig || {};
  return (
    '<div class="field rig-fields">' +
      '<label>My Own Stickman (used when Art Style = "My Own Drawing")</label>' +
      '<div class="rig-grid">' +
        RIG_PARTS.map(([part,label])=>
          '<div class="rig-part">' +
            '<span>'+label+(rig[part] ? ' &#10003;' : '')+'</span>' +
            '<input type="file" accept="image/*" data-rigpart="'+part+'" data-cid="'+c.id+'">' +
          '</div>'
        ).join('') +
      '</div>' +
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
  characterList.querySelectorAll('[data-rigpart]').forEach(input=> input.addEventListener('change', onRigPartUpload));
  addCharacterBtn.disabled = state.scene.characters.length >= MAX_CHARACTERS;
}

function onRigPartUpload(e){
  const id = e.target.getAttribute('data-cid');
  const part = e.target.getAttribute('data-rigpart');
  const c = findCharacter(id);
  const file = e.target.files && e.target.files[0];
  if(!c || !file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    if(!c.customRig) c.customRig = { head:null, torso:null, leftArm:null, rightArm:null, leftLeg:null, rightLeg:null };
    c.customRig[part] = ev.target.result; // data: URL — JSON/localStorage-safe, image lazily loaded at draw time
    renderCharacterList(); // re-render so the checkmark next to this part shows up
    forceRedraw();
  };
  reader.readAsDataURL(file);
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
function clipOptionsHtml(selected){
  return CLIP_LIST.map(c=> `<option value="${c.id}" ${c.id===selected?'selected':''}>${c.label}</option>`).join('');
}

function renderSegmentList(){
  const total = evaluateScene(state.scene, 0).totalDuration;
  timelineTotal.textContent = 'Total: ' + total.toFixed(1) + 's (' + state.scene.timeline.length + ' segment' + (state.scene.timeline.length===1?'':'s') + ')';

  segmentList.innerHTML = state.scene.timeline.map((seg, idx)=>{
    const actionFieldsHtml = state.scene.characters.map(c=>
      '<div class="field"><label>' + escapeHtml(c.name) + '</label><select data-field="action_'+c.id+'" data-id="'+seg.id+'">'+clipOptionsHtml((seg.actions&&seg.actions[c.id])||'idle')+'</select></div>'
    ).join('');
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
      return '<div class="field"><label>' + escapeHtml(c.name) + ' direction</label><select data-field="direction_'+c.id+'" data-id="'+seg.id+'">' +
        '<option value="auto"'+(dirVal==='auto'?' selected':'')+'>Auto</option>' +
        '<option value="right"'+(dirVal==='right'?' selected':'')+'>Right &rarr;</option>' +
        '<option value="left"'+(dirVal==='left'?' selected':'')+'>&larr; Left</option>' +
        vertOptions +
        '</select></div>';
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
    const copy = { id: uid(), duration: seg.duration, actions: Object.assign({}, seg.actions), dialogue: seg.dialogue ? Object.assign({}, seg.dialogue) : null, background: seg.background, weather: seg.weather, directions: Object.assign({}, seg.directions), povCamera: !!seg.povCamera };
    state.scene.timeline.splice(idx+1, 0, copy);
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
    seg.actions[charId] = e.target.value;
    // Re-render so the direction select's Up/Down (climb/descend) options show up immediately when
    // switching a character into flyplane/flyhelicopter, and disappear when switching back out.
    renderSegmentList();
  } else if(field.indexOf('direction_') === 0){
    const charId = field.slice('direction_'.length);
    if(!seg.directions) seg.directions = {};
    seg.directions[charId] = e.target.value;
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
