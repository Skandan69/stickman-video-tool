'use strict';
const Creative = (()=>{
  const $=id=>document.getElementById(id), clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  let exporting=false,cancelled=false,lastURL=null;
  function status(text){$('status').textContent=text;}
  function download(blob,name){if(lastURL)URL.revokeObjectURL(lastURL);lastURL=URL.createObjectURL(blob);const a=$('download');a.href=lastURL;a.download=name;a.textContent='Download '+name;a.hidden=false;}
  function png(canvas,name='artwork.png'){canvas.toBlob(blob=>{if(blob){download(blob,name);status('Image ready to download.');}else status('Could not create image.');},'image/png');}
  async function readImage(file){if(file.size>20000000)throw Error('Use an image smaller than 20 MB.');const url=URL.createObjectURL(file);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Choose a valid PNG, JPG or WebP image.'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
  function fileImage(input,callback){input.onchange=async()=>{const f=input.files[0];if(!f)return;try{await callback(await readImage(f));}catch(e){status(e.message);}input.value='';};}
  function send(canvas){try{const buffer=document.createElement('canvas');const scale=Math.min(1,900/canvas.width);buffer.width=canvas.width*scale;buffer.height=canvas.height*scale;buffer.getContext('2d').drawImage(canvas,0,0,buffer.width,buffer.height);localStorage.setItem('stickman.pendingArtwork',buffer.toDataURL('image/png'));location.href='index.html?artwork=1';}catch(e){status('Could not transfer artwork. Download PNG and upload it under Custom Images in the animation editor.');}}
  async function video(width,height,duration,draw,name){
    if(exporting)return;exporting=true;cancelled=false;const controls=[...document.querySelectorAll('input,button,select,textarea')].filter(e=>!e.disabled&&e.id!=='cancel');controls.forEach(e=>e.disabled=true);$('cancel').hidden=false;$('progress').hidden=false;
    try{const out=document.createElement('canvas');out.width=width;out.height=height;if(!window.WebMWriter||!out.toDataURL('image/webp').startsWith('data:image/webp'))throw Error('Use Chrome or Edge for WebM export.');const writer=new WebMWriter({quality:.87,frameRate:24}),total=Math.round(duration*24),g=out.getContext('2d');
      for(let f=0;f<total;f++){if(cancelled)break;draw(g,f/Math.max(1,total-1));writer.addFrame(out);if(f%4===0){$('progress').value=(f+1)/total*100;status(`Rendering ${Math.round((f+1)/total*100)}%…`);await new Promise(r=>setTimeout(r,0));}}
      if(cancelled){status('Export cancelled. Your artwork is unchanged.');return;}const blob=await writer.complete();if(cancelled){status('Export cancelled.');return;}if(!blob.size)throw Error('Empty video.');download(blob,name);status('Video ready · '+duration+' seconds · WebM');
    }catch(e){status('Export failed: '+e.message);}finally{exporting=false;controls.forEach(e=>e.disabled=false);$('cancel').hidden=true;$('progress').hidden=true;}
  }
  if($('cancel'))$('cancel').onclick=()=>cancelled=true;
  return{$,clamp,status,download,png,readImage,fileImage,send,video,get busy(){return exporting;}};
})();
