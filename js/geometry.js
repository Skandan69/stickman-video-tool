// ---------- body geometry: base skeleton lengths + per-body-type/per-character size scaling ----------
// Base (adult) skeleton geometry. These become the "current character's" scaled values
// via applyBodyScale() below — mutated per-character right before each pose/draw call,
// since pose functions and the arm-IK solver read them by closure rather than by parameter.
const BASE_GEOMETRY = { headR:18, neckLen:8, torsoLen:60, upperArm:28, foreArm:26, upperLeg:38, lowerLeg:38, lw:5, hipHeight:66 };
const BODY_PRESETS = {
  adult: { label:'Adult', scale:1.0,  headScale:1.0,  stoop:0 },
  child: { label:'Kid',   scale:0.62, headScale:1.28, stoop:0 },
  elder: { label:'Elderly', scale:0.97, headScale:0.97, stoop:0.16 }
};
let HEAD_R = BASE_GEOMETRY.headR, NECK_LEN = BASE_GEOMETRY.neckLen, TORSO_LEN = BASE_GEOMETRY.torsoLen,
    UPPER_ARM = BASE_GEOMETRY.upperArm, FORE_ARM = BASE_GEOMETRY.foreArm,
    UPPER_LEG = BASE_GEOMETRY.upperLeg, LOWER_LEG = BASE_GEOMETRY.lowerLeg,
    LW = BASE_GEOMETRY.lw, HIP_HEIGHT = BASE_GEOMETRY.hipHeight;

function applyBodyScale(bodyType, sizeScale){
  const preset = BODY_PRESETS[bodyType] || BODY_PRESETS.adult;
  const sizeMul = sizeScale || 1;
  const s = preset.scale * sizeMul;
  HEAD_R = BASE_GEOMETRY.headR * s * preset.headScale;
  NECK_LEN = BASE_GEOMETRY.neckLen * s;
  TORSO_LEN = BASE_GEOMETRY.torsoLen * s;
  UPPER_ARM = BASE_GEOMETRY.upperArm * s;
  FORE_ARM = BASE_GEOMETRY.foreArm * s;
  UPPER_LEG = BASE_GEOMETRY.upperLeg * s;
  LOWER_LEG = BASE_GEOMETRY.lowerLeg * s;
  LW = Math.max(3, BASE_GEOMETRY.lw * (0.75 + 0.25*s));
  HIP_HEIGHT = BASE_GEOMETRY.hipHeight * s;
  return preset;
}
