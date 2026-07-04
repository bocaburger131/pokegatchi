// Pokedex.js — Species definitions, V2 model map, face data, and Pokemon3D API IDs

// Map species names to V2 model filenames (local assets)
export const V2_MODELS = {
  pikachu:     'pikachu_v2.glb',
  pichu:       'pichu_v2.glb',
  eevee:       'eevee_v2.glb',
  charmander:  'charmander_v2.glb',
  bulbasaur:   'bulbasaur_v2.glb',
  squirtle:    'squirtle_v2.glb',
};

// Map species names to Pokemon3D API pokedex IDs (for CDN loading)
export const POKEMON_IDS = {
  pikachu:     25,
  pichu:       172,
  eevee:       133,
  charmander:  4,
  bulbasaur:   1,
  squirtle:    7,
};

// Map species names to (pokedexId, category)
export const SPECIES_TO_POKEMON3D = {
  pikachu:     { id: 25,  category: 'regular' },
  pichu:       { id: 172, category: 'regular' },
  eevee:       { id: 133, category: 'regular' },
  charmander:  { id: 4,   category: 'regular' },
  bulbasaur:   { id: 1,   category: 'regular' },
  squirtle:    { id: 7,   category: 'regular' },
};

// 2D overlay face data — crosshair offsets per species (normalized 0-1)
export const FACE_DATA = {
  pikachu:     { x: 0.48, y: 0.42, scale: 0.40 },
  pichu:       { x: 0.48, y: 0.45, scale: 0.45 },
  eevee:       { x: 0.47, y: 0.40, scale: 0.38 },
  charmander:  { x: 0.48, y: 0.44, scale: 0.42 },
  bulbasaur:   { x: 0.47, y: 0.43, scale: 0.44 },
  squirtle:    { x: 0.47, y: 0.42, scale: 0.40 },
};
