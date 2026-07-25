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
  laughing:  { label: 'Laughing',  browLeftY: -11, browRightY: -11, mouth: 'smile', eyeScale: 0.25 },
  proud:       { label: 'Proud',       browLeftY: -12, browRightY: -12, mouth: 'smile', eyeScale: 1.1 },
  bored:       { label: 'Bored',       browLeftY: -5,  browRightY: -5,  mouth: 'flat',  eyeScale: 0.5 },
  excited:     { label: 'Excited',     browLeftY: -13, browRightY: -13, mouth: 'smile', eyeScale: 1.3 },
  embarrassed: { label: 'Embarrassed', browLeftY: -7,  browRightY: -11, mouth: 'flat',  eyeScale: 0.6 },

  // ---- joy family ----
  joyful:      { label: 'Joyful',      browLeftY: -11, browRightY: -11, mouth: 'smile', eyeScale: 1.1 },
  ecstatic:    { label: 'Ecstatic',    browLeftY: -13, browRightY: -13, mouth: 'smile', eyeScale: 1.4 },
  content:     { label: 'Content',     browLeftY: -8,  browRightY: -8,  mouth: 'smile', eyeScale: 0.8 },
  cheerful:    { label: 'Cheerful',    browLeftY: -10, browRightY: -10, mouth: 'smile', eyeScale: 1.0 },
  delighted:   { label: 'Delighted',   browLeftY: -12, browRightY: -12, mouth: 'smile', eyeScale: 1.2 },
  amused:      { label: 'Amused',      browLeftY: -9,  browRightY: -10, mouth: 'smile', eyeScale: 0.9 },
  playful:     { label: 'Playful',     browLeftY: -10, browRightY: -8,  mouth: 'smile', eyeScale: 1.0 },
  relieved:    { label: 'Relieved',    browLeftY: -7,  browRightY: -7,  mouth: 'smile', eyeScale: 0.7 },
  grateful:    { label: 'Grateful',    browLeftY: -9,  browRightY: -9,  mouth: 'smile', eyeScale: 0.9 },
  hopeful:     { label: 'Hopeful',     browLeftY: -10, browRightY: -9,  mouth: 'smile', eyeScale: 1.0 },
  optimistic:  { label: 'Optimistic',  browLeftY: -10, browRightY: -10, mouth: 'smile', eyeScale: 1.0 },
  affectionate:{ label: 'Affectionate',browLeftY: -8,  browRightY: -8,  mouth: 'smile', eyeScale: 0.9 },
  loving:      { label: 'Loving',      browLeftY: -9,  browRightY: -9,  mouth: 'smile', eyeScale: 1.0 },
  overjoyed:   { label: 'Overjoyed',   browLeftY: -13, browRightY: -13, mouth: 'smile', eyeScale: 1.4 },
  triumphant:  { label: 'Triumphant',  browLeftY: -12, browRightY: -11, mouth: 'smile', eyeScale: 1.2 },
  victorious:  { label: 'Victorious',  browLeftY: -12, browRightY: -12, mouth: 'smile', eyeScale: 1.3 },
  silly:       { label: 'Silly',       browLeftY: -9,  browRightY: -11, mouth: 'smile', eyeScale: 1.1 },
  goofy:       { label: 'Goofy',       browLeftY: -8,  browRightY: -12, mouth: 'smile', eyeScale: 1.1 },
  mischievous: { label: 'Mischievous', browLeftY: -12, browRightY: -6,  mouth: 'smile', eyeScale: 0.9 },
  dreamy:      { label: 'Dreamy',      browLeftY: -7,  browRightY: -7,  mouth: 'smile', eyeScale: 0.5 },
  brave:       { label: 'Brave',       browLeftY: -10, browRightY: -10, mouth: 'flat',  eyeScale: 1.0 },
  fearless:    { label: 'Fearless',    browLeftY: -11, browRightY: -11, mouth: 'flat',  eyeScale: 1.1 },

  // ---- calm / thoughtful family ----
  calm:        { label: 'Calm',        browLeftY: -7,  browRightY: -7,  mouth: 'flat', eyeScale: 0.7 },
  relaxed:     { label: 'Relaxed',     browLeftY: -6,  browRightY: -6,  mouth: 'flat', eyeScale: 0.6 },
  peaceful:    { label: 'Peaceful',    browLeftY: -7,  browRightY: -7,  mouth: 'flat', eyeScale: 0.6 },
  serene:      { label: 'Serene',      browLeftY: -6,  browRightY: -6,  mouth: 'flat', eyeScale: 0.7 },
  confident:   { label: 'Confident',   browLeftY: -9,  browRightY: -9,  mouth: 'flat', eyeScale: 0.9 },
  determined:  { label: 'Determined',  browLeftY: -10, browRightY: -10, mouth: 'flat', eyeScale: 0.9 },
  focused:     { label: 'Focused',     browLeftY: -9,  browRightY: -9,  mouth: 'flat', eyeScale: 0.8 },
  thoughtful:  { label: 'Thoughtful',  browLeftY: -8,  browRightY: -8,  mouth: 'flat', eyeScale: 0.7 },
  pensive:     { label: 'Pensive',     browLeftY: -7,  browRightY: -9,  mouth: 'flat', eyeScale: 0.6 },

  // ---- curiosity / surprise family ----
  curious:     { label: 'Curious',     browLeftY: -13, browRightY: -7,  mouth: 'o', eyeScale: 1.2 },
  intrigued:   { label: 'Intrigued',   browLeftY: -12, browRightY: -8,  mouth: 'o', eyeScale: 1.1 },
  fascinated:  { label: 'Fascinated',  browLeftY: -13, browRightY: -9,  mouth: 'o', eyeScale: 1.3 },
  shocked:     { label: 'Shocked',     browLeftY: -14, browRightY: -14, mouth: 'o', eyeScale: 1.5 },
  astonished:  { label: 'Astonished',  browLeftY: -14, browRightY: -13, mouth: 'o', eyeScale: 1.5 },
  amazed:      { label: 'Amazed',      browLeftY: -13, browRightY: -13, mouth: 'o', eyeScale: 1.4 },
  awestruck:   { label: 'Awestruck',   browLeftY: -14, browRightY: -14, mouth: 'o', eyeScale: 1.6 },
  startled:    { label: 'Startled',    browLeftY: -14, browRightY: -12, mouth: 'o', eyeScale: 1.5 },
  stunned:     { label: 'Stunned',     browLeftY: -13, browRightY: -13, mouth: 'o', eyeScale: 1.4 },

  // ---- fear / anxiety family ----
  nervous:      { label: 'Nervous',      browLeftY: -12, browRightY: -8,  mouth: 'o',      eyeScale: 1.2 },
  anxious:      { label: 'Anxious',      browLeftY: -13, browRightY: -9,  mouth: 'o',      eyeScale: 1.3 },
  worried:      { label: 'Worried',      browLeftY: -12, browRightY: -8,  mouth: 'frown',  eyeScale: 1.2 },
  stressed:     { label: 'Stressed',     browLeftY: -12, browRightY: -10, mouth: 'grimace',eyeScale: 1.2 },
  overwhelmed:  { label: 'Overwhelmed',  browLeftY: -13, browRightY: -9,  mouth: 'o',      eyeScale: 1.4 },
  panicked:     { label: 'Panicked',     browLeftY: -14, browRightY: -10, mouth: 'o',      eyeScale: 1.6 },
  terrified:    { label: 'Terrified',    browLeftY: -14, browRightY: -14, mouth: 'o',      eyeScale: 1.6 },
  horrified:    { label: 'Horrified',    browLeftY: -14, browRightY: -13, mouth: 'o',      eyeScale: 1.6 },
  disturbed:    { label: 'Disturbed',    browLeftY: -12, browRightY: -9,  mouth: 'frown',  eyeScale: 1.2 },
  uncomfortable:{ label: 'Uncomfortable',browLeftY: -10, browRightY: -8,  mouth: 'flat',   eyeScale: 1.0 },
  awkward:      { label: 'Awkward',      browLeftY: -9,  browRightY: -11, mouth: 'flat',   eyeScale: 0.9 },
  flustered:    { label: 'Flustered',    browLeftY: -11, browRightY: -9,  mouth: 'o',      eyeScale: 1.1 },
  insecure:     { label: 'Insecure',     browLeftY: -8,  browRightY: -10, mouth: 'flat',   eyeScale: 0.8 },
  vulnerable:   { label: 'Vulnerable',   browLeftY: -9,  browRightY: -9,  mouth: 'frown',  eyeScale: 0.9 },
  shy:          { label: 'Shy',          browLeftY: -7,  browRightY: -9,  mouth: 'flat',   eyeScale: 0.6 },
  timid:        { label: 'Timid',        browLeftY: -6,  browRightY: -8,  mouth: 'flat',   eyeScale: 0.5 },

  // ---- anger / contempt family ----
  frustrated:   { label: 'Frustrated',   browLeftY: -11, browRightY: -7,  mouth: 'grimace', eyeScale: 1.0 },
  annoyed:      { label: 'Annoyed',      browLeftY: -9,  browRightY: -6,  mouth: 'grimace', eyeScale: 0.9 },
  irritated:    { label: 'Irritated',    browLeftY: -10, browRightY: -6,  mouth: 'grimace', eyeScale: 0.9 },
  furious:      { label: 'Furious',      browLeftY: -12, browRightY: -5,  mouth: 'grimace', eyeScale: 1.1 },
  enraged:      { label: 'Enraged',      browLeftY: -13, browRightY: -4,  mouth: 'grimace', eyeScale: 1.2 },
  disgusted:    { label: 'Disgusted',    browLeftY: -10, browRightY: -8,  mouth: 'grimace', eyeScale: 0.8 },
  contemptuous: { label: 'Contemptuous', browLeftY: -11, browRightY: -5,  mouth: 'grimace', eyeScale: 0.8 },
  jealous:      { label: 'Jealous',      browLeftY: -10, browRightY: -7,  mouth: 'grimace', eyeScale: 0.9 },
  envious:      { label: 'Envious',      browLeftY: -9,  browRightY: -7,  mouth: 'grimace', eyeScale: 0.9 },
  suspicious:   { label: 'Suspicious',   browLeftY: -12, browRightY: -5,  mouth: 'flat',    eyeScale: 0.8 },
  skeptical:    { label: 'Skeptical',    browLeftY: -12, browRightY: -6,  mouth: 'flat',    eyeScale: 0.8 },
  doubtful:     { label: 'Doubtful',     browLeftY: -11, browRightY: -7,  mouth: 'flat',    eyeScale: 0.8 },
  defensive:    { label: 'Defensive',    browLeftY: -10, browRightY: -8,  mouth: 'grimace', eyeScale: 0.9 },
  stubborn:     { label: 'Stubborn',     browLeftY: -9,  browRightY: -9,  mouth: 'grimace', eyeScale: 0.9 },
  smug:         { label: 'Smug',         browLeftY: -6,  browRightY: -11, mouth: 'smile',   eyeScale: 0.8 },
  arrogant:     { label: 'Arrogant',     browLeftY: -7,  browRightY: -12, mouth: 'flat',    eyeScale: 0.9 },
  cocky:        { label: 'Cocky',        browLeftY: -6,  browRightY: -11, mouth: 'smile',   eyeScale: 0.9 },
  sly:          { label: 'Sly',          browLeftY: -6,  browRightY: -11, mouth: 'smile',   eyeScale: 0.7 },
  sneaky:       { label: 'Sneaky',       browLeftY: -7,  browRightY: -10, mouth: 'smile',   eyeScale: 0.7 },

  // ---- sadness / grief family ----
  guilty:      { label: 'Guilty',      browLeftY: -7,  browRightY: -10, mouth: 'frown', eyeScale: 0.7 },
  ashamed:     { label: 'Ashamed',     browLeftY: -6,  browRightY: -9,  mouth: 'frown', eyeScale: 0.6 },
  regretful:   { label: 'Regretful',   browLeftY: -7,  browRightY: -10, mouth: 'frown', eyeScale: 0.7 },
  lonely:      { label: 'Lonely',      browLeftY: -6,  browRightY: -10, mouth: 'frown', eyeScale: 0.6 },
  homesick:    { label: 'Homesick',    browLeftY: -6,  browRightY: -9,  mouth: 'frown', eyeScale: 0.6 },
  nostalgic:   { label: 'Nostalgic',   browLeftY: -7,  browRightY: -8,  mouth: 'flat',  eyeScale: 0.7 },
  melancholy:  { label: 'Melancholy',  browLeftY: -6,  browRightY: -9,  mouth: 'frown', eyeScale: 0.6 },
  gloomy:      { label: 'Gloomy',      browLeftY: -5,  browRightY: -9,  mouth: 'frown', eyeScale: 0.5 },
  depressed:   { label: 'Depressed',   browLeftY: -4,  browRightY: -8,  mouth: 'frown', eyeScale: 0.4 },
  heartbroken: { label: 'Heartbroken', browLeftY: -6,  browRightY: -11, mouth: 'frown', eyeScale: 0.6 },
  devastated:  { label: 'Devastated',  browLeftY: -5,  browRightY: -11, mouth: 'frown', eyeScale: 0.5 },
  grieving:    { label: 'Grieving',    browLeftY: -5,  browRightY: -10, mouth: 'frown', eyeScale: 0.5 },
  numb:        { label: 'Numb',        browLeftY: -6,  browRightY: -6,  mouth: 'flat',  eyeScale: 0.4 },
  hurt:        { label: 'Hurt',        browLeftY: -6,  browRightY: -10, mouth: 'frown', eyeScale: 0.6 },

  // ---- tired family ----
  exhausted: { label: 'Exhausted', browLeftY: -5, browRightY: -5, mouth: 'flat',  eyeScale: 0.2 },
  tired:     { label: 'Tired',     browLeftY: -6, browRightY: -6, mouth: 'flat',  eyeScale: 0.3 },
  drowsy:    { label: 'Drowsy',    browLeftY: -6, browRightY: -6, mouth: 'flat',  eyeScale: 0.25 },
  groggy:    { label: 'Groggy',    browLeftY: -5, browRightY: -5, mouth: 'flat',  eyeScale: 0.2 },
  sick:      { label: 'Sick',      browLeftY: -6, browRightY: -8, mouth: 'frown', eyeScale: 0.3 },
  dizzy:     { label: 'Dizzy',     browLeftY: -8, browRightY: -6, mouth: 'o',     eyeScale: 0.5 },

  // ---- physical states ----
  hungry:  { label: 'Hungry',  browLeftY: -8,  browRightY: -8,  mouth: 'o',      eyeScale: 0.8 },
  thirsty: { label: 'Thirsty', browLeftY: -7,  browRightY: -7,  mouth: 'o',      eyeScale: 0.8 },
  cold:    { label: 'Cold',    browLeftY: -6,  browRightY: -6,  mouth: 'flat',   eyeScale: 0.6 },
  hot:     { label: 'Hot',     browLeftY: -8,  browRightY: -8,  mouth: 'flat',   eyeScale: 0.7 },
  inPain:  { label: 'In Pain', browLeftY: -10, browRightY: -10, mouth: 'grimace',eyeScale: 0.6 }
};
const EMOTION_LIST = Object.keys(EMOTIONS).map(id => ({ id, label: EMOTIONS[id].label }));
