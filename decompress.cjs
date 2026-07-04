#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Find @gltf-transform modules relative to this script
const projectDir = __dirname;
const addonDir = path.join(projectDir, 'node_modules');

const { Document, NodeIO } = require(path.join(addonDir, '@gltf-transform/core'));
const { KHRDracoMeshCompression, EXTTextureWebP } = require(path.join(addonDir, '@gltf-transform/extensions'));

async function main() {
  const input = process.argv[2];
  const output = process.argv[3] || input;
  
  const io = new NodeIO();
  io.registerExtensions([KHRDracoMeshCompression, EXTTextureWebP]);
  
  console.log(`Reading ${input}...`);
  const doc = await io.read(input);
  
  // Remove Draco compression from all primitives
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setExtension('KHR_draco_mesh_compression', null);
    }
  }
  
  console.log(`Writing ${output}...`);
  await io.write(output, doc);
  
  const inSize = fs.statSync(input).size;
  const outSize = fs.statSync(output).size;
  console.log(`Done: ${(inSize/1024).toFixed(0)}KB -> ${(outSize/1024).toFixed(0)}KB`);
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
