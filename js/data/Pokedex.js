// Pokedex.js — Species definitions, V2 model map, face data, and Pokemon3D API IDs

// Map species names to V2 model filenames (local assets)
export const V2_MODELS = {
  pikachu:     'pikachu_v2.glb',
  psyduck:     'psyduck_skin_v1_alpha.png',
  eevee:       'eevee_skin_v2_compact_alpha.png',
  charmander:  'charmander_v2.glb',
  bulbasaur:   'bulbasaur_v2.glb',
  squirtle:    'squirtle_skin_v1_alpha.png',
};

// Map species names to Pokemon3D API pokedex IDs (for CDN loading)
export const POKEMON_IDS = {
  pikachu:     25,
  psyduck:     54,
  eevee:       133,
  charmander:  4,
  bulbasaur:   1,
  squirtle:    7,
};

// Map species names to (pokedexId, category)
export const SPECIES_TO_POKEMON3D = {
  pikachu:     { id: 25,  category: 'regular' },
  psyduck:     { id: 54,  category: 'regular' },
  eevee:       { id: 133, category: 'regular' },
  charmander:  { id: 4,   category: 'regular' },
  bulbasaur:   { id: 1,   category: 'regular' },
  squirtle:    { id: 7,   category: 'regular' },
};

// 2D overlay face data — crosshair offsets per species (normalized 0-1)
export const FACE_DATA = {
  pikachu:     { x: 0.48, y: 0.42, scale: 0.40 },
  psyduck:     { x: 0.48, y: 0.43, scale: 0.42 },
  eevee:       { x: 0.47, y: 0.40, scale: 0.38 },
  charmander:  { x: 0.48, y: 0.44, scale: 0.42 },
  bulbasaur:   { x: 0.47, y: 0.43, scale: 0.44 },
  squirtle:    { x: 0.47, y: 0.42, scale: 0.40 },
};
