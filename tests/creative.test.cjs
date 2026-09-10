// DOM-level tool tests. No browser screenshots; canvas and image decoding are controlled stubs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
function boot(page){const html=fs.readFileSync(path.join(root,page),'utf8');const scripts=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);const dom=new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]+>/g,''),{runScripts:'outside-only',url:'https://studio.test/'+page}),w=dom.window,errors=[],calls=[];
 w.addEventListener('error',e=>errors.push(e.message));w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 w.Image=function(){const i=w.document.createElement('img');Object.defineProperty(i,'width',{value:720});Object.defineProperty(i,'height',{value:1280});Object.defineProperty(i,'src',{set(value){this.setAttribute('src',value);queueMicrotask(()=>this.onload?.());},get(){return this.getAttribute('src');}});return i;};
 w.HTMLCanvasElement.prototype.getContext=function(){const canvas=this;return new Proxy({getImageData(){return{data:new Uint8ClampedArray(canvas.width*canvas.height*4).fill(145)};}},{get:(o,k)=>k in o?o[k]:k==='measureText'?s=>({width:String(s).length*10}):(...args)=>calls.push([k,...args]),set:(o,k,v)=>(o[k]=v,true)});};
 w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/webp;base64,UklGRg==';w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new w.Blob(['png']));};w.HTMLCanvasElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:this.width,height:this.height};};
 w.eval(scripts.map(s=>fs.readFileSync(path.join(root,s),'utf8')).join('\n;\n')+'\nwindow.testCreative=Creative;');
 return{w,doc:w.document,errors,calls,close:()=>w.close()};}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function pointer(env,type,x,y){const e=new env.w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});env.doc.getElementById('boardCanvas').dispatchEvent(e);}
(async()=>{
 for(const page of ['canvas.html','art.html']){const e=boot(page),d=e.doc,$=id=>d.getElementById(id);assert.deepEqual(e.errors,[]);
 $('tool').value='note';$('noteText').value='<script>literal text</script>';pointer(e,'pointerdown',100,100);pointer(e,'pointerup',100,100);assert.match($('status').textContent,/1 items/);
 $('undo').click();assert.match($('status').textContent,/0 items/);$('redo').click();assert.match($('status').textContent,/1 items/);
 $('tool').value='pen';pointer(e,'pointerdown',350,100);pointer(e,'pointermove',400,150);pointer(e,'pointerup',400,150);assert.match($('status').textContent,/2 items/);
 $('saveProject').click();assert.match($('download').download,/project.json/);$('saveImage').click();assert.match($('download').download,/\.png$/);
 if(page==='canvas.html'){$('zoomIn').click();assert.equal($('zoomLabel').textContent,'120%');$('fit').click();assert.ok(e.calls.some(c=>c[0]==='fillText'&&String(c[1]).includes('<script>')),'notes stay literal canvas text');}
 else{$('animate').click();assert.equal($('animate').textContent,'Stop preview');$('animate').click();assert.equal($('animate').textContent,'Preview animation');let count=0;e.w.WebMWriter=class{addFrame(){count++;}async complete(){return new e.w.Blob(['video']);}};$('duration').value='5';$('exportArt').click();assert.equal($('cancel').hidden,false);$('cancel').click();await pause(20);assert.equal(e.w.testCreative.busy,false);assert.ok(count<120);}
 assert.deepEqual(e.errors,[]);e.close();
 }
 const e=boot('portraits.html');await pause(20);assert.deepEqual(e.errors,[]);assert.match(e.doc.getElementById('status').textContent,/Portrait ready/);assert.ok(e.calls.some(c=>c[0]==='ellipse'),'material renderer runs');e.doc.getElementById('assembly').click();assert.equal(e.doc.getElementById('assembly').textContent,'Pause assembly');e.doc.getElementById('assembly').click();assert.equal(e.doc.getElementById('assembly').textContent,'Play assembly');e.doc.getElementById('saveImage').click();assert.equal(e.doc.getElementById('download').download,'material-portrait.png');e.close();
 console.log('PASS: Canvas and Art tools initialize, create notes/strokes, undo/redo, save projects/PNG; zoom/fit and literal text; animation/cancel; portrait sample/render/assembly/PNG.');
})().catch(err=>{console.error(err);process.exitCode=1;});
