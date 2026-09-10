// Project files and history are local to this tab. No account or remote service is used.
const projectNameInput = document.getElementById('projectName');
const projectStatus = document.getElementById('projectStatus');
const undoButton = document.getElementById('undoBtn');
const redoButton = document.getElementById('redoBtn');
const historyPast = [], historyFuture = [];
let historyBusy = false, historyTimer = null;

function cloneStudioValue(value){
  if(value instanceof HTMLImageElement) return value;
  if(Array.isArray(value)) return value.map(cloneStudioValue);
  if(value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,cloneStudioValue(v)]));
  return value;
}
function studioSnapshot(){ return {name:projectNameInput.value, scene:cloneStudioValue(state.scene)}; }
const studioImageCache = new WeakMap();
function studioImageSource(img){
  if(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(img.src)) return img.src;
  if(studioImageCache.has(img)) return studioImageCache.get(img);
  const buffer = document.createElement('canvas');
  buffer.width = img.naturalWidth || img.width; buffer.height = img.naturalHeight || img.height;
  buffer.getContext('2d').drawImage(img,0,0);
  const source = buffer.toDataURL('image/png'); studioImageCache.set(img,source);
  return source;
}
function snapshotText(snapshot){
  return JSON.stringify(snapshot, (key,value)=>value instanceof HTMLImageElement ? {studioImage:studioImageSource(value)} : value);
}
let historyCurrent = studioSnapshot();
let historyFingerprint = snapshotText(historyCurrent);
function refreshHistoryButtons(){
  undoButton.disabled = historyBusy || exportInProgress || !historyPast.length;
  redoButton.disabled = historyBusy || exportInProgress || !historyFuture.length;
}
function commitStudioHistory(){
  clearTimeout(historyTimer);
  if(historyBusy || exportInProgress || designer.active) return;
  const next = studioSnapshot(), fingerprint = snapshotText(next);
  if(fingerprint === historyFingerprint) return;
  historyPast.push(historyCurrent);
  // Images remain shared references in memory; snapshots copy only editable scene data.
  if(historyPast.length > 40) historyPast.shift();
  historyFuture.length = 0; historyCurrent = next; historyFingerprint = fingerprint;
  projectStatus.textContent = 'Unsaved changes · save your project to keep an editable copy.';
  refreshHistoryButtons();
}
function scheduleStudioHistory(){
  if(historyBusy || exportInProgress) return;
  clearTimeout(historyTimer); historyTimer = setTimeout(commitStudioHistory, 350);
}
function syncStudioScene(){
  elapsed = 0;
  for(const [id,key] of [['styleSelect','style'],['bgSelect','background'],['weatherSelect','weather'],['furnitureSelect','furniture'],['foodSelect','food']]) document.getElementById(id).value = state.scene[key];
  renderCharacterList(); renderAnimalList(); renderVehicleList(); renderCustomElementList(); renderSegmentList();
  forceRedraw(); updateStudioTransport();
  // Imported IDs must not collide with subsequently added segments, characters, or images.
  const allIds = [...state.scene.timeline,...state.scene.characters,...state.scene.customElements,...state.scene.animals,...state.scene.vehicles].map(v=>v.id);
  for(const id of allIds){
    const seg = /^seg(\d+)$/.exec(id), char = /^char(\d+)$/.exec(id);
    if(seg) uidCounter = Math.max(uidCounter, Number(seg[1])+1);
    if(char) charUidCounter = Math.max(charUidCounter, Number(char[1])+1);
  }
}
function applyStudioSnapshot(snapshot){
  state.scene = cloneStudioValue(snapshot.scene); projectNameInput.value = snapshot.name;
  syncStudioScene();
}
function travelHistory(forward){
  if(historyBusy || exportInProgress || designer.active) return;
  commitStudioHistory();
  const source = forward ? historyFuture : historyPast;
  if(!source.length) return;
  historyBusy = true;
  (forward ? historyPast : historyFuture).push(historyCurrent);
  historyCurrent = source.pop();
  applyStudioSnapshot(historyCurrent);
  historyFingerprint = snapshotText(historyCurrent); historyBusy = false;
  projectStatus.textContent = forward ? 'Change redone.' : 'Change undone.';
  refreshHistoryButtons();
}
undoButton.addEventListener('click',()=>travelHistory(false));
redoButton.addEventListener('click',()=>travelHistory(true));
for(const event of ['input','change','click','pointerup','drop']) document.addEventListener(event, scheduleStudioHistory);

function formatStudioTime(value){
  return Math.floor(value/60) + ':' + (value%60).toFixed(2).padStart(5,'0');
}
function studioDuration(){ return state.scene.timeline.reduce((sum,s)=>sum+Math.max(.1,s.duration),0); }
function updateStudioTransport(){
  const total = studioDuration(), time = total ? ((elapsed%total)+total)%total : 0;
  const range = document.getElementById('playheadRange');
  range.max = Math.max(0,total-.001); range.value = time;
  document.getElementById('timecode').textContent = formatStudioTime(time) + ' / ' + formatStudioTime(total);
}
function seekStudio(time){
  if(exportInProgress || designer.active) return;
  state.playing = false; playPauseBtn.textContent = 'Play';
  elapsed = clamp(time,0,Math.max(0,studioDuration()-.001));
  forceRedraw(); updateTimelineStripPlayhead(); updateStudioTransport();
}
document.getElementById('playheadRange').addEventListener('input',e=>seekStudio(Number(e.target.value)));
function stepStudio(direction){
  const total = studioDuration(), current = total ? ((elapsed%total)+total)%total : 0;
  seekStudio(current+direction/Number(document.getElementById('exportFps').value));
}
document.getElementById('previousFrameBtn').addEventListener('click',()=>stepStudio(-1));
document.getElementById('nextFrameBtn').addEventListener('click',()=>stepStudio(1));
document.getElementById('cancelExportBtn').addEventListener('click',()=>{ exportCancelled = true; });
document.querySelectorAll('.site-nav a').forEach(a=>a.addEventListener('click',e=>e.preventDefault()));

function saveStudioProject(){
  if(historyBusy || exportInProgress) return;
  commitStudioHistory();
  const data = {format:'stickman-studio', version:1, project:JSON.parse(snapshotText(studioSnapshot()))};
  const blob = new Blob([JSON.stringify(data)],{type:'application/json'});
  if(blob.size > 25000000){ projectStatus.textContent = 'Project exceeds 25 MB. Use smaller uploaded images before saving.'; return; }
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = (projectNameInput.value.replace(/[^a-z0-9_-]+/gi,'_').slice(0,80) || 'animation') + '.stickman.json';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  projectStatus.textContent = 'Project download prepared · includes your scene and uploaded images.';
}
document.getElementById('saveProjectBtn').addEventListener('click',saveStudioProject);
document.getElementById('openProjectBtn').addEventListener('click',()=>document.getElementById('projectFile').click());

// Validate file contents before any value reaches the legacy HTML templates or canvas renderer.
function validateStudioProject(data){
  function requireValue(test){ if(!test) throw new Error('This is not a valid Stickman Studio project.'); }
  requireValue(data && data.format === 'stickman-studio' && data.version === 1 && data.project);
  const project = data.project, scene = project.scene;
  requireValue(typeof project.name === 'string' && project.name.length <= 80 && scene && typeof scene === 'object');
  let nodes = 0;
  function walk(value,key,depth){
    requireValue(++nodes < 150000 && depth < 20);
    if(value === null || typeof value === 'boolean') return;
    if(typeof value === 'number'){ requireValue(Number.isFinite(value) && Math.abs(value) <= 1000000); return; }
    if(typeof value === 'string'){
      if(key === 'studioImage'){ requireValue(/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(value) && value.length <= 20000000); }
      else if(key === 'name' || key === 'text'){ requireValue(value.length <= 2000); }
      else requireValue(value.length <= 200 && /^[a-zA-Z0-9_# .:+-]*$/.test(value));
      return;
    }
    requireValue(value && typeof value === 'object');
    for(const [k,v] of Object.entries(value)){
      requireValue(/^[a-zA-Z0-9_]+$/.test(k) && !['__proto__','constructor','prototype'].includes(k));
      walk(v,k,depth+1);
    }
  }
  walk(scene,'scene',0);
  for(const key of ['characters','timeline','animals','vehicles','customElements']) requireValue(Array.isArray(scene[key]) && scene[key].length <= (key === 'timeline' ? 500 : 100));
  requireValue(scene.characters.length > 0 && scene.characters.length <= 30 && scene.timeline.length > 0);
  const idSet = new Set();
  for(const item of [...scene.characters,...scene.timeline,...scene.animals,...scene.vehicles,...scene.customElements]){
    requireValue(item && typeof item.id === 'string' && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(item.id) && !idSet.has(item.id)); idSet.add(item.id);
  }
  for(const c of scene.characters){
    requireValue(typeof c.name === 'string' && typeof c.sizeScale === 'number' && c.sizeScale > 0 && c.sizeScale <= 3);
    for(const key of ['skin','outfit','hairColor']) requireValue(typeof c[key] === 'string' && /^#[0-9a-f]{6}$/i.test(c[key]));
  }
  const record = v=>v && typeof v === 'object' && !Array.isArray(v);
  for(const seg of scene.timeline){
    requireValue(typeof seg.duration === 'number' && seg.duration >= .1 && seg.duration <= 120 && record(seg.actions));
    for(const clip of Object.values(seg.actions)) requireValue(typeof clip === 'string');
    for(const key of ['directions','dragTargets','customPoses','elementAnims']) requireValue(seg[key] == null || record(seg[key]));
    if(seg.dialogue) requireValue(typeof seg.dialogue.text === 'string' && typeof seg.dialogue.speakerId === 'string');
    for(const target of Object.values(seg.dragTargets || {})) requireValue(record(target) && typeof target.x === 'number');
    for(const move of Object.values(seg.customPoses || {})){
      requireValue(record(move) && Array.isArray(move.keyframes) && move.keyframes.length <= 500);
      for(const frame of move.keyframes) requireValue(frame && record(frame.pose) && typeof frame.duration === 'number' && frame.duration > 0 && (frame.hold === undefined || (typeof frame.hold === 'number' && frame.hold >= 0 && frame.hold <= 30)) && (frame.easing === undefined || ['smooth','linear','easeIn','easeOut','step'].includes(frame.easing)) && Object.values(frame.pose).every(v=>typeof v === 'number' || typeof v === 'boolean'));
    }
  }
  for(const key of ['background','weather','style','food','furniture']) requireValue(typeof scene[key] === 'string');
  const image = img=>img === null || (record(img) && typeof img.studioImage === 'string' && Object.keys(img).length === 1);
  requireValue(image(scene.customBgImage));
  for(const el of scene.customElements){ requireValue(image(el.img) && el.img); for(const key of ['x','y','scale','rotation']) requireValue(typeof el[key] === 'number'); }
  for(const list of [scene.animals,scene.vehicles]) for(const item of list){ requireValue(typeof item.type === 'string' && typeof item.sizeScale === 'number' && item.sizeScale > 0 && item.sizeScale <= 10); }
  return project;
}
async function hydrateStudioProject(project){
  const result = cloneStudioValue(project);
  async function readImage(value){
    if(!value) return null;
    return new Promise((resolve,reject)=>{
      const img = new Image();
      const timer = setTimeout(()=>reject(new Error('An image could not be loaded.')),10000);
      img.onload = ()=>{ clearTimeout(timer); resolve(img); };
      img.onerror = ()=>{ clearTimeout(timer); reject(new Error('An image in this project is damaged.')); };
      img.src = value.studioImage;
    });
  }
  result.scene.customBgImage = await readImage(result.scene.customBgImage);
  for(const el of result.scene.customElements) el.img = await readImage(el.img);
  return result;
}
async function openStudioProject(file){
  if(!file || historyBusy || exportInProgress) return;
  commitStudioHistory(); historyBusy = true;
  const previous = studioSnapshot();
  const controls = [...document.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled);
  controls.forEach(el=>{ el.disabled = true; });
  const wasPlaying = state.playing; state.playing = false;
  document.querySelector('.layout').inert = true;
  projectStatus.textContent = 'Opening project…';
  try {
    if(file.size > 25000000) throw new Error('Project files must be smaller than 25 MB.');
    const project = await hydrateStudioProject(validateStudioProject(JSON.parse(await file.text())));
    applyStudioSnapshot(project);
    historyPast.push(previous); if(historyPast.length > 40) historyPast.shift();
    historyFuture.length = 0; historyCurrent = studioSnapshot(); historyFingerprint = snapshotText(historyCurrent);
    projectStatus.textContent = 'Project opened. Your previous scene is available with Undo.';
  } catch(err){
    applyStudioSnapshot(previous);
    projectStatus.textContent = 'Could not open project. ' + (err.message || 'Please choose a valid project file.');
  } finally {
    historyBusy = false; state.playing = wasPlaying;
    controls.forEach(el=>{ el.disabled = false; });
    document.querySelector('.layout').inert = false; refreshHistoryButtons();
    document.getElementById('projectFile').value = '';
  }
}
document.getElementById('projectFile').addEventListener('change',e=>openStudioProject(e.target.files[0]));
document.addEventListener('keydown',e=>{
  if(exportInProgress || historyBusy || [...document.querySelectorAll('.designer-overlay')].some(el=>el.style.display !== 'none')) return;
  const editing = e.target.closest('input,textarea,select,[contenteditable="true"]');
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); saveStudioProject(); return; }
  if(editing) return;
  if((e.ctrlKey || e.metaKey) && ['z','y'].includes(e.key.toLowerCase())){ e.preventDefault(); travelHistory(e.shiftKey || e.key.toLowerCase() === 'y'); }
  else if(e.target.closest('button,a,summary,video')) return;
  else if(e.code === 'Space'){ e.preventDefault(); playPauseBtn.click(); }
  else if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); stepStudio(e.key === 'ArrowLeft' ? -1 : 1); }
});
updateStudioTransport(); refreshHistoryButtons();

// Artwork is transferred only after an explicit "Use in animation" action on this origin.
if(new URLSearchParams(location.search).get('artwork')==='1'){
  try{
    const src=localStorage.getItem('stickman.pendingArtwork');
    if(src && /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(src) && src.length<12000000){
      const img=new Image();img.onload=()=>{commitStudioHistory();state.scene.customElements.push({id:uid(),img,x:400,y:235,scale:Math.min(1,350/Math.max(img.naturalWidth,img.naturalHeight)),rotation:0});renderCustomElementList();renderSegmentList();forceRedraw();commitStudioHistory();projectStatus.textContent='Artwork added. Choose its animation in each timeline segment.';localStorage.removeItem('stickman.pendingArtwork');history.replaceState(null,'',location.pathname);};img.onerror=()=>{projectStatus.textContent='Could not open artwork. Upload its PNG under Custom Images.';};img.src=src;
    }
  }catch(e){projectStatus.textContent='Could not transfer artwork. Upload its PNG under Custom Images.';}
}
