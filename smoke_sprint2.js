// Sprint 3 smoke test: open character-list architecture (N characters, not just A/B).
// Loads index.html in jsdom, mocks canvas 2D + MediaRecorder, exercises the prompt parser,
// presets, dynamic character cards, segment editor, and character library. Fails loudly on
// any window error.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// The app now ships as separate js/*.js files (loaded via <script src> in dependency order)
// instead of one inline <script>. Concatenate them in the same order index.html loads them,
// so the eval'd code behaves identically to the real page.
const JS_FILES = ['humanTypes.js', 'helpers.js', 'character.js', 'emotions.js', 'backgrounds.js', 'weather.js', 'costumes.js', 'food.js', 'animals.js', 'vehicles.js', 'render.js', 'styles.js', 'poses.js', 'scene.js', 'ui.js'];
const inlineScript = JS_FILES.map(f => fs.readFileSync(path.join(__dirname, 'js', f), 'utf8')).join('\n;\n');
// Strip both the (now external) script tags and the stylesheet link — jsdom would otherwise try
// a real network fetch for styles.css, which is slow/flaky and irrelevant to the logic under test.
const htmlNoScript = html
  .replace(/<script[^>]*><\/script>\s*/g, '')
  .replace(/<link rel="stylesheet"[^>]*>\s*/g, '');

const errors = [];

function makeCtxRecorder(){
  return new Proxy({}, {
    get(target, prop){
      if(prop === 'measureText') return (s)=> ({ width: String(s).length * 7 });
      if(prop === 'createLinearGradient') return () => ({ addColorStop(){} });
      if(prop === 'roundRect') return undefined; // force fallback path to be exercised too
      if(typeof prop === 'string' && /^(canvas)$/.test(prop)) return {};
      if(prop in target) return target[prop];
      return function(){ return undefined; };
    },
    set(target, prop, value){ target[prop] = value; return true; }
  });
}

const dom = new JSDOM(htmlNoScript, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'https://stickman-video-tool.vercel.app/' });
const { window } = dom;

window.onerror = (msg, src, line, col, err) => {
  errors.push(String(msg) + ' @' + line + ':' + col + (err && err.stack ? '\n' + err.stack : ''));
};
window.addEventListener('error', (e) => {
  errors.push('window error event: ' + (e.error && e.error.stack ? e.error.stack : e.message));
});

const ctxRecorder = makeCtxRecorder();
HTMLCanvasElementProto = window.HTMLCanvasElement.prototype;
HTMLCanvasElementProto.getContext = function(){ return ctxRecorder; };
HTMLCanvasElementProto.captureStream = function(){ return { getTracks(){ return []; } }; };

window.MediaRecorder = function(stream, opts){
  this.mimeType = opts && opts.mimeType;
  this.ondataavailable = null; this.onstop = null;
  this.start = function(){};
  this.stop = function(){ if(this.ondataavailable) this.ondataavailable({data:{size:1}}); if(this.onstop) this.onstop(); };
};
window.MediaRecorder.isTypeSupported = function(){ return true; };
window.URL.createObjectURL = function(){ return 'blob:mock'; };

let rafQueue = [];
window.requestAnimationFrame = function(cb){ rafQueue.push(cb); return rafQueue.length; };
function flushRaf(n){
  n = n || 1;
  for(let i=0;i<n;i++){
    const q = rafQueue; rafQueue = [];
    q.forEach(cb => { try { cb(performance.now()); } catch(e){ errors.push('raf cb error: ' + e.stack); } });
  }
}
window.performance = window.performance || { now: () => Date.now() };

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
function loadLibFromLocalStorage(win){
  try { return JSON.parse(win.localStorage.getItem('stickmanCharacterLibrary') || '[]'); } catch(e){ return []; }
}

async function run(){
  window.eval(inlineScript); // run the app's IIFE now that canvas + MediaRecorder are mocked
  await wait(50);
  flushRaf(2);

  const doc = window.document;
  function byId(id){ return doc.getElementById(id); }
  function setValAndFire(el, val){ el.value = val; el.dispatchEvent(new window.Event('input', {bubbles:true})); el.dispatchEvent(new window.Event('change', {bubbles:true})); }
  function click(el){ el.dispatchEvent(new window.Event('click', {bubbles:true})); }
  function charCards(){ return Array.from(doc.querySelectorAll('#characterList .segment-card')); }
  function cardField(card, field){ return card.querySelector('[data-cfield="'+field+'"]'); }

  const results = [];

  // 0. Default boot state: 2 characters in the panel (talk preset default)
  flushRaf(2);
  if(charCards().length !== 2) errors.push('FAIL: expected 2 default characters on boot, got ' + charCards().length);

  // 1. Cafe scenario: sit, drink, phone, with explicit duration, single character
  setValAndFire(byId('promptInput'), 'A stickman walks into a cafe, sits down, drinks coffee, then talks on the phone for 2 minutes.');
  click(byId('generateBtn'));
  flushRaf(3);
  let status = byId('generateStatus').textContent;
  let total = byId('timelineTotal').textContent;
  results.push(['cafe scenario status', status]);
  results.push(['cafe scenario total', total]);
  if(!/walk.*sit.*drink.*phone/.test(status)) errors.push('FAIL: cafe scenario action order wrong: ' + status);
  if(!/120\.0s/.test(total)) errors.push('FAIL: cafe scenario duration not 120s: ' + total);
  if(byId('bgSelect').value !== 'cafe') errors.push('FAIL: cafe scenario background not cafe: ' + byId('bgSelect').value);
  // characters list should not have been forced down to 1 (generate only grows, never shrinks)
  results.push(['cafe scenario character count', String(charCards().length)]);

  // 2. Park scenario with two characters and default duration
  setValAndFire(byId('promptInput'), 'Two stickmen walk in the park and wave to each other.');
  click(byId('generateBtn'));
  flushRaf(3);
  status = byId('generateStatus').textContent;
  results.push(['park duo scenario status', status]);
  if(byId('bgSelect').value !== 'sky') errors.push('FAIL: park scenario background not sky: ' + byId('bgSelect').value);
  if(!/walk.*wave/.test(status)) errors.push('FAIL: park scenario action order wrong (expected walk then wave): ' + status);
  if(charCards().length < 2) errors.push('FAIL: park duo scenario should have at least 2 characters, got ' + charCards().length);

  // 3. Quoted dialogue on a phone call
  setValAndFire(byId('promptInput'), 'A stickman sits and talks on the phone saying "Can you hear me now?" for 30 seconds.');
  click(byId('generateBtn'));
  flushRaf(3);
  total = byId('timelineTotal').textContent;
  results.push(['quoted phone scenario total', total]);
  if(!/30\.0s/.test(total)) errors.push('FAIL: quoted phone scenario duration not 30s: ' + total);
  const segList = byId('segmentList').innerHTML;
  if(!segList.includes('Can you hear me now?')) errors.push('FAIL: quoted dialogue not carried into segment: missing quoted text');

  // 4. Empty prompt guard
  setValAndFire(byId('promptInput'), '   ');
  click(byId('generateBtn'));
  flushRaf(2);
  status = byId('generateStatus').textContent;
  if(!/Type a description/.test(status)) errors.push('FAIL: empty prompt guard did not trigger: ' + status);

  // 5. Fallback: no recognizable action -> idle single segment
  setValAndFire(byId('promptInput'), 'asdkjasldkj nothing recognizable here');
  click(byId('generateBtn'));
  flushRaf(3);
  status = byId('generateStatus').textContent;
  results.push(['fallback scenario status', status]);
  if(!/idle/.test(status)) errors.push('FAIL: fallback scenario did not default to idle: ' + status);

  // 6. All 5 presets still load without error
  const presetSelect = byId('presetSelect');
  ['talk','kite','walk','wave','dance'].forEach(key=>{
    presetSelect.value = key;
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(3);
  });
  results.push(['presets after prompt-generation', 'ok, no throw']);

  // 7. Exercise new clip rendering directly (sit/drink/phone) via a generated cafe scene
  setValAndFire(byId('promptInput'), 'A stickman sits in a cafe and drinks coffee for 10 seconds.');
  click(byId('generateBtn'));
  flushRaf(20); // multiple animation frames to exercise poseSit/poseDrinkCoffee/drawChairProp/drawCoffeeCupProp over time

  // 8. Add/remove/reorder segment still works post-generation
  const beforeCount = doc.querySelectorAll('#segmentList .segment-card').length;
  click(byId('addSegmentBtn'));
  flushRaf(2);
  const afterCount = doc.querySelectorAll('#segmentList .segment-card').length;
  if(afterCount !== beforeCount + 1) errors.push('FAIL: addSegmentBtn did not add a segment after prompt-generation (before=' + beforeCount + ' after=' + afterCount + ')');

  // 9. Export still works (mocked MediaRecorder)
  click(byId('exportBtn'));
  await wait(50);
  flushRaf(2);

  // 10. Reset to the 2-character talk preset for the multi-character tests below
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(3);
  if(charCards().length !== 2) errors.push('FAIL: talk preset should yield exactly 2 characters, got ' + charCards().length);

  // 11. Character customizer: change hairstyle/accessory/skin/eyes on character #1 (first card)
  let card0 = charCards()[0];
  setValAndFire(cardField(card0, 'hairStyle'), 'mohawk');
  setValAndFire(cardField(card0, 'accessory'), 'hat');
  setValAndFire(cardField(card0, 'skin'), '#8d5524');
  setValAndFire(cardField(card0, 'eyeStyle'), 'happy');
  flushRaf(10);
  results.push(['customizer applied', 'hairStyle=' + cardField(card0,'hairStyle').value + ' accessory=' + cardField(card0,'accessory').value]);

  // 12. Add a 3rd character via "+ Add character"
  click(byId('addCharacterBtn'));
  flushRaf(3);
  if(charCards().length !== 3) errors.push('FAIL: addCharacterBtn should bring count to 3, got ' + charCards().length);
  // segment editor should now show an action select for all 3 characters in each segment
  const seg0ActionSelects = doc.querySelectorAll('#segmentList .segment-card')[0].querySelectorAll('select[data-field^="action_"]');
  if(seg0ActionSelects.length !== 3) errors.push('FAIL: segment action selects should track character count (expected 3, got ' + seg0ActionSelects.length + ')');

  // 13. MAX_CHARACTERS cap: keep adding until the button disables itself, never exceed 8
  for(let i=0;i<8;i++){ click(byId('addCharacterBtn')); flushRaf(1); }
  if(charCards().length > 8) errors.push('FAIL: character count exceeded MAX_CHARACTERS (8), got ' + charCards().length);
  if(!byId('addCharacterBtn').disabled) errors.push('FAIL: addCharacterBtn should be disabled at the character cap');
  results.push(['max character cap', 'count=' + charCards().length + ' btnDisabled=' + byId('addCharacterBtn').disabled]);

  // 14. Remove a character, confirm segment editor shrinks back down and dialogue referencing it is cleared
  const countBeforeRemove = charCards().length;
  const removeBtn = charCards()[charCards().length - 1].querySelector('[data-cact="remove"]');
  click(removeBtn);
  flushRaf(3);
  if(charCards().length !== countBeforeRemove - 1) errors.push('FAIL: removing a character did not reduce the count (before=' + countBeforeRemove + ' after=' + charCards().length + ')');
  if(!byId('addCharacterBtn').disabled === false && charCards().length < 8) errors.push('FAIL: addCharacterBtn should re-enable once below the cap');

  // 15. Remove down to 1 character: the last remaining remove button must be disabled
  while(charCards().length > 1){
    const btn = charCards()[charCards().length - 1].querySelector('[data-cact="remove"]');
    if(btn.disabled) break;
    click(btn);
    flushRaf(1);
  }
  const lastCard = charCards()[0];
  if(!lastCard.querySelector('[data-cact="remove"]').disabled) errors.push('FAIL: remove button on the sole remaining character should be disabled');
  results.push(['single character remaining', 'count=' + charCards().length]);

  // 16. Character Library: save the remaining character, add a fresh one from the library, verify it appears
  const libBefore = loadLibFromLocalStorage(window);
  const saveBtn = charCards()[0].querySelector('[data-cact="save"]');
  click(saveBtn);
  const libAfterSave = loadLibFromLocalStorage(window);
  if(libAfterSave.length !== libBefore.length + 1) errors.push('FAIL: saving a character to the library did not add an entry (before=' + libBefore.length + ' after=' + libAfterSave.length + ')');
  byId('libSelect').value = String(libAfterSave.length - 1);
  const countBeforeAddFromLib = charCards().length;
  click(byId('addFromLibBtn'));
  flushRaf(3);
  if(charCards().length !== countBeforeAddFromLib + 1) errors.push('FAIL: "Add to Scene" from library did not add a character (before=' + countBeforeAddFromLib + ' after=' + charCards().length + ')');
  results.push(['library add-to-scene', 'count=' + charCards().length]);

  // 17. Delete from library
  const beforeLib = loadLibFromLocalStorage(window);
  byId('libSelect').value = '0';
  click(byId('deleteLibBtn'));
  const afterLib = loadLibFromLocalStorage(window);
  if(!(afterLib.length === beforeLib.length - 1)) errors.push('FAIL: delete from library did not reduce count (before=' + beforeLib.length + ' after=' + afterLib.length + ')');

  // 18. The exact reported bug: "a stickman jumps from a sofa and sits on it"
  setValAndFire(byId('promptInput'), 'a stickman jumps from a sofa and sits on it');
  click(byId('generateBtn'));
  flushRaf(3);
  status = byId('generateStatus').textContent;
  results.push(['sofa jump scenario status', status]);
  if(!/jump.*sit/.test(status)) errors.push('FAIL: sofa jump scenario should be jump then sit, got: ' + status);
  if(byId('furnitureSelect').value !== 'sofa') errors.push('FAIL: sofa not detected as furniture: ' + byId('furnitureSelect').value);
  flushRaf(15); // exercise poseJump + drawSofaProp over several frames, no throw expected

  // 19. Body types: mix a Kid (character 1) and Elderly (character 2) after a duo-generating prompt
  setValAndFire(byId('promptInput'), 'two stickmen sit and drink coffee then talk on the phone then jump');
  click(byId('generateBtn'));
  flushRaf(3);
  const bodyCards = charCards();
  if(cardField(bodyCards[0], 'bodyType').value !== 'adult') errors.push('FAIL: generate without an age keyword should reset bodyType to adult, got: ' + cardField(bodyCards[0],'bodyType').value);
  setValAndFire(cardField(bodyCards[0], 'bodyType'), 'child');
  if(bodyCards[1]) setValAndFire(cardField(bodyCards[1], 'bodyType'), 'elder');
  results.push(['body type mixed scenario', 'char0=' + cardField(bodyCards[0],'bodyType').value + ' char1=' + (bodyCards[1] ? cardField(bodyCards[1],'bodyType').value : 'n/a')]);
  flushRaf(40); // step through many frames so drink/phone (arm IK) and jump (bounceY) all run for both bodies

  // 19b. Size slider + emotion select: change on character #1, verify state + label + no render throw
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  let sizeCard0 = charCards()[0];
  const sizeInput = cardField(sizeCard0, 'sizeScale');
  setValAndFire(sizeInput, '1.4');
  flushRaf(3);
  const sizeLabel = sizeCard0.querySelector('[data-sizeval]');
  results.push(['size slider applied', 'value=' + sizeInput.value + ' label=' + (sizeLabel ? sizeLabel.textContent : 'MISSING')]);
  if(!sizeLabel || !/1\.40x/.test(sizeLabel.textContent)) errors.push('FAIL: size label did not update to 1.40x, got: ' + (sizeLabel && sizeLabel.textContent));
  const emotionOptionValues = Array.from(cardField(sizeCard0, 'emotion').options).map(o=>o.value);
  // Emotion library is large (100+ moods) — derive the expected id list straight from the app's own
  // EMOTION_LIST registry (window global) rather than hardcoding every id here, so this stays correct
  // as the registry grows. Still sanity-check a representative sample of old + new ids are present.
  const expectedEmotionIds = emotionOptionValues.slice();
  const sampleEmotionIds = ['neutral','happy','sad','angry','surprised','scared','sleepy','confused','laughing','proud','bored','excited','embarrassed',
    'joyful','ecstatic','curious','shocked','terrified','furious','jealous','heartbroken','exhausted','hungry','smug','brave','dizzy','inPain'];
  const missingEmotion = sampleEmotionIds.filter(id=> !emotionOptionValues.includes(id));
  if(missingEmotion.length) errors.push('FAIL: emotion select missing options: ' + missingEmotion.join(','));
  if(expectedEmotionIds.length < 90) errors.push('FAIL: expected 90+ emotions in EMOTION_LIST, got ' + expectedEmotionIds.length);
  expectedEmotionIds.forEach(em=>{
    setValAndFire(cardField(charCards()[0], 'emotion'), em);
    flushRaf(2); // render a couple frames per emotion so drawFace's per-emotion branch actually executes
  });
  results.push(['emotion cycle', 'ok, no throw, ' + expectedEmotionIds.length + ' emotions']);

  // 19c. Build (weight) select: cycle slim/average/heavy on character #1, verify no throw across body types
  ['slim','average','heavy'].forEach(b=>{
    setValAndFire(cardField(charCards()[0], 'build'), b);
    flushRaf(8);
  });
  const buildVal = cardField(charCards()[0], 'build').value;
  results.push(['build cycle', 'ok, no throw, final=' + buildVal]);
  if(buildVal !== 'heavy') errors.push('FAIL: build select did not retain last value, got: ' + buildVal);

  // 19d. New backgrounds registry: dropdown has all 9 entries, and the prompt parser routes to each
  const bgOptionValues = Array.from(byId('bgSelect').options).map(o=>o.value);
  const expectedBgIds = ['white','sky','grid','cafe','office','bedroom','street','beach','forest','gym','school','space','restaurant','farm','mountain','lake','desert','castle','stadium','underwater','airport','hospital','library','jungle','volcano','carnival','custom'];
  const missingBg = expectedBgIds.filter(id=> !bgOptionValues.includes(id));
  if(missingBg.length) errors.push('FAIL: bgSelect missing options: ' + missingBg.join(','));
  results.push(['background options', bgOptionValues.join(', ')]);

  const bgPrompts = {
    office: 'a stickman sits at a desk in the office and waves',
    bedroom: 'a stickman stands in the bedroom and waves',
    street: 'a stickman walks down the street and waves',
    beach: 'a stickman walks on the beach and waves'
  };
  Object.keys(bgPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), bgPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(5); // render a few frames so that background's draw() actually executes, not just gets selected
    const got = byId('bgSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+bgPrompts[expectedId]+'" expected background '+expectedId+', got '+got);
  });
  results.push(['background prompt routing', 'ok, no throw']);

  const newBgPrompts = {
    forest: 'a stickman walks through the forest and waves',
    gym: 'a stickman works out at the gym and waves',
    school: 'a stickman sits in the classroom and waves',
    space: 'a stickman floats in outer space and waves',
    restaurant: 'a stickman eats at the restaurant',
    farm: 'a stickman walks on the farm and waves'
  };
  Object.keys(newBgPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), newBgPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(5);
    const got = byId('bgSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+newBgPrompts[expectedId]+'" expected background '+expectedId+', got '+got);
  });
  results.push(['new background prompt routing', 'ok, no throw']);

  const newerBgPrompts = {
    mountain: 'a stickman climbs the mountain and waves',
    lake: 'a stickman sits by the lake and waves',
    desert: 'a stickman walks in the desert and waves',
    castle: 'a stickman stands at the castle and waves',
    stadium: 'a stickman waves at the stadium',
    underwater: 'a stickman swims underwater'
  };
  Object.keys(newerBgPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), newerBgPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(5);
    const got = byId('bgSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+newerBgPrompts[expectedId]+'" expected background '+expectedId+', got '+got);
  });
  results.push(['newer background prompt routing', 'ok, no throw']);

  const newestBgPrompts = {
    airport: 'a stickman waits at the airport and waves',
    hospital: 'a stickman stands in the hospital and waves',
    library: 'a stickman reads in the library',
    jungle: 'a stickman walks through the jungle and waves',
    volcano: 'a stickman stands near the volcano and waves',
    carnival: 'a stickman has fun at the carnival and waves'
  };
  Object.keys(newestBgPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), newestBgPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(5);
    const got = byId('bgSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+newestBgPrompts[expectedId]+'" expected background '+expectedId+', got '+got);
  });
  results.push(['newest background prompt routing', 'ok, no throw']);

  // Weather registry: dropdown populated, prompt parser routes explicit mentions, and each overlay
  // renders several frames on top of the scene without throwing.
  const weatherOptionValues = Array.from(byId('weatherSelect').options).map(o=>o.value);
  const expectedWeatherIds = ['none','rain','snow','fog','sunny','autumn'];
  const missingWeather = expectedWeatherIds.filter(id=> !weatherOptionValues.includes(id));
  if(missingWeather.length) errors.push('FAIL: weatherSelect missing options: ' + missingWeather.join(','));
  const weatherPrompts = {
    rain: 'a stickman walks in the rain',
    snow: 'a stickman walks in the snow',
    fog: 'a stickman walks through the fog',
    sunny: 'a stickman stands in the sunshine',
    autumn: 'a stickman walks through autumn leaves'
  };
  Object.keys(weatherPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), weatherPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(6); // several frames so drawWeatherOverlay's per-effect branch actually executes
    const got = byId('weatherSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+weatherPrompts[expectedId]+'" expected weather '+expectedId+', got '+got);
  });
  results.push(['weather overlays', 'ok, no throw, rain/snow/fog/sunny/autumn all routed + rendered']);
  byId('weatherSelect').value = 'none';
  byId('weatherSelect').dispatchEvent(new window.Event('change', {bubbles:true}));

  // exercise every new animal/vehicle type's draw() at least once (manual add, not just dropdown presence)
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  ['horse','cow','sheep','elephant','fish','snake','chicken','pig','monkey','lion'].forEach(type=>{
    byId('animalTypeSelect').value = type;
    click(byId('addAnimalBtn'));
  });
  flushRaf(12);
  ['truck','motorcycle','train','airplane','boat','helicopter','scooter'].forEach(type=>{
    byId('vehicleTypeSelect').value = type;
    click(byId('addVehicleBtn'));
  });
  flushRaf(12);
  results.push(['new animal/vehicle types render', 'ok, no throw, animals=' + doc.querySelectorAll('#animalList .segment-card').length + ' vehicles=' + doc.querySelectorAll('#vehicleList .segment-card').length]);

  // 19e. Costumes registry: applying a costume updates outfit + accessory, and each new accessory
  // shape (chef hat / police cap / headband / stethoscope) renders without throwing.
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  const costCard = charCards()[0];
  const outfitBefore = cardField(costCard, 'outfit').value;
  setValAndFire(cardField(costCard, 'costume'), 'chef');
  flushRaf(5);
  let refreshedCard = charCards()[0]; // re-render replaced the DOM node
  const outfitAfter = cardField(refreshedCard, 'outfit').value;
  const accessoryAfter = cardField(refreshedCard, 'accessory').value;
  if(accessoryAfter !== 'chefhat') errors.push('FAIL: applying Chef costume did not set accessory to chefhat, got: ' + accessoryAfter);
  if(outfitAfter === outfitBefore) errors.push('FAIL: applying Chef costume did not change outfit color');
  results.push(['costume applied', 'outfit ' + outfitBefore + ' -> ' + outfitAfter + ', accessory=' + accessoryAfter]);
  ['doctor','police','headband','crown','backpack','scarf','mask','necktie','bowtie','earrings','wristwatch'].forEach(accId=>{
    // headband/crown/backpack/scarf/mask/necktie/bowtie/earrings/wristwatch aren't costume ids but ARE
    // accessory ids — exercise directly
    setValAndFire(cardField(charCards()[0], 'accessory'), accId);
    flushRaf(6);
  });
  results.push(['new accessory shapes', 'ok, no throw']);

  const hairOptionValues = Array.from(cardField(charCards()[0], 'hairStyle').options).map(o=>o.value);
  const expectedHairIds = ['none','short','long','ponytail','mohawk','curly','afro','bun','braids','buzzcut','spiky','pigtails','dreadlocks','undercut','sidepart','waves','halfup','fauxhawk','cornrows','bowlcut'];
  const missingHair = expectedHairIds.filter(id=> !hairOptionValues.includes(id));
  if(missingHair.length) errors.push('FAIL: hairStyle select missing options: ' + missingHair.join(','));
  expectedHairIds.forEach(id=>{ setValAndFire(cardField(charCards()[0], 'hairStyle'), id); flushRaf(4); });
  results.push(['new hairstyles', 'ok, ' + expectedHairIds.length + ' styles, no throw']);

  const eyeOptionValues = Array.from(cardField(charCards()[0], 'eyeStyle').options).map(o=>o.value);
  const expectedEyeIds = ['dot','round','happy','closed','star','heart','wink','sleepy','angry','spiral'];
  const missingEye = expectedEyeIds.filter(id=> !eyeOptionValues.includes(id));
  if(missingEye.length) errors.push('FAIL: eyeStyle select missing options: ' + missingEye.join(','));
  expectedEyeIds.forEach(id=>{ setValAndFire(cardField(charCards()[0], 'eyeStyle'), id); flushRaf(4); });
  results.push(['new eye styles', 'ok, ' + expectedEyeIds.length + ' styles, no throw']);

  const accessoryOptionValues = Array.from(cardField(charCards()[0], 'accessory').options).map(o=>o.value);
  const expectedAccessoryIds = ['none','glasses','hat','bag','chefhat','police','headband','doctor','crown','backpack','scarf','mask','cape','wizardhat','helmet','necktie','bowtie','earrings','wristwatch'];
  const missingAccessory = expectedAccessoryIds.filter(id=> !accessoryOptionValues.includes(id));
  if(missingAccessory.length) errors.push('FAIL: accessory select missing options: ' + missingAccessory.join(','));

  const skinOptionValues = Array.from(cardField(charCards()[0], 'skin').options).map(o=>o.value);
  if(skinOptionValues.length !== 6) errors.push('FAIL: skin select expected 6 tones, got ' + skinOptionValues.length);
  results.push(['skin tone options', 'count=' + skinOptionValues.length]);

  const costumeOptionValues = Array.from(cardField(charCards()[0], 'costume').options).map(o=>o.value);
  const expectedCostumeIds = ['none','doctor','chef','police','athlete','student','teacher','firefighter','scientist','artist','superhero','astronaut','pirate','wizard','ninja','knight','robot','clown','fairy','vampire'];
  const missingCostume = expectedCostumeIds.filter(id=> !costumeOptionValues.includes(id));
  if(missingCostume.length) errors.push('FAIL: costume select missing options: ' + missingCostume.join(','));
  setValAndFire(cardField(charCards()[0], 'costume'), 'firefighter');
  flushRaf(5);
  const firefighterCard = charCards()[0];
  if(cardField(firefighterCard, 'accessory').value !== 'hat') errors.push('FAIL: Firefighter costume did not set accessory to hat, got: ' + cardField(firefighterCard,'accessory').value);
  setValAndFire(cardField(charCards()[0], 'costume'), 'superhero');
  flushRaf(6);
  const superheroCard = charCards()[0];
  if(cardField(superheroCard, 'accessory').value !== 'cape') errors.push('FAIL: Superhero costume did not set accessory to cape, got: ' + cardField(superheroCard,'accessory').value);
  results.push(['new costumes', 'ok, ' + expectedCostumeIds.length + ' costumes, firefighter accessory=' + cardField(firefighterCard,'accessory').value + ' superhero accessory=' + cardField(superheroCard,'accessory').value]);

  ['robot','clown','fairy','vampire'].forEach(cid=>{
    setValAndFire(cardField(charCards()[0], 'costume'), cid);
    flushRaf(6);
  });
  results.push(['newer costumes render', 'ok, no throw for robot/clown/fairy/vampire']);

  // 19f. Food registry: dropdown populated, and prompt parser routes explicit food mentions,
  // then step through frames with 'eat' active so drawFoodProp actually executes, no throw.
  const foodOptionValues = Array.from(byId('foodSelect').options).map(o=>o.value);
  const expectedFoodIds = ['sandwich','apple','pizza','burger','hotdog','icecream','cake','donut','taco','sushi','popcorn','waffle','watermelon','banana','cookie','pretzel'];
  const missingFood = expectedFoodIds.filter(id=> !foodOptionValues.includes(id));
  if(missingFood.length) errors.push('FAIL: foodSelect missing options: ' + missingFood.join(','));

  setValAndFire(byId('promptInput'), 'a stickman sits and eats a pizza');
  click(byId('generateBtn'));
  flushRaf(3);
  status = byId('generateStatus').textContent;
  if(!/eat/.test(status)) errors.push('FAIL: "eats a pizza" prompt did not produce an eat segment: ' + status);
  if(byId('foodSelect').value !== 'pizza') errors.push('FAIL: "eats a pizza" prompt did not set food to pizza, got: ' + byId('foodSelect').value);
  flushRaf(20); // several frames so poseEat's arm-IK + drawFoodProp both run repeatedly
  results.push(['eat/food scenario', 'status=' + status + ' food=' + byId('foodSelect').value]);

  const newFoodPrompts = { taco: 'a stickman eats a taco', sushi: 'a stickman eats sushi', popcorn: 'a stickman eats popcorn', waffle: 'a stickman eats a waffle' };
  Object.keys(newFoodPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), newFoodPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(6);
    const got = byId('foodSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+newFoodPrompts[expectedId]+'" expected food '+expectedId+', got '+got);
  });
  results.push(['new food prompt detection', 'ok, no throw']);

  const newerFoodPrompts = { watermelon: 'a stickman eats watermelon', banana: 'a stickman eats a banana', cookie: 'a stickman eats a cookie', pretzel: 'a stickman eats a pretzel' };
  Object.keys(newerFoodPrompts).forEach(expectedId=>{
    setValAndFire(byId('promptInput'), newerFoodPrompts[expectedId]);
    click(byId('generateBtn'));
    flushRaf(6);
    const got = byId('foodSelect').value;
    if(got !== expectedId) errors.push('FAIL: prompt "'+newerFoodPrompts[expectedId]+'" expected food '+expectedId+', got '+got);
  });
  results.push(['newer food prompt detection', 'ok, no throw']);

  // manually cycle every food item while an eat segment is active, to exercise each draw() once
  ['sandwich','apple','burger','hotdog','icecream','cake','donut','taco','sushi','popcorn','waffle','watermelon','banana','cookie','pretzel'].forEach(id=>{
    byId('foodSelect').value = id;
    byId('foodSelect').dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(10);
  });
  results.push(['food item cycle', 'ok, no throw']);

  // 19f2. New solo actions: kick/throw/swim/sleep/read/clap/bow all route from prompts and render
  // several frames without throwing. 'read' is seated (chair prop) with a book prop between hands;
  // 'sleep' shows the Zzz prop above the head.
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  const soloActionPrompts = {
    kick: 'a stickman kicks a ball',
    throw: 'a stickman throws a ball',
    swim: 'a stickman swims in the pool',
    sleep: 'a stickman sleeps on the floor',
    read: 'a stickman reads a book',
    clap: 'a stickman claps for the crowd',
    bow: 'a stickman bows to the audience'
  };
  Object.keys(soloActionPrompts).forEach(clipId=>{
    setValAndFire(byId('promptInput'), soloActionPrompts[clipId]);
    click(byId('generateBtn'));
    flushRaf(10);
    status = byId('generateStatus').textContent;
    if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+soloActionPrompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
  });
  results.push(['new solo actions', 'ok, kick/throw/swim/sleep/read/clap/bow all routed + rendered']);

  const solo2Prompts = {
    yoga: 'a stickman does yoga',
    cry: 'a stickman cries sadly',
    point: 'a stickman points at something',
    salute: 'a stickman salutes',
    shrug: 'a stickman shrugs',
    stretch: 'a stickman stretches',
    fall: 'a stickman falls down'
  };
  Object.keys(solo2Prompts).forEach(clipId=>{
    setValAndFire(byId('promptInput'), solo2Prompts[clipId]);
    click(byId('generateBtn'));
    flushRaf(10);
    status = byId('generateStatus').textContent;
    if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+solo2Prompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
  });
  results.push(['newer solo actions', 'ok, yoga/cry/point/salute/shrug/stretch/fall all routed + rendered']);

  const solo3Prompts = {
    pushup: 'a stickman does push-ups',
    cheer: 'a stickman cheers for the team',
    drum: 'a stickman plays the drums',
    cartwheel: 'a stickman does a cartwheel',
    paint: 'a stickman paints a picture',
    write: 'a stickman writes a letter',
    fish: 'a stickman goes fishing by the lake'
  };
  Object.keys(solo3Prompts).forEach(clipId=>{
    setValAndFire(byId('promptInput'), solo3Prompts[clipId]);
    click(byId('generateBtn'));
    flushRaf(10);
    status = byId('generateStatus').textContent;
    if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+solo3Prompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
  });
  results.push(['newest solo actions', 'ok, pushup/cheer/drum/cartwheel/paint/write/fish all routed + rendered']);

  const propPosePrompts = {
    guitar: 'a stickman plays the guitar',
    umbrella: 'a stickman holds an umbrella',
    skateboard: 'a stickman rides a skateboard',
    laptop: 'a stickman types on a laptop',
    camera: 'a stickman takes a photo'
  };
  Object.keys(propPosePrompts).forEach(clipId=>{
    setValAndFire(byId('promptInput'), propPosePrompts[clipId]);
    click(byId('generateBtn'));
    flushRaf(10); // several frames so the new prop draw functions (guitar/umbrella/skateboard/laptop/camera) actually execute
    status = byId('generateStatus').textContent;
    if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+propPosePrompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
  });
  results.push(['new prop poses', 'ok, guitar/umbrella/skateboard/laptop/camera all routed + rendered']);

  // 19g. Interactive action library: fight/argue/hug/highfive/run should each route from a prompt,
  // auto-detect two characters, pair BOTH characters onto the same clip (not partner=idle), and
  // render several frames without throwing (exercises the new pose functions).
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  const interactivePrompts = {
    fight: 'two stickmen fight in the street',
    argue: 'a stickman and his friend argue loudly',
    hug: 'two stickmen hug each other',
    highfive: 'two stickmen high five',
    shake: 'two stickmen shake hands'
  };
  Object.keys(interactivePrompts).forEach(clipId=>{
    setValAndFire(byId('promptInput'), interactivePrompts[clipId]);
    click(byId('generateBtn'));
    flushRaf(10); // several frames to exercise the new pose math (poseFight/poseArgue/poseHug/poseHighFive)
    status = byId('generateStatus').textContent;
    if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+interactivePrompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
    // both characters must share the interactive clip, not { 0: clipId, 1: 'idle' }
    const seg0Selects = doc.querySelectorAll('#segmentList .segment-card')[0].querySelectorAll('select[data-field^="action_"]');
    const segVals = Array.from(seg0Selects).map(s=>s.value);
    if(!(segVals.length >= 2 && segVals[0] === clipId && segVals[1] === clipId)) errors.push('FAIL: '+clipId+' scenario should pair both characters onto the same clip, got: ' + segVals.join(','));
  });
  results.push(['interactive action library', 'ok, fight/argue/hug/highfive/shake all routed + paired + rendered']);

  // 19h. Run action: single-character prompt should NOT force a second character, and should render.
  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  setValAndFire(byId('promptInput'), 'a stickman runs across the park');
  click(byId('generateBtn'));
  flushRaf(10);
  status = byId('generateStatus').textContent;
  if(!/run/.test(status)) errors.push('FAIL: "runs across the park" did not produce a run segment: ' + status);
  results.push(['run action', 'status=' + status]);

  // 19i. Animals panel: dropdown populated from registry, manual add/remove, and prompt-based
  // detection places the right animal type(s) into the scene and renders several frames, no throw.
  const animalTypeOptionValues = Array.from(byId('animalTypeSelect').options).map(o=>o.value);
  const expectedAnimalIds = ['dog','cat','bird','rabbit','horse','cow','sheep','elephant','fish','snake','chicken','pig','monkey','lion','turtle','frog','deer','bear','penguin','owl','giraffe','zebra','kangaroo','panda','fox','wolf'];
  const missingAnimal = expectedAnimalIds.filter(id=> !animalTypeOptionValues.includes(id));
  if(missingAnimal.length) errors.push('FAIL: animalTypeSelect missing options: ' + missingAnimal.join(','));

  const animalCountBefore = doc.querySelectorAll('#animalList .segment-card').length;
  byId('animalTypeSelect').value = 'cat';
  click(byId('addAnimalBtn'));
  flushRaf(3);
  const animalCountAfterAdd = doc.querySelectorAll('#animalList .segment-card').length;
  if(animalCountAfterAdd !== animalCountBefore + 1) errors.push('FAIL: addAnimalBtn did not add an animal (before=' + animalCountBefore + ' after=' + animalCountAfterAdd + ')');
  const animalRemoveBtn = doc.querySelectorAll('#animalList .segment-card')[0].querySelector('[data-aact="remove"]');
  click(animalRemoveBtn);
  flushRaf(3);
  const animalCountAfterRemove = doc.querySelectorAll('#animalList .segment-card').length;
  if(animalCountAfterRemove !== animalCountAfterAdd - 1) errors.push('FAIL: animal remove button did not reduce count (before=' + animalCountAfterAdd + ' after=' + animalCountAfterRemove + ')');
  results.push(['animal manual add/remove', 'ok, before=' + animalCountBefore + ' afterAdd=' + animalCountAfterAdd + ' afterRemove=' + animalCountAfterRemove]);

  setValAndFire(byId('promptInput'), 'a stickman walks in the park with his dog and a cat nearby');
  click(byId('generateBtn'));
  flushRaf(15); // several frames so drawAnimalProp actually executes for both animals
  const animalCards = doc.querySelectorAll('#animalList .segment-card');
  if(animalCards.length !== 2) errors.push('FAIL: "dog...and a cat" prompt should place exactly 2 animals, got ' + animalCards.length);
  results.push(['animal prompt detection', 'count=' + animalCards.length]);

  // 19i-bis. Newly added animal types (turtle/frog/deer/bear/penguin/owl): manually add each one via
  // the dropdown and render several frames so drawAnimalProp actually executes their draw fn, no throw.
  ['turtle','frog','deer','bear','penguin','owl','giraffe','zebra','kangaroo','panda','fox','wolf'].forEach(newAnimalId=>{
    byId('animalTypeSelect').value = newAnimalId;
    click(byId('addAnimalBtn'));
    flushRaf(6);
  });
  results.push(['new animal types render', 'ok, no throw for turtle/frog/deer/bear/penguin/owl/giraffe/zebra/kangaroo/panda/fox/wolf']);

  // 19j. Vehicles panel: dropdown populated from registry, manual add/remove, and prompt-based
  // detection places the right vehicle type(s) into the scene and renders several frames, no throw.
  const vehicleTypeOptionValues = Array.from(byId('vehicleTypeSelect').options).map(o=>o.value);
  const expectedVehicleIds = ['car','bicycle','bus','truck','motorcycle','train','airplane','boat','helicopter','scooter','tractor','ambulance','submarine','hotairballoon'];
  const missingVehicle = expectedVehicleIds.filter(id=> !vehicleTypeOptionValues.includes(id));
  if(missingVehicle.length) errors.push('FAIL: vehicleTypeSelect missing options: ' + missingVehicle.join(','));

  const vehicleCountBefore = doc.querySelectorAll('#vehicleList .segment-card').length;
  byId('vehicleTypeSelect').value = 'bicycle';
  click(byId('addVehicleBtn'));
  flushRaf(3);
  const vehicleCountAfterAdd = doc.querySelectorAll('#vehicleList .segment-card').length;
  if(vehicleCountAfterAdd !== vehicleCountBefore + 1) errors.push('FAIL: addVehicleBtn did not add a vehicle (before=' + vehicleCountBefore + ' after=' + vehicleCountAfterAdd + ')');
  const vehicleRemoveBtn = doc.querySelectorAll('#vehicleList .segment-card')[0].querySelector('[data-vact="remove"]');
  click(vehicleRemoveBtn);
  flushRaf(3);
  const vehicleCountAfterRemove = doc.querySelectorAll('#vehicleList .segment-card').length;
  if(vehicleCountAfterRemove !== vehicleCountAfterAdd - 1) errors.push('FAIL: vehicle remove button did not reduce count (before=' + vehicleCountAfterAdd + ' after=' + vehicleCountAfterRemove + ')');
  results.push(['vehicle manual add/remove', 'ok, before=' + vehicleCountBefore + ' afterAdd=' + vehicleCountAfterAdd + ' afterRemove=' + vehicleCountAfterRemove]);

  // "rides a bicycle" now maps to the character's own ridebike action (task #16) rather than a
  // decorative prop, so only the bus (mentioned separately, not ridden) should still spawn as a
  // decorative vehicle — this is an intentional behavior change from when riding wasn't a real action.
  setValAndFire(byId('promptInput'), 'a stickman rides a bicycle down the street past a bus');
  click(byId('generateBtn'));
  flushRaf(15); // several frames so drawVehicleProp actually executes for both vehicles
  const vehicleCards = doc.querySelectorAll('#vehicleList .segment-card');
  if(vehicleCards.length !== 1) errors.push('FAIL: "rides a bicycle...past a bus" should place exactly 1 decorative vehicle (the bus; the bicycle is ridden), got ' + vehicleCards.length);
  status = byId('generateStatus').textContent;
  if(!/ridebike/.test(status)) errors.push('FAIL: "rides a bicycle" did not produce a ridebike segment: ' + status);
  results.push(['vehicle prompt detection', 'count=' + vehicleCards.length]);

  // 19j-bis. Newly added vehicle types (tractor/ambulance/submarine/hotairballoon): manually add each
  // via the dropdown and render several frames so drawVehicleProp actually executes their draw fn.
  ['tractor','ambulance','submarine','hotairballoon'].forEach(newVehicleId=>{
    byId('vehicleTypeSelect').value = newVehicleId;
    click(byId('addVehicleBtn'));
    flushRaf(6);
  });
  results.push(['new vehicle types render', 'ok, no throw for tractor/ambulance/submarine/hotairballoon']);

  // 19k. Art Style registry: dropdown has all 4 styles, switching styles re-renders several frames
  // for each without throwing (this is the real test — each style has its own canvas draw path),
  // and hand-held props (coffee cup) still attach correctly since every style returns {leftHand,...}.
  const styleOptionValues = Array.from(byId('styleSelect').options).map(o=>o.value);
  const expectedStyleIds = ['bold','neon','clipart','sketchy'];
  const missingStyle = expectedStyleIds.filter(id=> !styleOptionValues.includes(id));
  if(missingStyle.length) errors.push('FAIL: styleSelect missing options: ' + missingStyle.join(','));
  if(styleOptionValues.includes('custom')) errors.push('FAIL: styleSelect still has removed "custom" (My Own Drawing) option');

  presetSelect.value = 'talk';
  presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);
  setValAndFire(byId('promptInput'), 'a stickman sits and drinks coffee');
  click(byId('generateBtn'));
  flushRaf(3);
  expectedStyleIds.forEach(styleId=>{
    byId('styleSelect').value = styleId;
    byId('styleSelect').dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(8); // several frames per style so its drawStickman path actually executes, incl. coffee cup prop
  });
  if(byId('styleSelect').value !== 'sketchy') errors.push('FAIL: styleSelect did not retain last value, got: ' + byId('styleSelect').value);
  results.push(['art style cycle', 'ok, no throw, final=' + byId('styleSelect').value]);

  if(doc.querySelectorAll('[data-rigpart]').length) errors.push('FAIL: removed "My Own Stickman" rig upload inputs are still present in the DOM');

  // reset to bold for the remaining tests below (keeps prior assumptions about visual defaults intact)
  byId('styleSelect').value = 'bold';
  byId('styleSelect').dispatchEvent(new window.Event('change', {bubbles:true}));
  flushRaf(2);

  // 20. Prompt-based age detection
  setValAndFire(byId('promptInput'), 'an old man sits on the sofa');
  click(byId('generateBtn'));
  flushRaf(5);
  if(cardField(charCards()[0], 'bodyType').value !== 'elder') errors.push('FAIL: "old man" prompt did not set bodyType to elder: ' + cardField(charCards()[0],'bodyType').value);
  setValAndFire(byId('promptInput'), 'a little kid waves hello');
  click(byId('generateBtn'));
  flushRaf(5);
  if(cardField(charCards()[0], 'bodyType').value !== 'child') errors.push('FAIL: "little kid" prompt did not set bodyType to child: ' + cardField(charCards()[0],'bodyType').value);

  // 21. Real point-to-point movement (task #15): built directly against window.evaluateScene with a
  // minimal hand-built scene, since `state`/`makeSegment` etc. are declared with function/no-hoisting
  // quirks that DO attach to window (function declarations), unlike the app's own `const state` (does
  // not attach to window in jsdom) — this sidesteps that and tests the actual movement math precisely.
  {
    const walker = window.makeCharacter({ name:'Walker' });
    const baseScene = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    const walkScene = Object.assign({}, baseScene, { characters:[walker], timeline:[ window.makeSegment(4, { [walker.id]:'walk' }, null) ] });
    const wx0 = window.evaluateScene(walkScene, 0).characters[0].x;
    const wx1 = window.evaluateScene(walkScene, 2).characters[0].x;
    if(Math.abs(wx1 - wx0) < 20) errors.push('FAIL: walk clip should translate x over time, got x(t=0)='+wx0+' x(t=2)='+wx1);

    const idleScene = Object.assign({}, baseScene, { characters:[walker], timeline:[ window.makeSegment(4, { [walker.id]:'idle' }, null) ] });
    const ix0 = window.evaluateScene(idleScene, 0).characters[0].x;
    const ix1 = window.evaluateScene(idleScene, 2).characters[0].x;
    if(Math.abs(ix1 - ix0) > 0.5) errors.push('FAIL: idle clip should NOT translate x, got x(t=0)='+ix0+' x(t=2)='+ix1);

    const twoSegScene = Object.assign({}, baseScene, { characters:[walker], timeline:[
      window.makeSegment(3, { [walker.id]:'walk' }, null), window.makeSegment(3, { [walker.id]:'walk' }, null)
    ]});
    const endSeg1 = window.evaluateScene(twoSegScene, 2.99).characters[0].x;
    const startSeg2 = window.evaluateScene(twoSegScene, 3.01).characters[0].x;
    if(Math.abs(startSeg2 - endSeg1) > 15) errors.push('FAIL: walk position should carry over across consecutive segments, got end-of-seg1='+endSeg1+' start-of-seg2='+startSeg2);

    results.push(['point-to-point movement', 'ok, walk x(t=0)='+wx0.toFixed(0)+' -> x(t=2)='+wx1.toFixed(0)+', idle stays put, position continues across segments']);
  }

  // 22. Per-segment background/weather override (task #14): a segment with an explicit override should
  // report it in evaluateScene's frame; a segment with none should fall back to the scene-wide default.
  {
    const bgChar = window.makeCharacter({ name:'BgTest' });
    const bgScene = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold', characters:[bgChar], timeline:[
      window.makeSegment(2, { [bgChar.id]:'idle' }, null, 'forest', 'snow'),
      window.makeSegment(2, { [bgChar.id]:'idle' }, null, null, null)
    ]};
    const segAFrame = window.evaluateScene(bgScene, 1);
    const segBFrame = window.evaluateScene(bgScene, 3);
    if(segAFrame.background !== 'forest' || segAFrame.weather !== 'snow') errors.push('FAIL: segment override not applied, got background='+segAFrame.background+' weather='+segAFrame.weather);
    if(segBFrame.background !== 'white' || segBFrame.weather !== 'none') errors.push('FAIL: segment without override should inherit scene default, got background='+segBFrame.background+' weather='+segBFrame.weather);
    results.push(['per-segment background/weather override', 'ok, overridden segment=forest/snow, default segment=white/none']);
  }

  // 22b. Same, but through the actual UI: every segment card should render the override selects, and
  // changing one shouldn't throw (exercises onSegmentFieldChange's segBackground/segWeather branches
  // and the forceRedraw() call after them).
  {
    const segCardsNow = doc.querySelectorAll('#segmentList .segment-card');
    const firstBgSel = segCardsNow[0] && segCardsNow[0].querySelector('select[data-field="segBackground"]');
    const firstWeatherSel = segCardsNow[0] && segCardsNow[0].querySelector('select[data-field="segWeather"]');
    if(!firstBgSel || !firstWeatherSel){
      errors.push('FAIL: segment card missing background/weather override selects');
    } else {
      firstBgSel.value = 'space';
      firstBgSel.dispatchEvent(new window.Event('change', {bubbles:true}));
      flushRaf(2);
      results.push(['segment scene-override UI', 'ok, override selects present on every segment card and settable']);
    }
  }

  // 23. Ride/drive actions (task #16): prompt routing to the new drivecar/ridebike/ridemotorcycle
  // clips, and several rendered frames each (exercises the RIDE_VEHICLES vehicle-prop draw path).
  {
    const ridePrompts = {
      drivecar:'a stickman drives a car to work', ridebike:'a stickman rides a bike to school', ridemotorcycle:'a stickman rides a motorcycle on the highway',
      drivesportscar:'a stickman drives a sports car down the coast', drivelimo:'a stickman drives a limo to the party'
    };
    Object.keys(ridePrompts).forEach(clipId=>{
      setValAndFire(byId('promptInput'), ridePrompts[clipId]);
      click(byId('generateBtn'));
      flushRaf(10);
      status = byId('generateStatus').textContent;
      if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+ridePrompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
    });
    results.push(['ride/drive actions', 'ok, drivecar/drivesportscar/drivelimo/ridebike/ridemotorcycle all routed + rendered, no throw']);
  }

  // 23b. Ride/drive clips should also translate x (task #18) — same evaluateScene technique as the
  // walk/run movement check above.
  {
    const driver = window.makeCharacter({ name:'Driver' });
    const baseScene2 = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    ['drivecar','drivesportscar','drivelimo','ridebike','ridemotorcycle'].forEach(clipId=>{
      const rideScene = Object.assign({}, baseScene2, { characters:[driver], timeline:[ window.makeSegment(3, { [driver.id]: clipId }, null) ] });
      const rx0 = window.evaluateScene(rideScene, 0).characters[0].x;
      const rx1 = window.evaluateScene(rideScene, 2).characters[0].x;
      if(Math.abs(rx1 - rx0) < 20) errors.push('FAIL: '+clipId+' should translate x like a real drive/ride, got x(t=0)='+rx0+' x(t=2)='+rx1);
    });
    results.push(['ride/drive movement', 'ok, all 5 ride/drive clips translate x over time']);
  }

  // 24. Editor UX: duplicate-segment button, and every segment card is draggable with a stable id
  // (structural check only — real drag-and-drop pointer events aren't simulated here, verified live).
  {
    presetSelect.value = 'talk';
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    const segCountBefore = doc.querySelectorAll('#segmentList .segment-card').length;
    const dupBtn = doc.querySelector('#segmentList .segment-card [data-act="duplicate"]');
    if(!dupBtn){
      errors.push('FAIL: duplicate segment button not found');
    } else {
      click(dupBtn);
      flushRaf(2);
      const segCountAfter = doc.querySelectorAll('#segmentList .segment-card').length;
      if(segCountAfter !== segCountBefore + 1) errors.push('FAIL: duplicate segment button did not add a segment (before='+segCountBefore+' after='+segCountAfter+')');
      results.push(['duplicate segment', 'ok, count ' + segCountBefore + ' -> ' + segCountAfter]);
    }
    const allCards = doc.querySelectorAll('#segmentList .segment-card');
    const draggableCards = doc.querySelectorAll('#segmentList .segment-card[draggable="true"][data-seg-id]');
    if(draggableCards.length !== allCards.length) errors.push('FAIL: not every segment card is draggable with a data-seg-id, got ' + draggableCards.length + '/' + allCards.length);
    else results.push(['drag reorder structure', 'ok, all ' + draggableCards.length + ' segment cards draggable']);
  }

  // 25. Visual timeline strip (task #21): one block per segment, plus a playhead element.
  {
    const stripBlocks = doc.querySelectorAll('#timelineStrip .timeline-strip-block');
    const playhead = doc.querySelector('#timelineStrip .timeline-strip-playhead');
    const segCount = doc.querySelectorAll('#segmentList .segment-card').length;
    if(stripBlocks.length !== segCount) errors.push('FAIL: timeline strip block count ('+stripBlocks.length+') should match segment count ('+segCount+')');
    if(!playhead) errors.push('FAIL: timeline strip missing playhead element');
    flushRaf(3); // exercise updateTimelineStripPlayhead() a few times via the main loop
    results.push(['visual timeline strip', 'ok, ' + stripBlocks.length + ' blocks + playhead, no throw']);
  }

  // 26. Neon Glow face parity (task #22): switch to neon and render several frames — confirms the
  // newly-added drawHair/drawFace/accessory calls inside the neon style don't throw. (Real pixel-level
  // confirmation that eyes/hair actually appear against the dark head fill is done live against the
  // deployed site, same as the earlier clipart/sketchy accessory fixes this session — jsdom's canvas
  // mock is an accept-anything Proxy stub that can't detect visual correctness.)
  {
    presetSelect.value = 'talk';
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    byId('styleSelect').value = 'neon';
    byId('styleSelect').dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(8);
    byId('styleSelect').value = 'bold';
    byId('styleSelect').dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    results.push(['neon glow face parity', 'ok, drawHair/drawFace/accessories now called on neon, no throw']);
  }

  // 27. Movement direction override (task #23): 'right' should move positively regardless of the
  // character's default layout faceDir, 'left' negatively, 'auto' unchanged (matches the pre-existing
  // point-to-point movement test's default-direction result).
  {
    const walker2 = window.makeCharacter({ name:'Walker2' });
    const baseScene3 = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    const rightScene = Object.assign({}, baseScene3, { characters:[walker2], timeline:[ window.makeSegment(3, { [walker2.id]:'walk' }, null, null, null, { [walker2.id]:'right' }) ] });
    const leftScene = Object.assign({}, baseScene3, { characters:[walker2], timeline:[ window.makeSegment(3, { [walker2.id]:'walk' }, null, null, null, { [walker2.id]:'left' }) ] });
    const rx0 = window.evaluateScene(rightScene, 0).characters[0].x, rx1 = window.evaluateScene(rightScene, 2).characters[0].x;
    const lx0 = window.evaluateScene(leftScene, 0).characters[0].x, lx1 = window.evaluateScene(leftScene, 2).characters[0].x;
    if(!(rx1 > rx0)) errors.push('FAIL: direction=right should increase x, got '+rx0+' -> '+rx1);
    if(!(lx1 < lx0)) errors.push('FAIL: direction=left should decrease x, got '+lx0+' -> '+lx1);
    const rightFrame = window.evaluateScene(rightScene, 1);
    if(rightFrame.characters[0].faceDir !== 1) errors.push('FAIL: direction=right should set faceDir=1, got '+rightFrame.characters[0].faceDir);
    results.push(['movement direction override', 'ok, right increases x ('+rx0.toFixed(0)+'->'+rx1.toFixed(0)+'), left decreases x ('+lx0.toFixed(0)+'->'+lx1.toFixed(0)+')']);
  }

  // 28. Direction UI: every segment card should have a direction select per character, defaulting to
  // "auto", and setting it should not throw (exercises onSegmentFieldChange's direction_ branch).
  {
    const dirSelects = doc.querySelectorAll('#segmentList select[data-field^="direction_"]');
    if(dirSelects.length === 0) errors.push('FAIL: no direction override selects found on any segment card');
    else {
      dirSelects[0].value = 'right';
      dirSelects[0].dispatchEvent(new window.Event('change', {bubbles:true}));
      flushRaf(2);
      results.push(['direction override UI', 'ok, ' + dirSelects.length + ' direction selects found and settable']);
    }
  }

  // 29. Driver POV camera (task #25): a segment with povCamera=true and a riding character should
  // produce a non-null frame.povDriver; without a riding character (or povCamera off) it should stay
  // null so normal rendering is used. Also render several frames through the real UI checkbox path.
  {
    const povDriverChar = window.makeCharacter({ name:'PovDriver' });
    const baseScene4 = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    const povOnScene = Object.assign({}, baseScene4, { characters:[povDriverChar], timeline:[ window.makeSegment(3, { [povDriverChar.id]:'drivecar' }, null, null, null, {}, true) ] });
    const povOffScene = Object.assign({}, baseScene4, { characters:[povDriverChar], timeline:[ window.makeSegment(3, { [povDriverChar.id]:'drivecar' }, null, null, null, {}, false) ] });
    const notRidingScene = Object.assign({}, baseScene4, { characters:[povDriverChar], timeline:[ window.makeSegment(3, { [povDriverChar.id]:'idle' }, null, null, null, {}, true) ] });
    const povFrame = window.evaluateScene(povOnScene, 1);
    const noPovFrame = window.evaluateScene(povOffScene, 1);
    const notRidingFrame = window.evaluateScene(notRidingScene, 1);
    if(!povFrame.povDriver) errors.push('FAIL: povCamera=true + riding character should set frame.povDriver');
    if(noPovFrame.povDriver) errors.push('FAIL: povCamera=false should leave frame.povDriver null even while riding');
    if(notRidingFrame.povDriver) errors.push('FAIL: povCamera=true but NOT riding should leave frame.povDriver null');
    try {
      window.renderFrame(povFrame);
      results.push(['driver POV camera', 'ok, povDriver resolved correctly and renderFrame(povFrame) did not throw']);
    } catch(e){ errors.push('FAIL: renderFrame threw for a POV frame: ' + e.stack); }

    // Also exercise the real UI checkbox + several animated frames end to end.
    presetSelect.value = 'talk';
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    const firstActionSelect = doc.querySelector('#segmentList select[data-field^="action_"]');
    if(firstActionSelect){
      firstActionSelect.value = 'drivecar';
      firstActionSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    }
    const povCheckbox = doc.querySelector('#segmentList input[data-field="povCamera"]');
    if(!povCheckbox){
      errors.push('FAIL: Driver POV camera checkbox not found on segment card');
    } else {
      povCheckbox.checked = true;
      povCheckbox.dispatchEvent(new window.Event('change', {bubbles:true}));
      flushRaf(8);
      results.push(['driver POV camera UI', 'ok, checkbox found and several POV frames rendered via the real UI, no throw']);
    }
  }

  // 30. Enhanced timeline strip (task #26): each block should now have a drag handle and a resize
  // handle (not just be draggable itself), and the strip container should have a scrub mousedown wired.
  {
    presetSelect.value = 'talk';
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    const blocks = doc.querySelectorAll('#timelineStrip .timeline-strip-block');
    const handles = doc.querySelectorAll('#timelineStrip .strip-drag-handle');
    const resizers = doc.querySelectorAll('#timelineStrip .strip-resize-handle');
    if(handles.length !== blocks.length) errors.push('FAIL: expected one drag handle per strip block, got '+handles.length+'/'+blocks.length);
    if(resizers.length !== blocks.length) errors.push('FAIL: expected one resize handle per strip block, got '+resizers.length+'/'+blocks.length);
    // simulate a scrub: mousedown on the strip container itself should not throw (jsdom's
    // getBoundingClientRect returns zeros, so this only checks the handler runs safely, not the math).
    const stripEl = doc.getElementById('timelineStrip');
    stripEl.dispatchEvent(new window.MouseEvent('mousedown', {bubbles:true, clientX: 50}));
    doc.dispatchEvent(new window.MouseEvent('mouseup', {bubbles:true}));
    results.push(['timeline strip scrub + trim structure', 'ok, ' + handles.length + ' drag handles, ' + resizers.length + ' resize handles, scrub mousedown safe']);
  }

  // 31. Rideable flying vehicles (task #27): prompt routing to flyplane/flyhelicopter, and horizontal
  // movement like every other ride/drive clip when no vertical direction override is set.
  {
    const flyPrompts = { flyplane:'a stickman flies a plane over the city', flyhelicopter:'a stickman flies a helicopter over the city' };
    Object.keys(flyPrompts).forEach(clipId=>{
      setValAndFire(byId('promptInput'), flyPrompts[clipId]);
      click(byId('generateBtn'));
      flushRaf(10);
      status = byId('generateStatus').textContent;
      if(!new RegExp(clipId).test(status)) errors.push('FAIL: "'+flyPrompts[clipId]+'" did not produce a '+clipId+' segment: ' + status);
    });
    const flyer = window.makeCharacter({ name:'Flyer' });
    const baseScene5 = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    ['flyplane','flyhelicopter'].forEach(clipId=>{
      const cruiseScene = Object.assign({}, baseScene5, { characters:[flyer], timeline:[ window.makeSegment(3, { [flyer.id]: clipId }, null) ] });
      const fx0 = window.evaluateScene(cruiseScene, 0).characters[0].x;
      const fx1 = window.evaluateScene(cruiseScene, 2).characters[0].x;
      if(Math.abs(fx1 - fx0) < 20) errors.push('FAIL: '+clipId+' with no vertical override should still cruise horizontally, got x(t=0)='+fx0+' x(t=2)='+fx1);
      try { window.renderFrame(window.evaluateScene(cruiseScene, 1)); } catch(e){ errors.push('FAIL: renderFrame threw for '+clipId+': '+e.stack); }
    });
    results.push(['fly actions + horizontal cruise', 'ok, flyplane/flyhelicopter routed + cruise horizontally like other rides, no throw']);
  }

  // 32. Vertical flight movement (task #27): direction='up' should raise pose.altitude over time and
  // freeze x in place; direction='down' should lower a previously-gained altitude back toward 0;
  // altitude should never go negative or exceed the MAX_ALTITUDE clamp.
  {
    const pilot = window.makeCharacter({ name:'Pilot' });
    const baseScene6 = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    const upScene = Object.assign({}, baseScene6, { characters:[pilot], timeline:[ window.makeSegment(3, { [pilot.id]:'flyplane' }, null, null, null, { [pilot.id]:'up' }) ] });
    const f0 = window.evaluateScene(upScene, 0), f1 = window.evaluateScene(upScene, 2);
    if(!(f1.characters[0].pose.altitude > f0.characters[0].pose.altitude)) errors.push('FAIL: direction=up should increase altitude over time, got '+f0.characters[0].pose.altitude+' -> '+f1.characters[0].pose.altitude);
    if(Math.abs(f1.characters[0].x - f0.characters[0].x) > 1) errors.push('FAIL: direction=up should hold x still (pure climb), got x '+f0.characters[0].x+' -> '+f1.characters[0].x);

    // Climb for a full segment, then descend for a second segment — altitude should come back down.
    const climbThenDescend = Object.assign({}, baseScene6, { characters:[pilot], timeline:[
      window.makeSegment(3, { [pilot.id]:'flyhelicopter' }, null, null, null, { [pilot.id]:'up' }),
      window.makeSegment(3, { [pilot.id]:'flyhelicopter' }, null, null, null, { [pilot.id]:'down' })
    ] });
    const afterClimb = window.evaluateScene(climbThenDescend, 2.9).characters[0].pose.altitude;
    const afterDescendStart = window.evaluateScene(climbThenDescend, 3.1).characters[0].pose.altitude;
    const afterDescendLater = window.evaluateScene(climbThenDescend, 5.9).characters[0].pose.altitude;
    if(!(afterClimb > 0)) errors.push('FAIL: altitude should be > 0 after a full climb segment, got '+afterClimb);
    if(!(afterDescendLater < afterDescendStart)) errors.push('FAIL: altitude should decrease further into a descend segment, got '+afterDescendStart+' -> '+afterDescendLater);
    if(afterDescendLater < 0) errors.push('FAIL: altitude should never clamp below 0, got '+afterDescendLater);

    try { window.renderFrame(f1); window.renderFrame(window.evaluateScene(climbThenDescend, 5)); } catch(e){ errors.push('FAIL: renderFrame threw for a flying character: '+e.stack); }
    results.push(['vertical flight movement', 'ok, up climbs+freezes x, down descends back toward 0, altitude clamped, renderFrame safe']);
  }

  // 33. Up/Down direction UI (task #27): the direction select should offer Up/Down options only when
  // that character's action this segment is a flying clip (flyplane/flyhelicopter), not for ground clips.
  {
    presetSelect.value = 'walk';
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    const walkDirSelect = doc.querySelector('#segmentList select[data-field^="direction_"]');
    if(walkDirSelect){
      const hasVertOnGround = Array.from(walkDirSelect.options).some(o=> o.value === 'up' || o.value === 'down');
      if(hasVertOnGround) errors.push('FAIL: Up/Down direction options should not appear for a non-flying clip (walk)');
    }
    const firstActionSelect2 = doc.querySelector('#segmentList select[data-field^="action_"]');
    if(firstActionSelect2){
      firstActionSelect2.value = 'flyplane';
      firstActionSelect2.dispatchEvent(new window.Event('change', {bubbles:true}));
      flushRaf(2);
      const flyDirSelect = doc.querySelector('#segmentList select[data-field^="direction_"]');
      const hasVertOnFly = flyDirSelect && Array.from(flyDirSelect.options).some(o=> o.value === 'up') && Array.from(flyDirSelect.options).some(o=> o.value === 'down');
      if(!hasVertOnFly) errors.push('FAIL: Up/Down direction options should appear once the segment action is set to flyplane');
      else {
        flyDirSelect.value = 'up';
        flyDirSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
        flushRaf(4);
        results.push(['up/down direction UI', 'ok, vertical options appear only for flying clips and are settable']);
      }
    }
  }

  // 34. Drag-to-reposition end position (task #28): seg.dragTargets[charId] should pull the character
  // from wherever the segment started toward the dragged x over the segment's duration, hold there for
  // any following segment with no override of its own, and be mutually exclusive with the direction
  // dropdown (setting one clears the other, exercised through the real onSegmentFieldChange UI path).
  {
    const dragger = window.makeCharacter({ name:'Dragger' });
    const baseScene7 = { background:'white', weather:'none', customBgImage:null, furniture:'chair', food:'sandwich', animals:[], vehicles:[], style:'bold' };
    const seg1 = window.makeSegment(4, { [dragger.id]:'idle' }, null, null, null, {}, false, { [dragger.id]: { x: 650 } });
    const seg2 = window.makeSegment(2, { [dragger.id]:'idle' }, null, null, null, {}, false, {});
    const dragScene = Object.assign({}, baseScene7, { characters:[dragger], timeline:[seg1, seg2] });
    const d0 = window.evaluateScene(dragScene, 0).characters[0].x;
    const dMid = window.evaluateScene(dragScene, 2).characters[0].x;
    const dEnd = window.evaluateScene(dragScene, 3.95).characters[0].x;
    const dNext = window.evaluateScene(dragScene, 5).characters[0].x;
    if(!(dMid > d0 && dMid < 650)) errors.push('FAIL: dragged idle character should be partway to 650 at t=2, got start='+d0+' mid='+dMid);
    if(Math.abs(dEnd - 650) > 5) errors.push('FAIL: dragged character should be essentially at 650 by segment end, got '+dEnd);
    if(Math.abs(dNext - 650) > 5) errors.push('FAIL: next segment (no override) should hold the dragged position, got '+dNext);
    if(window.evaluateScene(dragScene, 1).activeSegmentId !== seg1.id) errors.push('FAIL: evaluateScene should report activeSegmentId matching the currently-playing segment');
    results.push(['drag-to-reposition scene logic', 'ok, idle character slides to dragged x ('+d0.toFixed(0)+' -> '+dEnd.toFixed(0)+') and next segment holds it, activeSegmentId correct']);

    // Mutual exclusivity: setting a direction via the real segment-card UI should clear any dragTarget
    // for that character/segment, and the "Custom position set" note should disappear from the DOM.
    // (state.scene isn't reachable directly under jsdom — it's a `const`, not a function declaration —
    // so this goes through window.findSegment, which IS exposed, same as every other cross-file check.)
    presetSelect.value = 'walk';
    presetSelect.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    const dirSelect2 = doc.querySelector('#segmentList select[data-field^="direction_"]');
    const walkSegId = dirSelect2.getAttribute('data-id');
    const walkCharId = dirSelect2.getAttribute('data-field').slice('direction_'.length);
    const walkSeg = window.findSegment(walkSegId);
    walkSeg.dragTargets[walkCharId] = { x: 500 };
    window.renderSegmentList();
    flushRaf(2);
    const noteBefore = doc.querySelector('.drag-target-note');
    if(!noteBefore) errors.push('FAIL: "Custom position set" note should render when a dragTarget is present');
    const dirSelect3 = doc.querySelector('#segmentList select[data-field="direction_'+walkCharId+'"]');
    dirSelect3.value = 'right';
    dirSelect3.dispatchEvent(new window.Event('change', {bubbles:true}));
    flushRaf(2);
    if(walkSeg.dragTargets[walkCharId]) errors.push('FAIL: picking a direction should clear the dragTarget for that character/segment');
    const noteAfter = doc.querySelector('.drag-target-note');
    if(noteAfter) errors.push('FAIL: "Custom position set" note should disappear once the dragTarget is cleared');
    results.push(['drag/direction mutual exclusivity', 'ok, setting direction via UI clears dragTarget and its note']);
  }

  // 35. Canvas drag-to-reposition plumbing (task #28): the hit-test/coordinate/ghost-draw helpers and
  // the canvas mousedown listener should all exist and run without throwing. jsdom's canvas mock can't
  // verify real pixel hit-testing or actual mouse-drag behavior (getBoundingClientRect returns zeros),
  // so this only confirms the wiring is present and safe — the interactive behavior itself (grabbing a
  // character, dragging it, seeing the ghost line, dropping it) was verified live on the deployed site.
  {
    if(typeof window.hitTestCharacterAt !== 'function') errors.push('FAIL: hitTestCharacterAt not defined');
    if(typeof window.canvasPointFromEvent !== 'function') errors.push('FAIL: canvasPointFromEvent not defined');
    if(typeof window.drawCanvasDragGhost !== 'function') errors.push('FAIL: drawCanvasDragGhost not defined');
    try {
      window.hitTestCharacterAt(400, 300);
      const stageCanvas = byId('stage');
      stageCanvas.dispatchEvent(new window.MouseEvent('mousedown', {bubbles:true, clientX: 400, clientY: 300}));
      doc.dispatchEvent(new window.MouseEvent('mouseup', {bubbles:true}));
      results.push(['canvas drag-to-reposition plumbing', 'ok, hit-test/coordinate/ghost helpers present, mousedown/mouseup on #stage safe']);
    } catch(e){ errors.push('FAIL: canvas drag plumbing threw: ' + e.stack); }
  }

  // 36. AI-assisted generation button (task #29): the button should exist, be wired to a click handler
  // that doesn't throw synchronously, and share the exact same applyGeneratedScene()/generateStatus
  // output shape as the offline button (verified directly rather than via a real network round-trip,
  // since jsdom has no server behind /api/generate-scene to actually answer the fetch call — the real
  // request/response flow against the deployed serverless function was verified live).
  {
    const aiBtn = byId('aiGenerateBtn');
    if(!aiBtn) errors.push('FAIL: aiGenerateBtn not found in the DOM');
    if(typeof window.applyGeneratedScene !== 'function') errors.push('FAIL: applyGeneratedScene not defined');
    else {
      setValAndFire(byId('promptInput'), 'a stickman waves hello');
      const fakeAiResult = {
        background: 'street', weather: 'none', furniture: 'chair', food: null, bodyType: 'adult', charCount: 1,
        timeline: [{ duration: 4, actions: {}, dialogue: null }],
        animals: [], vehicles: [],
        summary: { actions: ['wave'], totalDuration: 4 }
      };
      window.applyGeneratedScene(fakeAiResult, '✨ AI built');
      flushRaf(2);
      status = byId('generateStatus').textContent;
      if(!/AI built/.test(status)) errors.push('FAIL: applyGeneratedScene should use the given status prefix, got: ' + status);
      if(byId('bgSelect').value !== 'street') errors.push('FAIL: applyGeneratedScene should apply background from the AI result, bgSelect.value='+byId('bgSelect').value);
      results.push(['AI generation button + shared apply path', 'ok, button present, applyGeneratedScene applies an AI-shaped result correctly']);
    }
    // Clicking the AI button itself should not throw synchronously (the async fetch will fail in jsdom
    // with no server behind it, but that's handled inside the try/catch in ui.js and shouldn't surface
    // as an uncaught error here).
    if(aiBtn){
      try { click(aiBtn); flushRaf(2); results.push(['AI button click safety', 'ok, click handler did not throw synchronously']); }
      catch(e){ errors.push('FAIL: clicking aiGenerateBtn threw synchronously: ' + e.stack); }
    }
  }

  // 37. Selecting "Talk" for a character with no dialogue yet should auto-enable dialogue (checkbox +
  // default line) instead of leaving a silent closed-mouth character — the bug reported live: a
  // manually-added segment with Talk picked from the dropdown showed no mouth movement and no speech
  // bubble because poseTalk/evaluateScene only animate those when seg.dialogue is actually set, and
  // only presets/AI-generated scenes filled that in automatically before this fix.
  {
    // state (const in ui.js) isn't exposed on window, so add the segment through the real UI control
    // (addSegmentBtn) rather than reaching into state directly, same pattern used elsewhere in this file.
    click(byId('addSegmentBtn'));
    flushRaf(1);
    const cards2 = doc.querySelectorAll('.segment-card');
    const lastCard = cards2[cards2.length - 1];
    const segId2 = lastCard.getAttribute('data-seg-id');
    const seg2 = window.findSegment(segId2);
    const charId2 = lastCard.querySelector('select[data-field^="action_"]').getAttribute('data-field').slice('action_'.length);
    const actionSelect2 = doc.querySelector('#segmentList [data-seg-id="'+seg2.id+'"] select[data-field="action_'+charId2+'"]');
    if(!actionSelect2) errors.push('FAIL: could not find action select for new segment/character');
    else {
      if(seg2.dialogue) errors.push('FAIL: freshly added segment should start with no dialogue');
      setValAndFire(actionSelect2, 'talk');
      if(!seg2.dialogue || seg2.dialogue.speakerId !== charId2 || !seg2.dialogue.text){
        errors.push('FAIL: selecting Talk should auto-set seg.dialogue for that character, got: ' + JSON.stringify(seg2.dialogue));
      }
      const checkbox2 = doc.querySelector('#segmentList [data-seg-id="'+seg2.id+'"] [data-field="hasDialogue"]');
      if(!checkbox2 || !checkbox2.checked) errors.push('FAIL: "Dialogue in this segment" checkbox should render checked after auto-enabling');
      // Re-selecting Talk (or switching between characters) shouldn't stomp an already-set dialogue line.
      const existingText = seg2.dialogue && seg2.dialogue.text;
      setValAndFire(actionSelect2, 'idle');
      setValAndFire(actionSelect2, 'talk');
      if(!seg2.dialogue || seg2.dialogue.text !== existingText) errors.push('FAIL: re-selecting Talk should not overwrite an existing dialogue line');
      results.push(['auto-enable dialogue on Talk selection', 'ok, seg.dialogue set with speakerId+text, checkbox reflects it, no stomping on re-select']);
    }
  }

  console.log('--- results ---');
  results.forEach(r => console.log(r[0] + ': ' + r[1]));

  if(errors.length){
    console.log('\n--- ERRORS ---');
    errors.forEach(e => console.log(e));
    process.exit(1);
  } else {
    console.log('\nALL STEPS PASSED, NO WINDOW ERRORS');
    process.exit(0);
  }
}

run();
