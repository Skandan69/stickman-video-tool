'use strict';
(()=>{
  const {$,clamp,status}=Creative,canvas=$('boardCanvas'),ctx=canvas.getContext('2d'),art=!!$('motion');
  let objects=[],selected=null,view={x:0,y:0,zoom:1},gesture=null,space=false,past=[],future=[],linkStart=null,animation=null,background='#e4efff';
  const pointers=new Map(),images=new Map();let pinch=null,nextId=1,loading=false;
  function clone(){return JSON.stringify({objects,background});}
  function checkpoint(){past.push(clone());if(past.length>40)past.shift();future=[];}
  function restore(text){const data=JSON.parse(text);objects=data.objects;background=data.background;if($('background'))$('background').value=background;selected=null;refresh();}
  function undo(forward=false){if(loading||Creative.busy)return;stop();const from=forward?future:past,to=forward?past:future;if(!from.length)return;to.push(clone());restore(from.pop());}
  function position(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};}
  function world(p){return{x:(p.x-view.x)/view.zoom,y:(p.y-view.y)/view.zoom};}
  function bounds(o){if(o.kind==='pen'){const xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y);const x=Math.min(...xs),y=Math.min(...ys);return{x:x+o.x,y:y+o.y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y)};}return{x:o.x,y:o.y,w:o.w,h:o.h};}
  function find(id){return objects.find(o=>o.id===id);}
  function hit(p){return[...objects].reverse().find(o=>{if(o.kind==='link')return false;const b=bounds(o);return p.x>=b.x-6&&p.x<=b.x+b.w+6&&p.y>=b.y-6&&p.y<=b.y+b.h+6;});}
  function drawObject(g,o){g.save();g.strokeStyle=o.colour;g.fillStyle=o.colour;g.lineWidth=o.width||3;g.lineCap='round';g.lineJoin='round';
    if(o.kind==='link'){const a=find(o.from),b=find(o.to);if(a&&b){const aa=bounds(a),bb=bounds(b);g.beginPath();g.moveTo(aa.x+aa.w/2,aa.y+aa.h/2);g.lineTo(bb.x+bb.w/2,bb.y+bb.h/2);g.stroke();}}
    else if(o.kind==='pen'){g.translate(o.x,o.y);g.beginPath();o.points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));if(o.points.length===1)g.lineTo(o.points[0].x+.01,o.points[0].y);g.stroke();}
    else if(o.kind==='rectangle'){g.fillRect(o.x,o.y,o.w,o.h);}
    else if(o.kind==='ellipse'){g.beginPath();g.ellipse(o.x+o.w/2,o.y+o.h/2,Math.abs(o.w/2),Math.abs(o.h/2),0,0,Math.PI*2);g.fill();}
    else if(o.kind==='note'){if(!art){g.fillStyle='#fff4b8';g.fillRect(o.x,o.y,o.w,o.h);g.strokeStyle='#dec56c';g.lineWidth=1;g.strokeRect(o.x,o.y,o.w,o.h);}g.beginPath();g.rect(o.x,o.y,o.w,o.h);g.clip();g.fillStyle=o.colour;g.font='20px system-ui';g.textBaseline='top';let y=o.y+12;for(const paragraph of o.text.split('\n')){let line='';for(const word of paragraph.split(' ')){if(g.measureText(line+word).width>o.w-24&&line){g.fillText(line,o.x+12,y);y+=27;line='';}line+=word+' ';}g.fillText(line,o.x+12,y);y+=27;}}
    else if(o.kind==='image'){const img=images.get(o.src);if(img)g.drawImage(img,o.x,o.y,o.w,o.h);}
    g.restore();
  }
  function draw(target=ctx,progress=null){
    target.setTransform(1,0,0,1,0,0);target.fillStyle=art?background:'#f7f9fd';target.fillRect(0,0,canvas.width,canvas.height);
    if(!art){const gap=40*view.zoom;target.fillStyle='#d8dfed';for(let x=((view.x%gap)+gap)%gap;x<canvas.width;x+=gap)for(let y=((view.y%gap)+gap)%gap;y<canvas.height;y+=gap)target.fillRect(x,y,1.5,1.5);}
    target.save();target.translate(view.x,view.y);target.scale(view.zoom,view.zoom);
    if(art&&progress!==null){const mode=$('motion').value,phase=progress*Math.PI*2;target.translate(canvas.width/2,canvas.height/2);if(mode==='sway')target.rotate(Math.sin(phase)*.045);if(mode==='float')target.translate(0,-Math.sin(phase)*14);if(mode==='zoom')target.scale(1+progress*.12,1+progress*.12);target.translate(-canvas.width/2,-canvas.height/2);}
    const list=objects.filter(o=>o.kind==='link').concat(objects.filter(o=>o.kind!=='link'));
    list.forEach((o,i)=>{if(progress!==null&&art&&$('motion').value==='reveal'&&i>=Math.ceil(list.length*progress))return;drawObject(target,o);});
    if(progress===null&&selected&&target===ctx){const o=find(selected);if(o&&o.kind!=='link'){const b=bounds(o);target.strokeStyle='#5b46d9';target.lineWidth=2/view.zoom;target.setLineDash([5/view.zoom,4/view.zoom]);target.strokeRect(b.x-4,b.y-4,b.w+8,b.h+8);}}
    target.restore();
  }
  function refresh(){draw();$('undo').disabled=!past.length;$('redo').disabled=!future.length;if($('zoomLabel'))$('zoomLabel').textContent=Math.round(view.zoom*100)+'%';if($('layers')){$('layers').replaceChildren();[...objects].reverse().forEach(o=>{const b=document.createElement('button');b.className='secondary';b.textContent=o.kind==='note'?o.text.slice(0,30):o.kind+' '+o.id;b.setAttribute('aria-pressed',String(o.id===selected));b.onclick=()=>{selected=o.id;refresh();};$('layers').append(b);});}status(objects.length+' items'+(selected?' · selected '+(find(selected)?.kind||''):'')+' · '+(art?'960 × 640':'Pan and zoom to explore your board'));}
  function stop(){if(animation)cancelAnimationFrame(animation);animation=null;if($('animate'))$('animate').textContent='Preview animation';}
  function object(kind,p){return{id:nextId++,kind,x:p.x,y:p.y,w:0,h:0,colour:$('colour').value,width:Number($('brush').value)};}
  function dist(){const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;}
  canvas.addEventListener('pointerdown',e=>{if(loading||Creative.busy||e.button!==0)return;e.preventDefault();stop();canvas.focus();const p=position(e);pointers.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
    if(pointers.size===2&&!art){const pts=[...pointers.values()],center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};pinch={distance:dist(),zoom:view.zoom,anchor:world(center)};gesture=null;return;}
    if(pointers.size>1)return;const w=world(p),tool=space?'pan':$('tool').value;
    if(tool==='pan'){gesture={kind:'pan',start:p,x:view.x,y:view.y};return;}
    if(tool==='select'){const o=hit(w);selected=o?.id||null;if(o){checkpoint();gesture={kind:'move',o,start:w,x:o.x,y:o.y};if(o.kind==='note')$('noteText').value=o.text;}refresh();return;}
    if(tool==='connect'){const o=hit(w);if(!o)return;if(!linkStart){linkStart=o.id;status('Now tap the second item.');}else if(linkStart!==o.id){checkpoint();objects.push({...object('link',w),from:linkStart,to:o.id});linkStart=null;refresh();}return;}
    checkpoint();const o=object(tool,w);if(tool==='pen')o.points=[{x:0,y:0}];if(tool==='note'){o.w=230;o.h=150;o.text=$('noteText').value.slice(0,2000);}
    objects.push(o);selected=o.id;if(tool!=='note')gesture={kind:tool,o,start:w};refresh();
  });
  canvas.addEventListener('pointermove',e=>{const p=position(e);if(pointers.has(e.pointerId))pointers.set(e.pointerId,p);if(pinch&&!art&&pointers.size===2){view.zoom=clamp(pinch.zoom*dist()/Math.max(1,pinch.distance),.15,4);const pts=[...pointers.values()];view.x=(pts[0].x+pts[1].x)/2-pinch.anchor.x*view.zoom;view.y=(pts[0].y+pts[1].y)/2-pinch.anchor.y*view.zoom;draw();return;}if(!gesture)return;const w=world(p),a=gesture;if(a.kind==='pan'){view.x=a.x+p.x-a.start.x;view.y=a.y+p.y-a.start.y;}else if(a.kind==='move'){a.o.x=a.x+w.x-a.start.x;a.o.y=a.y+w.y-a.start.y;}else if(a.kind==='pen'){if(a.o.points.length<10000)a.o.points.push({x:w.x-a.o.x,y:w.y-a.o.y});}else{a.o.x=Math.min(a.start.x,w.x);a.o.y=Math.min(a.start.y,w.y);a.o.w=Math.max(1,Math.abs(w.x-a.start.x));a.o.h=Math.max(1,Math.abs(w.y-a.start.y));}draw();});
  function end(e){pointers.delete(e.pointerId);gesture=null;if(pointers.size<2)pinch=null;refresh();}
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  function zoom(factor,p={x:canvas.width/2,y:canvas.height/2}){if(art||Creative.busy)return;const anchor=world(p);view.zoom=clamp(view.zoom*factor,.15,4);view.x=p.x-anchor.x*view.zoom;view.y=p.y-anchor.y*view.zoom;refresh();}
  canvas.addEventListener('wheel',e=>{if(art)return;e.preventDefault();zoom(e.deltaY>0?.9:1.1,position(e));},{passive:false});
  if(!art){$('zoomIn').onclick=()=>zoom(1.2);$('zoomOut').onclick=()=>zoom(1/1.2);$('fit').onclick=()=>{const bs=objects.filter(o=>o.kind!=='link').map(bounds);if(!bs.length){view={x:0,y:0,zoom:1};refresh();return;}const x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y)),right=Math.max(...bs.map(b=>b.x+b.w)),bottom=Math.max(...bs.map(b=>b.y+b.h));view.zoom=clamp(Math.min((canvas.width-80)/(right-x||1),(canvas.height-80)/(bottom-y||1)),.15,2);view.x=(canvas.width-(right-x)*view.zoom)/2-x*view.zoom;view.y=(canvas.height-(bottom-y)*view.zoom)/2-y*view.zoom;refresh();};}
  $('undo').onclick=()=>undo();$('redo').onclick=()=>undo(true);
  $('delete').onclick=()=>{if(!selected)return;checkpoint();objects=objects.filter(o=>o.id!==selected&&o.from!==selected&&o.to!==selected);selected=null;refresh();};
  for(const [id,factor] of [['smaller',.9],['larger',1.1]])$(id).onclick=()=>{const o=find(selected);if(!o||o.kind==='link')return;checkpoint();if(o.kind==='pen')o.points=o.points.map(p=>({x:p.x*factor,y:p.y*factor}));else{o.w=clamp(o.w*factor,10,10000);o.h=clamp(o.h*factor,10,10000);}refresh();};
  $('front').onclick=()=>{const o=find(selected);if(!o)return;checkpoint();objects=objects.filter(item=>item!==o);objects.push(o);refresh();};
  $('applyText').onclick=()=>{const o=find(selected);if(o?.kind!=='note'){status('Select a text item first.');return;}checkpoint();o.text=$('noteText').value.slice(0,2000);refresh();};
  $('tool').onchange=()=>{linkStart=null;canvas.style.cursor=$('tool').value==='pan'?'grab':'crosshair';};
  Creative.fileImage($('imageInput'),async img=>{if(loading||Creative.busy)return;const c=document.createElement('canvas'),scale=Math.min(1,1200/img.width,1200/img.height);c.width=img.width*scale;c.height=img.height*scale;c.getContext('2d').drawImage(img,0,0,c.width,c.height);const src=c.toDataURL('image/png');images.set(src,c);const p=world({x:canvas.width/2,y:canvas.height/2});checkpoint();const o=object('image',p);o.src=src;o.w=Math.min(360,c.width);o.h=o.w*c.height/c.width;o.x-=o.w/2;o.y-=o.h/2;objects.push(o);selected=o.id;refresh();});
  function output(){const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;draw(c.getContext('2d'));return c;}
  $('saveImage').onclick=()=>Creative.png(output(),art?'artwork.png':'canvas-view.png');$('sendScene').onclick=()=>Creative.send(output());
  $('saveProject').onclick=()=>{const blob=new Blob([JSON.stringify({format:art?'stickman-art':'stickman-board',version:1,objects,background,view})],{type:'application/json'});if(blob.size>25000000){status('Project exceeds 25 MB. Use smaller images.');return;}Creative.download(blob,art?'art-project.json':'canvas-project.json');status('Editable project ready to download.');};
  $('openProject').onchange=async e=>{const file=e.target.files[0];if(!file||loading||Creative.busy)return;stop();loading=true;const controls=[...document.querySelectorAll('input,select,button,textarea')].filter(e=>!e.disabled);controls.forEach(e=>e.disabled=true);status('Opening project…');try{
    if(file.size>25000000)throw Error('Use a project smaller than 25 MB.');const p=JSON.parse(await file.text());if(p.format!==(art?'stickman-art':'stickman-board')||p.version!==1||!Array.isArray(p.objects)||p.objects.length>1000)throw Error('Choose a matching project file.');
    const ids=new Set();for(const o of p.objects){if(!o||!Number.isInteger(o.id)||ids.has(o.id)||!['pen','note','rectangle','ellipse','image','link'].includes(o.kind)||!/^#[a-f0-9]{6}$/i.test(o.colour))throw Error('Invalid project item.');ids.add(o.id);for(const k of ['x','y','w','h','width'])if(typeof o[k]!=='number'||!Number.isFinite(o[k])||Math.abs(o[k])>1000000)throw Error('Invalid coordinates.');if(o.w<0||o.h<0||o.width<1||o.width>100)throw Error('Invalid size.');if(o.kind==='note'&&(typeof o.text!=='string'||o.text.length>2000))throw Error('Invalid text.');if(o.kind==='pen'&&(!Array.isArray(o.points)||!o.points.length||o.points.length>10000||o.points.some(pt=>!pt||!Number.isFinite(pt.x)||!Number.isFinite(pt.y)||Math.abs(pt.x)>1000000||Math.abs(pt.y)>1000000)))throw Error('Invalid stroke.');if(o.kind==='image'&&(!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(o.src)||o.src.length>12000000))throw Error('Invalid image.');}
    if(!/^#[a-f0-9]{6}$/i.test(p.background))throw Error('Invalid background.');const loaded=new Map();for(const o of p.objects.filter(o=>o.kind==='image')){const img=await new Promise((resolve,reject)=>{const i=new Image(),timer=setTimeout(()=>reject(Error('Image loading timed out.')),10000);i.onload=()=>{clearTimeout(timer);resolve(i);};i.onerror=()=>{clearTimeout(timer);reject(Error('Damaged image.'));};i.src=o.src;});loaded.set(o.src,img);}
    checkpoint();loaded.forEach((v,k)=>images.set(k,v));objects=p.objects;background=p.background;nextId=Math.max(0,...objects.map(o=>o.id))+1;view={x:0,y:0,zoom:1};if(!art&&p.view&&['x','y','zoom'].every(k=>Number.isFinite(p.view[k]))&&p.view.zoom>=.15&&p.view.zoom<=4)view=p.view;if($('background'))$('background').value=background;selected=null;refresh();
  }catch(err){status('Could not open project: '+err.message);}finally{loading=false;controls.forEach(e=>e.disabled=false);$('undo').disabled=!past.length;$('redo').disabled=!future.length;e.target.value='';}};
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||Creative.busy)return;if(e.code==='Space'&&document.activeElement===canvas){e.preventDefault();space=true;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}if(e.key==='Delete'&&document.activeElement===canvas)$('delete').click();});document.addEventListener('keyup',e=>{if(e.code==='Space')space=false;});window.addEventListener('blur',()=>{space=false;gesture=null;pointers.clear();});
  if(art){$('background').onchange=e=>{checkpoint();background=e.target.value;refresh();};$('animate').onclick=()=>{if(animation){stop();refresh();return;}const start=performance.now(),duration=Number($('duration').value)*1000;$('animate').textContent='Stop preview';const frame=now=>{draw(ctx,((now-start)%duration)/duration);animation=requestAnimationFrame(frame);};animation=requestAnimationFrame(frame);};$('exportArt').onclick=async()=>{stop();selected=null;await Creative.video(canvas.width,canvas.height,Number($('duration').value),(g,p)=>draw(g,p),'art-animation.webm');refresh();};}
  if(!art && typeof ResizeObserver !== 'undefined')new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();if(r.width>0&&r.height>0){canvas.width=Math.round(r.width);canvas.height=Math.round(r.height);draw();}}).observe(canvas);
  $('tool').value=art?'pen':'note';
  refresh();
})();
