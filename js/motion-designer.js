// Direct manipulation remains bounded by the character's fixed-length 2D skeleton.
let motionRecording=false,motionSampleTime=0;
function beginDesignerRecording(){
  motionRecording=!!document.getElementById('recordDesignerDrag').checked;
  if(!motionRecording)return;
  if(designer.keyframes.length>=499){motionRecording=false;document.getElementById('motionCaptureStatus').textContent='Remove some poses before recording more (500 maximum).';return;}
  motionSampleTime=performance.now();
  designer.keyframes.push({pose:{...designer.currentPose},duration:.1,hold:0,easing:'linear'});
  designer.editingIdx=-1;
}
function captureDesignerDrag(force=false){
  if(!motionRecording)return;
  const now=performance.now(),duration=(now-motionSampleTime)/1000;
  if(!force&&duration<.1)return;
  if(designer.keyframes.length>=500){motionRecording=false;document.getElementById('motionCaptureStatus').textContent='500-pose limit reached. Save this movement before recording another.';return;}
  const previous=designer.keyframes[designer.keyframes.length-1];if(previous)previous.duration=clamp(duration,.1,10);
  designer.keyframes.push({pose:{...designer.currentPose},duration:.3,hold:0,easing:'linear'});
  motionSampleTime=now;
  document.getElementById('motionCaptureStatus').textContent='Recorded '+designer.keyframes.length+' poses. Release to finish.';
}
function finishDesignerRecording(){if(!motionRecording)return;captureDesignerDrag(true);motionRecording=false;designer.editingIdx=designer.keyframes.length-1;renderDesignerKeyframeList();document.getElementById('motionCaptureStatus').textContent='Movement captured. Play the sequence or adjust any pose and its timing.';}
document.getElementById('mirrorDesignerPose').onclick=()=>{
  designer.playing=false;designerPlayBtn.textContent='Play sequence';
  for(const suffix of ['ShoulderAngle','ElbowBend','HipAngle','KneeBend']){const a='left'+suffix,b='right'+suffix;[designer.currentPose[a],designer.currentPose[b]]=[designer.currentPose[b],designer.currentPose[a]];}
  syncDesignerSlidersFromCurrentPose();document.getElementById('motionCaptureStatus').textContent='Limbs swapped. Update this keyframe or add it as a new pose.';
};
document.getElementById('copyDesignerFrame').onclick=()=>{
  if(designer.keyframes.length>=500)return;
  designer.playing=false;designerPlayBtn.textContent='Play sequence';const k=designer.keyframes[designer.editingIdx];designer.keyframes.push({pose:{...designer.currentPose},duration:k?.duration||.6,hold:k?.hold||0,easing:k?.easing||'smooth'});designer.editingIdx=designer.keyframes.length-1;renderDesignerKeyframeList();
};
