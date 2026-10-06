import * as THREE from 'three';

/**
 * Exports Three.js Group/Mesh into a binary or ASCII .STL file blob
 */
export function exportToStlBlob(rootObject: THREE.Object3D, isBinary = true): Blob {
  const triangles: {
    normal: THREE.Vector3;
    a: THREE.Vector3;
    b: THREE.Vector3;
    c: THREE.Vector3;
  }[] = [];

  const tempV1 = new THREE.Vector3();
  const tempV2 = new THREE.Vector3();
  const tempV3 = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  rootObject.updateMatrixWorld(true);

  rootObject.traverse((node) => {
    if (node instanceof THREE.Mesh && node.geometry) {
      // Ignore helper lines or non-mesh
      if (node.name.startsWith('helper_') || node.name.startsWith('dimension_')) return;

      const geometry = node.geometry;
      const matrixWorld = node.matrixWorld;

      // Extract geometry buffer
      let posAttr = geometry.getAttribute('position');
      if (!posAttr) return;

      const index = geometry.getIndex();
      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const aIdx = index.getX(i);
          const bIdx = index.getX(i + 1);
          const cIdx = index.getX(i + 2);

          tempV1.fromBufferAttribute(posAttr, aIdx).applyMatrix4(matrixWorld);
          tempV2.fromBufferAttribute(posAttr, bIdx).applyMatrix4(matrixWorld);
          tempV3.fromBufferAttribute(posAttr, cIdx).applyMatrix4(matrixWorld);

          cb.subVectors(tempV3, tempV2);
          ab.subVectors(tempV1, tempV2);
          cb.cross(ab).normalize();

          triangles.push({
            normal: cb.clone(),
            a: tempV1.clone(),
            b: tempV2.clone(),
            c: tempV3.clone(),
          });
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          tempV1.fromBufferAttribute(posAttr, i).applyMatrix4(matrixWorld);
          tempV2.fromBufferAttribute(posAttr, i + 1).applyMatrix4(matrixWorld);
          tempV3.fromBufferAttribute(posAttr, i + 2).applyMatrix4(matrixWorld);

          cb.subVectors(tempV3, tempV2);
          ab.subVectors(tempV1, tempV2);
          cb.cross(ab).normalize();

          triangles.push({
            normal: cb.clone(),
            a: tempV1.clone(),
            b: tempV2.clone(),
            c: tempV3.clone(),
          });
        }
      }
    }
  });

  if (isBinary) {
    // 80-byte header + 4-byte count + (50 bytes * triangles.length)
    const bufferLength = 84 + 50 * triangles.length;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const dataView = new DataView(arrayBuffer);

    // Header 80 bytes
    const headerStr = 'Colored Gas Spring Assembly STL - Binary Export CAD Studio';
    for (let i = 0; i < 80; i++) {
      dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
    }

    // Number of triangles (uint32)
    dataView.setUint32(80, triangles.length, true);

    let offset = 84;
    for (const tri of triangles) {
      // Normal vector (3x float32)
      dataView.setFloat32(offset, tri.normal.x, true);
      dataView.setFloat32(offset + 4, tri.normal.y, true);
      dataView.setFloat32(offset + 8, tri.normal.z, true);
      offset += 12;

      // Vertex 1 (3x float32)
      dataView.setFloat32(offset, tri.a.x, true);
      dataView.setFloat32(offset + 4, tri.a.y, true);
      dataView.setFloat32(offset + 8, tri.a.z, true);
      offset += 12;

      // Vertex 2 (3x float32)
      dataView.setFloat32(offset, tri.b.x, true);
      dataView.setFloat32(offset + 4, tri.b.y, true);
      dataView.setFloat32(offset + 8, tri.b.z, true);
      offset += 12;

      // Vertex 3 (3x float32)
      dataView.setFloat32(offset, tri.c.x, true);
      dataView.setFloat32(offset + 4, tri.c.y, true);
      dataView.setFloat32(offset + 8, tri.c.z, true);
      offset += 12;

      // Attribute byte count (uint16)
      dataView.setUint16(offset, 0, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'application/octet-stream' });
  } else {
    // ASCII STL
    let stlString = 'solid gas_spring_assembly\n';
    for (const tri of triangles) {
      stlString += `  facet normal ${tri.normal.x.toExponential(6)} ${tri.normal.y.toExponential(6)} ${tri.normal.z.toExponential(6)}\n`;
      stlString += '    outer loop\n';
      stlString += `      vertex ${tri.a.x.toExponential(6)} ${tri.a.y.toExponential(6)} ${tri.a.z.toExponential(6)}\n`;
      stlString += `      vertex ${tri.b.x.toExponential(6)} ${tri.b.y.toExponential(6)} ${tri.b.z.toExponential(6)}\n`;
      stlString += `      vertex ${tri.c.x.toExponential(6)} ${tri.c.y.toExponential(6)} ${tri.c.z.toExponential(6)}\n`;
      stlString += '    endloop\n';
      stlString += '  endfacet\n';
    }
    stlString += 'endsolid gas_spring_assembly\n';

    return new Blob([stlString], { type: 'text/plain' });
  }
}
