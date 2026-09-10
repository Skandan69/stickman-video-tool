// Canvas-backed frames avoid asynchronous image loads overwriting a newer frame.
(() => {
  const $=id=>document.getElementById(id), width=480, height=320;
  let frames=[], current=0, drawing=false, last=null, timer=null, busy=false, previousFocus=null;
  const cv=$('flipCanvas'), ctx=cv.getContext('2d'), ghost=$('flipGhost'), gx=ghost.getContext('2d');
  cv.width=ghost.width=width; cv.height=ghost.height=height;
  let brush='pencil', colour='#1b1f27', size=8;
  function blank(){ const c=document.createElement('canvas'); c.width=width;c.height=height;return c; }
  frames=[blank()];
  function save(){const g=frames[current].getContext('2d');g.clearRect(0,0,width,height);g.drawImage(cv,0,0);}
  function paint(index=current){ctx.clearRect(0,0,width,height);ctx.drawImage(frames[index],0,0);}
  function strip(){
    $('flipStrip').replaceChildren();
    frames.forEach((frame,i)=>{const b=document.createElement('button');b.className='flip-frame'+(i===current?' on':'');b.setAttribute('aria-label','Frame '+(i+1));b.setAttribute('aria-pressed',String(i===current));const thumb=document.createElement('canvas');thumb.width=80;thumb.height=50;thumb.getContext('2d').drawImage(frame,0,0,80,50);const label=document.createElement('b');label.textContent=i+1;b.append(thumb,label);b.onclick=()=>{if(busy)return;stop();save();current=i;paint();update();};$('flipStrip').append(b);});
    $('flipDelBtn').disabled=frames.length<2||busy;
  }
  function update(){strip();gx.clearRect(0,0,width,height);ghost.style.opacity=Number($('flipOnion').value)/100;if(current>0)gx.drawImage(frames[current-1],0,0);$('flipStatus').textContent=`Frame ${current+1} of ${frames.length} · ${(frames.length/Number($('flipFps').value)).toFixed(2)} seconds`;}
  function stop(){if(timer){clearInterval(timer);timer=null;paint();} $('flipPlayBtn').textContent='Play';ghost.hidden=false;}
  function point(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};}
  function dab(a,b){ctx.save();ctx.globalCompositeOperation=brush==='eraser'?'destination-out':'source-over';ctx.lineWidth=size;ctx.strokeStyle=colour;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x+.01,b.y);ctx.stroke();ctx.restore();}
  cv.addEventListener('pointerdown',e=>{if(busy||e.button!==0||e.isPrimary===false)return;e.preventDefault();stop();cv.setPointerCapture(e.pointerId);drawing=true;last=point(e);dab(last,last);});
  cv.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);dab(last,p);last=p;});
  function finish(){if(!drawing)return;drawing=false;save();update();}
  cv.addEventListener('pointerup',finish);cv.addEventListener('pointercancel',finish);
  for(const [id,copy] of [['flipAddBtn',false],['flipDupBtn',true]]) $(id).onclick=()=>{if(busy)return;stop();save();if(frames.length>=240){$('flipStatus').textContent='240-frame limit reached. Export this sequence first.';return;}const c=blank();if(copy)c.getContext('2d').drawImage(cv,0,0);frames.splice(++current,0,c);paint();update();};
  $('flipDelBtn').onclick=()=>{if(busy||frames.length<2)return;stop();frames.splice(current,1);current=Math.max(0,current-1);paint();update();};
  $('flipPlayBtn').onclick=()=>{if(busy)return;if(timer){stop();update();return;}save();if(frames.length<2){$('flipStatus').textContent='Draw a frame, then add or copy a second frame to preview motion.';return;}let i=0;ghost.hidden=true;$('flipPlayBtn').textContent='Stop';paint(0);timer=setInterval(()=>paint(++i%frames.length),1000/Number($('flipFps').value));};
  $('flipBrushPencil').onclick=()=>{brush='pencil';$('flipBrushPencil').classList.add('on');$('flipBrushEraser').classList.remove('on');};
  $('flipBrushEraser').onclick=()=>{brush='eraser';$('flipBrushEraser').classList.add('on');$('flipBrushPencil').classList.remove('on');};
  for(const c of ['#1b1f27','#e0483d','#f5a524','#2f6df6','#12a150','#8b5cf6','#ffffff']){const b=document.createElement('button');b.className='flip-sw';b.style.background=c;b.setAttribute('aria-label','Brush colour '+c);b.onclick=()=>{colour=c;$('flipColourPick').value=c;};$('flipPalette').append(b);}
  $('flipColourPick').oninput=e=>colour=e.target.value;
  $('flipSize').oninput=e=>{size=Number(e.target.value);$('flipSizeVal').textContent=size;};
  $('flipFps').oninput=e=>{stop();$('flipFpsVal').textContent=e.target.value+' fps';update();};
  $('flipOnion').oninput=e=>{$('flipOnionVal').textContent=e.target.value+'%';update();};
  $('flipExportBtn').onclick=async()=>{
    if(busy)return;stop();save();busy=true;
    const controls=[...$('flipbookOverlay').querySelectorAll('button,input')].filter(e=>!e.disabled);controls.forEach(e=>e.disabled=true);
    try{if(!window.WebMWriter||!cv.toDataURL('image/webp').startsWith('data:image/webp'))throw Error('Use Chrome or Edge to export WebM.');const writer=new WebMWriter({quality:.9,frameRate:Number($('flipFps').value)}),out=blank(),g=out.getContext('2d');
      for(let i=0;i<frames.length;i++){g.fillStyle='#fff';g.fillRect(0,0,width,height);g.drawImage(frames[i],0,0);writer.addFrame(out);$('flipStatus').textContent=`Exporting frame ${i+1} of ${frames.length}…`;await new Promise(r=>setTimeout(r,0));}
      const blob=await writer.complete();if(!blob.size)throw Error('The encoder produced an empty file.');const url=URL.createObjectURL(blob),a=$('flipDownload');if(a.href.startsWith('blob:'))URL.revokeObjectURL(a.href);a.href=url;a.download='flipbook-animation.webm';a.hidden=false;$('flipStatus').textContent='Video ready. Use Download flipbook.';
    }catch(e){$('flipStatus').textContent='Export failed: '+e.message;}finally{busy=false;controls.forEach(e=>e.disabled=false);strip();}
  };
  function open(){if(exportInProgress||busy)return;previousFocus=document.activeElement;$('flipbookOverlay').style.display='flex';paint();update();$('flipbookCloseBtn').focus();}
  function close(){if(busy)return;finish();stop();$('flipbookOverlay').style.display='none';previousFocus?.focus();}
  $('startFlipbookBtn').onclick=open;$('flipbookCloseBtn').onclick=close;
  $('flipbookOverlay').addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  update();
})();
