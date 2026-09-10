// DOM/logic regression tests; canvas drawing and video encoding are stubbed, not browser QA.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const files = [...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]+>/g,''),{runScripts:'outside-only',url:'https://studio.test/',pretendToBeVisual:true});
const w = dom.window, errors = [];
w.addEventListener('error',e=>errors.push(e.message));
w.requestAnimationFrame = ()=>1;
w.alert = ()=>{}; w.confirm = ()=>true;
w.URL.createObjectURL = ()=>'blob:test'; w.URL.revokeObjectURL = ()=>{};
const context = new Proxy({}, {get:(o,k)=> k in o ? o[k] : k==='measureText' ? text=>({width:String(text).length*7}) : /Gradient/.test(k) ? ()=>({addColorStop(){}}) : ()=>{},set:(o,k,v)=>(o[k]=v,true)});
w.HTMLCanvasElement.prototype.getContext = ()=>context;
w.HTMLCanvasElement.prototype.toDataURL = ()=>'data:image/webp;base64,UklGRg==';
w.HTMLCanvasElement.prototype.setPointerCapture = ()=>{};
w.eval(files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n;\n')+`\nwindow.testStudio={get state(){return state},get elapsed(){return elapsed},get exporting(){return exportInProgress},studioSnapshot,snapshotText,validateStudioProject,openStudioProject,commitStudioHistory,travelHistory,stepStudio,syncStudioScene,loop,forceRedraw};`);
const t=w.testStudio, doc=w.document, click=id=>doc.getElementById(id).click();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pack=()=>JSON.parse(JSON.stringify({format:'stickman-studio',version:1,project:JSON.parse(t.snapshotText(t.studioSnapshot()))}));
(async()=>{
  assert.equal(errors.length,0,'all scripts initialize');
  assert.ok(doc.querySelector('main.layout #stage'));
  const initial=t.state.scene.characters[0].name;
  t.state.scene.characters[0].name='Edited'; t.commitStudioHistory();
  t.travelHistory(false); assert.equal(t.state.scene.characters[0].name,initial);
  t.travelHistory(true); assert.equal(t.state.scene.characters[0].name,'Edited');
  t.travelHistory(false); t.state.scene.characters[0].name='New branch'; t.commitStudioHistory();
  assert.equal(doc.getElementById('redoBtn').disabled,true);
  const project=pack(); project.project.name='Round trip';
  project.project.scene.characters[0].id='char999';
  for(const seg of project.project.scene.timeline){ seg.actions.char999='wave'; }
  await t.openStudioProject({size:500,text:async()=>JSON.stringify(project)});
  assert.equal(doc.getElementById('projectName').value,'Round trip');
  click('addCharacterBtn');
  assert.ok(t.state.scene.characters.some(c=>c.id==='char1000'),'IDs advance after reopening');
  const before=t.snapshotText(t.studioSnapshot());
  await t.openStudioProject({size:20,text:async()=>'{broken'});
  assert.equal(t.snapshotText(t.studioSnapshot()),before,'invalid file leaves project unchanged');
  for(const mutate of [
    p=>p.project.scene.timeline[0].duration=-2,
    p=>p.project.scene.characters[0].id='"><img src=x>',
    p=>p.project.scene.characters[0].outfit='" onfocus=alert(1)',
    p=>p.project.scene.customBgImage={studioImage:'https://example.com/remote.png'},
    p=>p.project.scene.timeline[0].customPoses={char999:{keyframes:'broken'}},
    p=>p.project.scene.vehicles=[{id:'seg888',type:'car',sizeScale:'oops'}]
  ]){ const bad=pack(); mutate(bad); assert.throws(()=>t.validateStudioProject(bad)); }
  t.stepStudio(1); assert.equal(t.state.playing,false); assert.ok(t.elapsed>0 && t.elapsed<.1);
  t.stepStudio(-1); assert.ok(t.elapsed<.001);
  const strip=doc.getElementById('timelineStrip');
  strip.getBoundingClientRect=()=>({left:0,width:100});
  const pointer=new w.MouseEvent('pointerdown',{bubbles:true,clientX:50,button:0});
  Object.defineProperty(pointer,'isPrimary',{value:true});
  strip.dispatchEvent(pointer); doc.dispatchEvent(new w.MouseEvent('pointerup',{bubbles:true}));
  assert.ok(t.elapsed>0,'touch-compatible timeline pointer scrub updates time');
  t.state.scene.timeline=[{id:'seg900',duration:.5,actions:{char999:'wave'}}]; t.syncStudioScene();
  let frameCount=0,mode='ok';
  w.WebMWriter=class { addFrame(){frameCount++;if(mode==='fail')throw Error('encoder failed');} async complete(){return new w.Blob(['video'],{type:'video/webm'});} };
  const savedPlaying=t.state.playing;
  click('exportBtn'); assert.equal(t.exporting,true); assert.equal(doc.querySelector('.layout').inert,true);
  assert.equal(doc.getElementById('cancelExportBtn').hidden,false);
  t.loop(1000); assert.equal(t.exporting,true,'preview loop leaves export in control');
  await sleep(100);
  assert.equal(frameCount,12,'0.5 seconds at 24fps produces 12 frames');
  assert.equal(t.exporting,false); assert.equal(doc.getElementById('stage').width,800);
  assert.equal(t.state.playing,savedPlaying); assert.equal(doc.querySelector('.layout').inert,false);
  assert.match(doc.getElementById('downloadLink').download,/\.webm$/);
  assert.equal(doc.getElementById('cancelExportBtn').closest('.export-box')!==null,true);
  mode='fail'; click('exportBtn'); await sleep(30);
  assert.equal(t.exporting,false); assert.equal(doc.getElementById('exportBtn').disabled,false);
  assert.match(doc.getElementById('exportStatus').textContent,/Export failed/);
  mode='ok'; frameCount=0; click('exportBtn'); click('cancelExportBtn'); await sleep(50);
  assert.equal(t.exporting,false); assert.match(doc.getElementById('exportStatus').textContent,/cancelled/);
  assert.ok(frameCount<12,'cancel stops frame generation');
  assert.deepEqual(errors,[]);
  console.log('PASS: initialization, undo/redo, history branching, project round trip, ID collision prevention, invalid-file rollback, 6 invalid schemas, frame stepping, pointer scrubbing, export frame count, export lock/restore, encoder failure recovery, cancellation.');
  w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1;});
