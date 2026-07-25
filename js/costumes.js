// ---------- costumes registry: profession presets bundling outfit color + accessory ----------
// A costume is just a shortcut that sets a character's outfit color and accessory in one click —
// both fields stay freely editable afterward (a costume isn't a persistent field on the character).
// To add a new profession: add one entry here, and if it needs a new accessory shape, add a
// draw function for it in render.js (see drawChefHat/drawPoliceCap/drawHeadband/drawStethoscope)
// keyed by the same accessory id used below.
const COSTUMES = {
  none:    { label: 'None (custom)', outfit: null,      accessory: null },
  doctor:  { label: 'Doctor',        outfit: '#e5e7eb',  accessory: 'doctor' },
  chef:    { label: 'Chef',          outfit: '#f8fafc',  accessory: 'chefhat' },
  police:  { label: 'Police',        outfit: '#1e3a8a',  accessory: 'police' },
  athlete: { label: 'Athlete',       outfit: '#16a34a',  accessory: 'headband' },
  student: { label: 'Student',       outfit: '#7c3aed',  accessory: 'bag' },
  teacher:     { label: 'Teacher',     outfit: '#92400e', accessory: 'glasses' },
  firefighter: { label: 'Firefighter', outfit: '#dc2626', accessory: 'hat' },
  scientist:   { label: 'Scientist',   outfit: '#f1f5f9', accessory: 'glasses' },
  artist:      { label: 'Artist',      outfit: '#0891b2', accessory: 'bag' },
  superhero: { label: 'Superhero', outfit: '#dc2626', accessory: 'cape' },
  astronaut: { label: 'Astronaut', outfit: '#f1f5f9', accessory: 'helmet' },
  pirate:    { label: 'Pirate',    outfit: '#78350f', accessory: 'headband' },
  wizard:    { label: 'Wizard',    outfit: '#6d28d9', accessory: 'wizardhat' },
  ninja:     { label: 'Ninja',     outfit: '#1f2937', accessory: 'mask' },
  knight:    { label: 'Knight',    outfit: '#64748b', accessory: 'helmet' }
};
const COSTUME_LIST = Object.keys(COSTUMES).map(id => ({ id, label: COSTUMES[id].label }));
