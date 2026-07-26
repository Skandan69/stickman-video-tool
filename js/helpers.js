// ---------- small shared helpers (geometry math, text wrapping, ids) ----------
function upPoint(origin, angle, len, faceDir){
  return { x: origin.x + Math.sin(angle)*len*faceDir, y: origin.y - Math.cos(angle)*len };
}
function downPoint(origin, angle, len, faceDir){
  return { x: origin.x + Math.sin(angle)*len*faceDir, y: origin.y + Math.cos(angle)*len };
}
function wrapText(context, text, maxWidth){
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for(const w of words){
    const test = line ? line + ' ' + w : w;
    if(context.measureText(test).width > maxWidth && line){
      lines.push(line); line = w;
    } else { line = test; }
  }
  if(line) lines.push(line);
  return lines;
}
function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
let uidCounter = 1;
function uid(){ return 'seg' + (uidCounter++); }
let charUidCounter = 1;
function charUid(){ return 'char' + (charUidCounter++); }
const MAX_CHARACTERS = 8;
