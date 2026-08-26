import * as THREE from 'three';

export type ResourceType = 'coreEnergy' | 'factionResource';

const NODE_APPEARANCE: Record<ResourceType, { color: number }> = {
  coreEnergy: { color: 0x66e0ff },
  factionResource: { color: 0x2ea3ff },
};

/** A harvestable node on the map: a Core Energy vein or a faction-resource deposit. */
export class ResourceNode {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;
  readonly type: ResourceType;
  remaining: number;

  constructor(type: ResourceType, position: THREE.Vector3, amount = 5000) {
    this.type = type;
    this.position = position.clone();
    this.remaining = amount;

    const appearance = NODE_APPEARANCE[type];
    const geometry =
      type === 'coreEnergy' ? new THREE.IcosahedronGeometry(1, 0) : new THREE.OctahedronGeometry(1.1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: appearance.color,
      emissive: appearance.color,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.position.y = 1;
    this.mesh.castShadow = true;
    this.mesh.userData.nodeRef = this;
  }

  isDepleted(): boolean {
    return this.remaining <= 0;
  }

  extract(amount: number): number {
    const taken = Math.min(amount, this.remaining);
    this.remaining -= taken;
    if (this.remaining <= 0) this.mesh.visible = false;
    return taken;
  }
}
