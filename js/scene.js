// ---------- scene / timeline domain model ----------
function makeSegment(duration, actions, dialogue){
  return { id: uid(), duration: duration, actions: actions || {}, dialogue: dialogue || null };
}
// Presets are templates: actions/speakers are keyed by CHARACTER INDEX (0,1,...), not by id,
// since the actual character list is open-ended now. resolveIndexedTimeline() below translates
// indices into whichever real character ids currently occupy those slots (growing the list if needed).
const PRESETS = {
  talk: { charCount:2, timeline:[
    { duration:2.5, actions:{0:'talk', 1:'idle'}, dialogue:{speakerIdx:0, text:'Hi! Nice day, right?'} },
    { duration:2.5, actions:{0:'idle', 1:'talk'}, dialogue:{speakerIdx:1, text:'It sure is! Coffee?'} },
    { duration:2.5, actions:{0:'talk', 1:'idle'}, dialogue:{speakerIdx:0, text:"Sounds great, let's go!"} }
  ]},
  kite: { charCount:1, timeline:[ { duration:10, actions:{0:'kite'}, dialogue:null } ]},
  walk: { charCount:1, timeline:[ { duration:8, actions:{0:'walk'}, dialogue:null } ]},
  wave: { charCount:1, timeline:[ { duration:4, actions:{0:'wave'}, dialogue:null } ]},
  dance:{ charCount:2, timeline:[ { duration:6, actions:{0:'dance', 1:'dance'}, dialogue:null } ]}
};

function resolveIndexedTimeline(indexedSegments, charCount){
  while(state.scene.characters.length < charCount) state.scene.characters.push(makeDefaultCharacter(state.scene.characters.length));
  const ids = state.scene.characters.map(c=>c.id);
  return indexedSegments.map(s=>({
    id: uid(),
    duration: s.duration,
    actions: Object.fromEntries(Object.entries(s.actions||{}).map(([idx,clip])=>[ids[idx], clip])),
    dialogue: s.dialogue ? { speakerId: ids[s.dialogue.speakerIdx], text: s.dialogue.text } : null
  }));
}

// ---------- prompt -> scene understanding (rule-based keyword NLU, runs fully offline) ----------
// Stems (e.g. 'walk') deliberately match inflections via substring ('walks','walking') —
// multi-word phrases are used where a bare stem would be ambiguous (e.g. 'call' alone is too generic).
const ACTION_KEYWORDS = [
  { clipId:'sit',   words:['sit','take a seat','takes a seat'] },
  { clipId:'drink', words:['drink','sip'] },
  { clipId:'eat',   words:['eat','ate','eating','bites into','takes a bite','has lunch','has dinner'] },
  { clipId:'phone', words:['on the phone','on a call','phone call','answers the phone','makes a call','calling','phone'] },
  { clipId:'wave',  words:['wav','says hello','says hi'] },
  { clipId:'dance', words:['danc'] },
  { clipId:'kite',  words:['kite'] },
  { clipId:'jump',  words:['jump'] },
  { clipId:'run',   words:['run','runs','running','sprint','sprints','sprinting'] },
  { clipId:'fight', words:['fight','fights','fighting','punch','punches','battle'] },
  { clipId:'argue', words:['argue','argues','arguing','yell at','yells at','shout at'] },
  { clipId:'hug',   words:['hug','hugs','hugging','embrace','embraces'] },
  { clipId:'highfive', words:['high five','high-five','high fives'] },
  { clipId:'walk',  words:['walk','comes in','comes into','enters','arrives'] },
  { clipId:'talk',  words:['talks to','talking to','chats with','chatting with','has a conversation','conversation with'] },
  { clipId:'idle',  words:['stand','wait','relax'] }
];

function findActionSequence(text){
  const found = [];
  ACTION_KEYWORDS.forEach(entry=>{
    let bestIdx = -1;
    entry.words.forEach(w=>{
      const idx = text.indexOf(w);
      if(idx !== -1 && (bestIdx === -1 || idx < bestIdx)) bestIdx = idx;
    });
    if(bestIdx !== -1) found.push({ clipId: entry.clipId, idx: bestIdx });
  });
  found.sort((a,b)=> a.idx - b.idx);
  const seq = [];
  found.forEach(f=>{ if(!seq.length || seq[seq.length-1] !== f.clipId) seq.push(f.clipId); });
  return seq;
}

function detectBackground(text){
  if(/(cafe|café|coffee shop|coffeeshop)/.test(text)) return 'cafe';
  if(/(office|desk|workplace|cubicle)/.test(text)) return 'office';
  if(/(bedroom|bed room)/.test(text)) return 'bedroom';
  if(/(street|sidewalk|city)/.test(text)) return 'street';
  if(/(beach|seaside|ocean|sea shore|shoreline)/.test(text)) return 'beach';
  if(/(park|outside|outdoor|garden)/.test(text)) return 'sky';
  if(/(grid|graph paper)/.test(text)) return 'grid';
  return 'white';
}

function detectDuration(text){
  const m = text.match(/(\d+(\.\d+)?)\s*(minute|min|second|sec)s?/i);
  if(!m) return null;
  const n = parseFloat(m[1]);
  const seconds = /^min/i.test(m[3]) ? n*60 : n;
  return Math.max(2, Math.min(300, seconds));
}

function detectFurniture(text){
  return /(sofa|couch)/.test(text) ? 'sofa' : 'chair';
}

function detectBodyType(text){
  if(/(kid|child|little (boy|girl)|young boy|young girl|toddler)/.test(text)) return 'child';
  if(/(old man|old woman|elderly|grandpa|grandma|grandfather|grandmother|senior citizen)/.test(text)) return 'elder';
  return 'adult';
}

function detectFood(text){
  if(/(pizza)/.test(text)) return 'pizza';
  if(/(burger|hamburger)/.test(text)) return 'burger';
  if(/(apple)/.test(text)) return 'apple';
  if(/(sandwich)/.test(text)) return 'sandwich';
  return null; // no explicit food mentioned -> leave whatever's already selected alone
}

function detectTwoCharacters(text){
  return /(two stickmen|another stickman|his friend|her friend|each other|a friend|duo|both stickmen|fight|argue|hug|high five|high-five)/.test(text);
}

function extractQuotedLines(text){
  const lines = [];
  const re = /"([^"]+)"/g;
  let m;
  while((m = re.exec(text))){ lines.push(m[1]); }
  return lines;
}

function parsePromptToScene(rawText){
  const text = rawText.toLowerCase();
  let seq = findActionSequence(text);
  if(!seq.length) seq = ['idle'];
  const bg = detectBackground(text);
  const furniture = detectFurniture(text);
  const food = detectFood(text);
  const bodyType = detectBodyType(text);
  const explicitDuration = detectDuration(rawText);
  const enableB = detectTwoCharacters(text);
  const quoted = extractQuotedLines(rawText);

  const minPerSeg = 1.5;
  const count = seq.length;
  let total = explicitDuration || Math.max(count*4, 6);
  total = Math.max(total, count*minPerSeg);
  const perSeg = total / count;

  let quoteIdx = 0;
  const charCount = enableB ? 2 : 1;
  const timeline = seq.map((clipId)=>{
    let dialogue = null;
    if(clipId === 'phone'){
      dialogue = { speakerIdx:0, text: quoted[quoteIdx] ? quoted[quoteIdx++] : "Hey! What's up?" };
    } else if(clipId === 'talk'){
      dialogue = { speakerIdx:0, text: quoted[quoteIdx] ? quoted[quoteIdx++] : 'Hey, good to see you!' };
    }
    // Interactive clips (fight/argue/hug/highfive/dance) read best with BOTH characters performing
    // the same clip together, rather than character 1 defaulting to idle.
    const pairSame = charCount === 2 && INTERACTIVE_CLIPS[clipId];
    const actions = charCount === 2 ? { 0: clipId, 1: pairSame ? clipId : 'idle' } : { 0: clipId };
    return { duration: Math.round(perSeg*10)/10, actions: actions, dialogue: dialogue };
  });

  return {
    background: bg, furniture: furniture, food: food, bodyType: bodyType, charCount: charCount, timeline: timeline,
    summary: { actions: seq, totalDuration: Math.round(total*10)/10 }
  };
}

const state = {
  playing: true,
  speed: 1,
  scene: {
    background: 'white',
    customBgImage: null,
    furniture: 'chair',
    food: 'sandwich',
    characters: [
      makeCharacter(Object.assign({}, DEFAULT_CHARACTER_PALETTE[0])),
      makeCharacter(Object.assign({}, DEFAULT_CHARACTER_PALETTE[1]))
    ],
    timeline: []
  }
};
state.scene.timeline = resolveIndexedTimeline(PRESETS.talk.timeline, PRESETS.talk.charCount);

// Spread N characters evenly across the stage, left half facing right and right half facing left
// (so groups naturally face "inward" toward each other), shrinking spacing as the group grows.
function computePositions(n){
  if(n <= 1) return [{ x: 400, faceDir: 1 }];
  const spacing = Math.min(180, 620 / (n - 1));
  const startX = 400 - (spacing * (n - 1)) / 2;
  const positions = [];
  for(let i=0;i<n;i++){
    positions.push({ x: startX + spacing*i, faceDir: i < Math.ceil(n/2) ? 1 : -1 });
  }
  return positions;
}

function evaluateScene(scene, t){
  const timeline = scene.timeline.length ? scene.timeline : [makeSegment(1, {}, null)];
  const total = timeline.reduce((s,seg)=> s + Math.max(0.1, seg.duration), 0);
  const tt = ((t % total) + total) % total;
  let acc = 0, active = timeline[0], localT = 0;
  for(const seg of timeline){
    const d = Math.max(0.1, seg.duration);
    if(tt < acc + d){ active = seg; localT = tt - acc; break; }
    acc += d;
  }
  const positions = computePositions(scene.characters.length);

  const characters = scene.characters.map((appearance, i)=>{
    const clipId = (active.actions && active.actions[appearance.id]) || 'idle';
    const speaking = clipId === 'talk' && active.dialogue && active.dialogue.speakerId === appearance.id;
    const preset = applyBodyScale(appearance.bodyType, appearance.sizeScale, appearance.build); // must be active before the pose is computed (arm IK reads current geometry)
    const pose = (CLIPS[clipId]||CLIPS.idle).pose(localT, { speaking: speaking, phase: i*Math.PI });
    pose.bounceY *= preset.scale * (appearance.sizeScale || 1); // keep jump/idle/sit bounce proportional to body size
    return { id: appearance.id, x: positions[i].x, faceDir: positions[i].faceDir, appearance: appearance, clipId: clipId, pose: pose };
  });

  return { characters: characters, dialogue: active.dialogue, background: scene.background, furniture: scene.furniture || 'chair', food: scene.food || 'sandwich', localT: localT, totalDuration: total };
}

function renderFrame(frame){
  drawBackground(frame.background);
  frame.characters.forEach(c=>{
    if(SEATED_CLIPS[c.clipId]){
      if(frame.furniture === 'sofa') drawSofaProp(c.x, GROUND_Y); else drawChairProp(c.x, GROUND_Y);
    }
  });
  const handsById = {};
  frame.characters.forEach(c=>{
    const res = drawStickman(c.x, c.faceDir, c.appearance, c.pose);
    handsById[c.id] = res;
  });
  frame.characters.forEach(c=>{
    if(c.clipId === 'kite'){
      const anchor = { x: c.x + 220*c.faceDir, y: 90 };
      drawKiteProp(handsById[c.id].leftHand, frame.localT, anchor);
    }
    if(c.clipId === 'drink') drawCoffeeCupProp(handsById[c.id].rightHand);
    if(c.clipId === 'phone') drawPhoneProp(handsById[c.id].rightHand);
    if(c.clipId === 'eat') drawFoodProp(handsById[c.id].rightHand, frame.food);
  });
  if(frame.dialogue){
    const res = handsById[frame.dialogue.speakerId];
    if(res){
      const speaker = frame.characters.find(c=>c.id===frame.dialogue.speakerId);
      drawSpeechBubble(res.head, frame.dialogue.text, speaker ? speaker.faceDir : 1);
    }
  }
}
