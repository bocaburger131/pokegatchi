const fs = require('fs');
const path = require('path');

// Install three.js
try { require.resolve('three'); } catch(e) {
  console.log('Need to install three.js');
  process.exit(1);
}

async function main() {
  const THREE = require('three');
  require('three/examples/js/loaders/GLTFLoader');
  require('three/examples/js/loaders/DRACOLoader');
  
  // Configure DRACOLoader
  THREE.DRACOLoader.setDecoderPath('https://unpkg.com/three@0.128.0/examples/js/libs/draco/gltf/');
  
  const loader = new THREE.GLTFLoader();
  const dracoLoader = new THREE.DRACOLoader();
  loader.setDRACOLoader(dracoLoader);
  
  const input = process.argv[2];
  const output = process.argv[3] || input.replace('.glb', '_decoded.glb');
  
  console.log(`Loading ${input}...`);
  
  // THREE.js r128 Node usage: load GLB
  const gltf = await new Promise((resolve, reject) => {
    loader.load(input, resolve, undefined, reject);
  });
  
  console.log('Loaded. Exporting without Draco...');
  
  // Export with a new exporter
  const exporter = new THREE.GLTFExporter();
  const glbData = await new Promise((resolve, reject) => {
    exporter.parse(gltf.scene, resolve, undefined, { binary: true, trs: false, onlyVisible: false });
  });
  
  fs.writeFileSync(output, Buffer.from(glbData));
  const size = fs.statSync(output).size;
  console.log(`Written: ${output} (${(size/1024).toFixed(0)}KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
