// ---------- emotions registry: pure data describing eyebrow angle + mouth shape per emotion ----------
// No canvas calls here — drawFace() in render.js reads these parameters to actually draw.
// To add a new emotion: add one entry below (and it automatically shows up in the character
// card's Emotion dropdown via EMOTION_LIST). Nothing else needs to change.
//   browLeftY / browRightY: eyebrow endpoint offsets from the eye, in the pre-faceDir "written" sense
//   mouth: one of 'flat' | 'smile' | 'frown' | 'grimace' | 'o'
//   eyeScale: optional multiplier on eye size (e.g. wide-eyed surprise)
const EMOTIONS = {
  neutral:   { label: 'Neutral',   browLeftY: -9,  browRightY: -9,  mouth: 'flat' },
  happy:     { label: 'Happy',     browLeftY: -10, browRightY: -11, mouth: 'smile' },
  sad:       { label: 'Sad',       browLeftY: -6,  browRightY: -11, mouth: 'frown' },
  angry:     { label: 'Angry',     browLeftY: -11, browRightY: -6,  mouth: 'grimace' },
  surprised: { label: 'Surprised', browLeftY: -14, browRightY: -14, mouth: 'o', eyeScale: 1.3 },
  scared:    { label: 'Scared',    browLeftY: -14, browRightY: -9,  mouth: 'o', eyeScale: 1.5 },
  sleepy:    { label: 'Sleepy',    browLeftY: -6,  browRightY: -6,  mouth: 'flat', eyeScale: 0.3 },
  confused:  { label: 'Confused',  browLeftY: -14, browRightY: -4,  mouth: 'flat' },
  laughing:  { label: 'Laughing',  browLeftY: -11, browRightY: -11, mouth: 'smile', eyeScale: 0.25 }
};
const EMOTION_LIST = Object.keys(EMOTIONS).map(id => ({ id, label: EMOTIONS[id].label }));
