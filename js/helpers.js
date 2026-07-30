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
    // A single "word" with no spaces (a long URL, a run-on typo, or someone just holding down a key)
    // used to be pushed onto its own line verbatim no matter how wide it measured, since the wrap
    // check only ever compares whole words against the running line — that line would then render
    // past the speech bubble's edges (drawSpeechBubble sizes the box from the SAME measurement, but
    // fillText doesn't clip), spilling text across the rest of the canvas. Any word wider than
    // maxWidth by itself is now force-broken character by character so no single rendered line can
    // ever exceed maxWidth, regardless of spacing in the source text.
    if(context.measureText(w).width > maxWidth){
      if(line){ lines.push(line); line = ''; }
      let chunk = '';
      for(const ch of w){
        const test = chunk + ch;
        if(context.measureText(test).width > maxWidth && chunk){
          lines.push(chunk); chunk = ch;
        } else { chunk = test; }
      }
      line = chunk;
      continue;
    }
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
