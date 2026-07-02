// js/data/Pokedex.js
export const STAGES = [
  { id:'egg', name:'Egg', species:'—', color:'#E8E0F0', desc:'Warm & waiting', needCatch:0, needSteps:0, needStops:0 },
  { id:'baby', name:'Baby', species:'Baby Form', color:'#C4B5FD', desc:'Freshly hatched', needCatch:0, needSteps:0, needStops:0 },
  { id:'teen', name:'Teen', species:'Teen Form', color:'#A78BFA', desc:'Growing Spark', needCatch:50, needSteps:5000, needStops:10 },
  { id:'adult', name:'Adult', species:'Adult Form', color:'#8B5CF6', desc:'Battle Ready', needCatch:250, needSteps:25000, needStops:30 },
  { id:'mega', name:'Mega', species:'Mega Form', color:'#7C3AED', desc:'Peak Evolution', needCatch:500, needSteps:50000, needStops:50 },
];

// Fix: No more "Trappup/Trappix" names — use generic stage names

export const TEAMS = {
  valor: { badge:'🔴', name:'Valor', color:'#FF4444', icon:'🔥' },
  mystic: { badge:'🔵', name:'Mystic', color:'#4488FF', icon:'💧' },
  instinct: { badge:'🟡', name:'Instinct', color:'#FFD700', icon:'⚡' },
};

export const STAT_META = [
  { icon:'🍖', name:'Hunger', colors:['#FF6B6B','#FF8E53'] },
  { icon:'💛', name:'Bond', colors:['#FFD93D','#FF6B6B'] },
  { icon:'⚡', name:'Energy', colors:['#6BCB77','#4D96FF'] },
  { icon:'🧠', name:'Smarts', colors:['#845EC2','#D65DB1'] },
];

export const MOODS = ['😊 Happy','😐 Content','🍽️ Hungry','😢 Sad','🌟 Excited','😴 Sleepy'];

export const EVO_LINES = {
  eevee: { name:'Eevee Line', names:['Egg','Eevee','Jolteon','Umbreon','Sylveon'] },
  charmander: { name:'Charmander Line', names:['Egg','Charmander','Charmeleon','Charizard','Mega Charizard Y'] },
  pikachu: { name:'Pikachu Line', names:['Egg','Pichu','Pikachu','Raichu','Alolan Raichu'] },
  bulbasaur: { name:'Bulbasaur Line', names:['Egg','Bulbasaur','Ivysaur','Venusaur','Mega Venusaur'] },
  squirtle: { name:'Squirtle Line', names:['Egg','Squirtle','Wartortle','Blastoise','Mega Blastoise'] },
  eeveelutions: { name:'Eeveelutions Alt', names:['Egg','Eevee','Vaporeon','Flareon','Espeon'] },
};

export const SPRITES = {
  eevee: ['assets/sprites/egg_pixel.png','assets/sprites/eevee.png','assets/sprites/jolteon.png','assets/sprites/umbreon.png','assets/sprites/sylveon.png'],
  charmander: ['assets/sprites/egg_pixel.png','assets/sprites/charmander.png','assets/sprites/charmeleon.png','assets/sprites/charizard.png','assets/sprites/mega-charizard-y.png'],
  pikachu: ['assets/sprites/egg_pixel.png','assets/sprites/pichu.png','assets/sprites/pikachu.png','assets/sprites/raichu.png','assets/sprites/alolan-raichu.png'],
  bulbasaur: ['assets/sprites/egg_pixel.png','assets/sprites/bulbasaur.png','assets/sprites/ivysaur.png','assets/sprites/venusaur.png','assets/sprites/mega-venusaur.png'],
  squirtle: ['assets/sprites/egg_pixel.png','assets/sprites/squirtle.png','assets/sprites/wartortle.png','assets/sprites/blastoise.png','assets/sprites/mega-blastoise.png'],
  eeveelutions: ['assets/sprites/egg_pixel.png','assets/sprites/eevee.png','assets/sprites/vaporeon.png','assets/sprites/flareon.png','assets/sprites/espeon.png'],
};

export const MODEL_IDS = {
  eevee: { ids:[0, 133, 135, 197, 700], cats:['','regular','regular','regular','regular'] },
  charmander: { ids:[0, 4, 5, 6, 6], cats:['','regular','regular','regular','regular'] },
  pikachu: { ids:[0, 172, 25, 26, 26], cats:['','regular','regular','regular','alolan'] },
  bulbasaur: { ids:[0, 1, 2, 3, 3], cats:['','regular','regular','regular','mega'] },
  squirtle: { ids:[0, 7, 8, 9, 9], cats:['','regular','regular','regular','regular'] },
  eeveelutions: { ids:[0, 133, 134, 136, 196], cats:['','regular','regular','regular','regular'] },
};

// V2 rigged model filenames (PokeMiners — has bones/skeleton)
// Maps evolution line -> [egg, baby, teen, adult, mega]
// Only the ones we have converted so far
export const V2_MODELS = {
  eevee:       [null, 'eevee_v2.glb', null, null, null],
  charmander:  [null, 'charmander_v2.glb', null, null, null],
  pikachu:     [null, 'pichu_v2.glb', 'pikachu_v2.glb', null, null],
  bulbasaur:   [null, 'bulbasaur_v2.glb', null, null, null],
  squirtle:    [null, 'squirtle_v2.glb', null, null, null],
  eeveelutions:[null, 'eevee_v2.glb', null, null, null],
};

export const FACE_DATA = {
  eevee: { ex:.49, ey:.32, ew:.30, eh:.22, mx:.49, my:.52, mw:.22, mh:.10 },
  jolteon: { ex:.49, ey:.28, ew:.28, eh:.20, mx:.49, my:.50, mw:.20, mh:.10 },
  umbreon: { ex:.49, ey:.30, ew:.30, eh:.22, mx:.49, my:.52, mw:.22, mh:.10 },
  sylveon: { ex:.49, ey:.28, ew:.28, eh:.20, mx:.49, my:.50, mw:.20, mh:.10 },
  charmander: { ex:.49, ey:.30, ew:.28, eh:.20, mx:.49, my:.50, mw:.20, mh:.10 },
  charmeleon: { ex:.49, ey:.28, ew:.26, eh:.18, mx:.49, my:.48, mw:.18, mh:.10 },
  charizard: { ex:.47, ey:.25, ew:.24, eh:.16, mx:.49, my:.44, mw:.16, mh:.08 },
  'mega-charizard-y': { ex:.47, ey:.24, ew:.24, eh:.16, mx:.49, my:.44, mw:.16, mh:.08 },
  'mega-charizard-x': { ex:.47, ey:.24, ew:.22, eh:.16, mx:.49, my:.44, mw:.16, mh:.08 },
  pichu: { ex:.49, ey:.33, ew:.30, eh:.22, mx:.49, my:.53, mw:.22, mh:.12 },
  pikachu: { ex:.49, ey:.31, ew:.28, eh:.20, mx:.49, my:.51, mw:.20, mh:.10 },
  raichu: { ex:.49, ey:.30, ew:.26, eh:.18, mx:.49, my:.50, mw:.18, mh:.10 },
  'alolan-raichu': { ex:.49, ey:.30, ew:.26, eh:.18, mx:.49, my:.50, mw:.18, mh:.10 },
  bulbasaur: { ex:.49, ey:.34, ew:.30, eh:.22, mx:.49, my:.54, mw:.22, mh:.12 },
  ivysaur: { ex:.49, ey:.32, ew:.28, eh:.20, mx:.49, my:.52, mw:.20, mh:.10 },
  venusaur: { ex:.49, ey:.28, ew:.26, eh:.18, mx:.49, my:.48, mw:.18, mh:.10 },
  'mega-venusaur': { ex:.49, ey:.28, ew:.26, eh:.18, mx:.49, my:.48, mw:.18, mh:.10 },
  squirtle: { ex:.49, ey:.34, ew:.28, eh:.20, mx:.49, my:.54, mw:.20, mh:.10 },
  wartortle: { ex:.49, ey:.30, ew:.26, eh:.18, mx:.49, my:.50, mw:.18, mh:.10 },
  blastoise: { ex:.49, ey:.28, ew:.24, eh:.16, mx:.49, my:.48, mw:.16, mh:.08 },
  'mega-blastoise': { ex:.49, ey:.28, ew:.24, eh:.16, mx:.49, my:.48, mw:.16, mh:.08 },
  vaporeon: { ex:.49, ey:.30, ew:.28, eh:.20, mx:.49, my:.50, mw:.20, mh:.10 },
  flareon: { ex:.49, ey:.30, ew:.28, eh:.20, mx:.49, my:.50, mw:.20, mh:.10 },
  espeon: { ex:.49, ey:.28, ew:.26, eh:.18, mx:.49, my:.48, mw:.18, mh:.10 },
};

export const MINIGAMES = [
  { icon:'🐾', name:'Pet & Coo', stat:1, desc:'+5 Bond, small Energy cost' },
  { icon:'🫐', name:'Berry Catch', stat:1, desc:'Catch falling berries!' },
  { icon:'👀', name:'Peek-a-Boo', stat:1, desc:'+4 Bond, no Energy' },
  { icon:'🪢', name:'Jump Rope', stat:1, desc:'Jump with your buddy!' },
  { icon:'🔔', name:'Simon Says', stat:3, desc:'Pattern match minigame' },
  { icon:'🎯', name:'Target Tap', stat:1, desc:'Tap the targets!' },
];

export const ACHIEVEMENTS = [
  { id:'first_hatch', icon:'🥚', name:'New Life', desc:'Hatch your first pet', oneTime:true },
  { id:'catcher_10', icon:'🏆', name:'Beginner Catcher', desc:'Catch 10 Pokémon', oneTime:true },
  { id:'catcher_50', icon:'🏆', name:'Expert Catcher', desc:'Catch 50 Pokémon', oneTime:true },
  { id:'catcher_100', icon:'🏆', name:'Master Catcher', desc:'Catch 100 Pokémon', oneTime:true },
  { id:'walker_1k', icon:'👟', name:'First Steps', desc:'Walk 1,000 steps', oneTime:true },
  { id:'walker_10k', icon:'👟', name:'Marathoner', desc:'Walk 10,000 steps', oneTime:true },
  { id:'spinner_10', icon:'🔄', name:'Stop & Spin', desc:'Spin 10 unique stops', oneTime:true },
  { id:'spinner_25', icon:'🔄', name:'City Explorer', desc:'Spin 25 unique stops', oneTime:true },
  { id:'evo_baby', icon:'⬆', name:'First Evolution', desc:'Reach Baby stage', oneTime:true },
  { id:'evo_teen', icon:'⬆', name:'Growing Up', desc:'Reach Teen stage', oneTime:true },
  { id:'evo_adult', icon:'⬆', name:'All Grown Up', desc:'Reach Adult stage', oneTime:true },
  { id:'evo_mega', icon:'⭐', name:'Peak Form', desc:'Reach Mega stage', oneTime:true },
  { id:'streak_5', icon:'🔥', name:'On Fire!', desc:'5-catch streak', oneTime:true },
  { id:'streak_10', icon:'🔥', name:'Unstoppable!', desc:'10-catch streak', oneTime:true },
  { id:'feeder', icon:'🍖', name:'Full Belly', desc:'Feed 25 times', oneTime:true },
  { id:'healer', icon:'💊', name:'Nurse', desc:'Heal 10 times', oneTime:true },
];

export const MOOD_THRESHOLDS = {
  hunger: { low: 0.25, veryLow: 0.10 },
  boredom: { high: 0.75, veryHigh: 0.90 },
  cleanliness: { low: 0.30 },
};

// Helper: get sprite filename from species name
export function getSpriteName(species) {
  return species.toLowerCase().replace(/\s+/g, '-');
}
