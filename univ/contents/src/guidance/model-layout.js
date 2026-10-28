import { Box3, Group, Mesh, Vector3 } from './vendor/three.module.js';

export function createModelGroup(lid, casing, material) {
  // Face the lettering and the case opening toward the same side of the viewer.
  lid.rotateY(Math.PI);
  const geometries = [lid, casing];
  const widths = geometries.map(geometry => {
    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new Vector3());
    const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    geometry.translate(-center.x, -center.y, -center.z);
    return width;
  });
  const gap = 20;
  const group = new Group();
  geometries.forEach((geometry, index) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.x = index === 0 ? -(widths[1] + gap) / 2 : (widths[0] + gap) / 2;
    group.add(mesh);
  });
  const bounds = new Box3().setFromObject(group);
  group.position.sub(bounds.getCenter(new Vector3()));
  return group;
}
