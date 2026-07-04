// Downloads Pokemon3D API models and decompresses them using Node.js + THREE.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODELS = {
  25:  'pikachu_v2',
  172: 'pichu_v2',
  133: 'eevee_v2',
  4:   'charmander_v2',
  1:   'bulbasaur_v2',
  7:   'squirtle_v2',
};

const BASE_URL = 'https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular';

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', reject);
  });
}

async function main() {
  const outDir = path.join(__dirname, 'assets', 'models_v2');
  fs.mkdirSync(outDir, { recursive: true });

  for (const [id, name] of Object.entries(MODELS)) {
    const url = `${BASE_URL}/${id}.glb`;
    const dest = path.join(outDir, `${name}.glb`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Already exists: ${dest} (${(fs.statSync(dest).size/1024).toFixed(0)}KB)`);
      continue;
    }
    console.log(`Downloading ${url}...`);
    await download(url, dest);
    const size = fs.statSync(dest).size;
    console.log(`Downloaded: ${name}.glb (${(size/1024).toFixed(0)}KB)`);
  }
  console.log('All downloads complete.');
}

main().catch(console.error);
