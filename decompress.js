const fs = require('fs');
const { Session, DracoMeshCompression } = require('@gltf-transform/core');
const { DracoDecoder } = require('@gltf-transform/extensions');

async function main() {
  const input = process.argv[2];
  const output = process.argv[3] || input.replace('.glb', '_decoded.glb');
  
  const session = new Session();
  const io = session.io;
  io.registerExtensions([DracoMeshCompression, DracoDecoder]);
  
  const doc = await io.read(input);
  
  // Remove Draco compression
  const root = doc.getRoot();
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prim.setExtension('KHR_draco_mesh_compression', null);
      prim.setExtension('EXT_meshopt_compression', null);
    }
  }
  
  // Remove the extension requirement
  const extensionsUsed = root.listExtensionsUsed();
  const dracoIdx = extensionsUsed.findIndex(e => e.extensionName === 'KHR_draco_mesh_compression');
  if (dracoIdx >= 0) root.removeExtension(dracoIdx);
  
  await io.write(output, doc);
  const inSize = fs.statSync(input).size;
  const outSize = fs.statSync(output).size;
  console.log(`Decompressed: ${input} (${(inSize/1024).toFixed(0)}KB -> ${(outSize/1024).toFixed(0)}KB)`);
}

main().catch(console.error);
