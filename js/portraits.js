'use strict';
(()=>{
  const {$,clamp,status}=Creative,canvas=$('portraitCanvas'),g=canvas.getContext('2d'),finished=document.createElement('canvas');
  let source=null,tiles=[],animation=null,started=0,generation=0;
  function stop(){if(animation)cancelAnimationFrame(animation);animation=null;$('assembly').textContent='Play assembly';}
  function render(progress=1,target=g){
    target.fillStyle=$('portraitBg').value;target.fillRect(0,0,canvas.width,canvas.height);
    const count=Math.min(tiles.length,Math.floor(tiles.length*progress));
    if(progress>=1){target.drawImage(finished,0,0);return;}
    for(let i=0;i<count;i++){const t=tiles[i];target.drawImage(finished,t.x,t.y,t.w,t.h,t.x,t.y,t.w,t.h);}
  }
  function build(){
    if(!source||Creative.busy)return;stop();const format=$('format').value;
    [canvas.width,canvas.height]=format==='square'?[900,900]:format==='landscape'?[1280,720]:[720,1280];
    finished.width=canvas.width;finished.height=canvas.height;const ctx=finished.getContext('2d'),sample=document.createElement('canvas');sample.width=canvas.width;sample.height=canvas.height;const s=sample.getContext('2d',{willReadFrequently:true});
    const scale=Math.max(canvas.width/source.width,canvas.height/source.height)*Number($('photoZoom').value),w=source.width*scale,h=source.height*scale;
    s.fillStyle=$('portraitBg').value;s.fillRect(0,0,canvas.width,canvas.height);s.drawImage(source,(canvas.width-w)/2,(canvas.height-h)*Number($('photoY').value),w,h);
    const pixels=s.getImageData(0,0,canvas.width,canvas.height).data,step=Math.round(17-Number($('detail').value)*.12),contrast=Number($('contrast').value),material=$('material').value;
    ctx.fillStyle=$('portraitBg').value;ctx.fillRect(0,0,canvas.width,canvas.height);
    const palettes=material==='fruits'?['#9b3023','#ce9030','#67883a','#774240']:['#e1cd9e','#e8e5d5','#476342','#af927c'];
    if(material==='photo')ctx.drawImage(sample,0,0);
    else for(let y=step/2;y<canvas.height;y+=step)for(let x=step/2;x<canvas.width;x+=step){
      const i=(Math.floor(y)*canvas.width+Math.floor(x))*4,r=clamp((pixels[i]-128)*contrast+128,0,255),b=clamp((pixels[i+2]-128)*contrast+128,0,255),green=clamp((pixels[i+1]-128)*contrast+128,0,255),seed=Math.sin(x*12.98+y*78.2)*43758.5,random=seed-Math.floor(seed);
      ctx.save();ctx.translate(x+(random-.5)*step*.24,y);ctx.rotate(random*Math.PI);ctx.fillStyle=$('matchColour').checked?`rgb(${r},${green},${b})`:palettes[Math.floor((r+green+b)/3/256*palettes.length)];
      const radius=step*.51;
      if(material==='flowers'){
        for(let p=0;p<6;p++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.ellipse(radius*.48,0,radius*.6,radius*.34,0,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle=`rgba(255,220,115,${.28+random*.2})`;ctx.beginPath();ctx.arc(0,0,radius*.25,0,Math.PI*2);ctx.fill();
      }else{ctx.beginPath();ctx.ellipse(0,0,radius,radius*(material==='stones'?.72:.95),0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.15)';ctx.beginPath();ctx.ellipse(-radius*.25,-radius*.25,radius*.33,radius*.2,0,0,Math.PI*2);ctx.fill();if(material==='fruits'){ctx.strokeStyle='#385536';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-radius*.75);ctx.lineTo(2,-radius*1.12);ctx.stroke();}}
      ctx.restore();
    }
    tiles=[];for(let y=0;y<canvas.height;y+=24)for(let x=0;x<canvas.width;x+=24)tiles.push({x,y,w:Math.min(24,canvas.width-x),h:Math.min(24,canvas.height-y),order:(Math.sin(x*3.7+y*9.3)+1)/2});tiles.sort((a,b)=>a.order-b.order);
    $('reveal').value=1;render(1);status('Portrait ready · '+canvas.width+' × '+canvas.height+' · '+material+'.');
  }
  async function example(){if(Creative.busy)return;const id=++generation;status('Loading your Sai Baba example…');const img=new Image();img.onload=()=>{if(id!==generation)return;source=img;build();};img.onerror=()=>status('Example could not load. Upload a photograph to continue.');img.src='assets/sai-baba-example.jpg';}
  Creative.fileImage($('sourceImage'),async img=>{generation++;source=img;build();});$('example').onclick=example;
  let timer;for(const id of ['material','format','detail','contrast','photoZoom','photoY','matchColour','portraitBg'])$(id).addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(build,90);});
  $('reveal').oninput=e=>{stop();render(Number(e.target.value));};
  $('assembly').onclick=()=>{if(!source||Creative.busy)return;if(animation){stop();return;}started=performance.now();$('assembly').textContent='Pause assembly';const duration=Number($('duration').value)*1000;function frame(now){const progress=clamp((now-started)/duration,0,1);$('reveal').value=progress;render(progress);if(progress<1)animation=requestAnimationFrame(frame);else stop();}animation=requestAnimationFrame(frame);};
  $('saveImage').onclick=()=>{if(source)Creative.png(finished,'material-portrait.png');};
  $('sendScene').onclick=()=>{if(source)Creative.send(finished);};
  $('exportPortrait').onclick=async()=>{if(!source)return;stop();await Creative.video(canvas.width,canvas.height,Number($('duration').value),(ctx,p)=>render(p,ctx),'portrait-assembly.webm');render(Number($('reveal').value));};
  example();
})();
