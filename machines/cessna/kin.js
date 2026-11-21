// The Cessna 337 main landing gear, built from code in metres: the white main plate with its channel rails, the
// hydraulic actuator on top, the rod-end connector and the brass gear rack, the pinion on a transverse rotary output
// shaft, a clevis (universal) joint at each end, the side tubes that spin about their own axis, the orange spring
// legs and the wheels. One degree of freedom: stroke 0..1 moves the rack 201 mm, turns the pinion 180°, and the side
// tubes carry the legs through the same 180° about their own axes. The right gear is built once; the left one is its
// mirror (scale.x = -1).
import * as THREE from 'three';

const V3 = THREE.Vector3;
export const G = {
  pinionR: 0.064, // 32 teeth, 4 mm module
  stroke: 0.201, // rack travel for a full 180°
  wheelR: 0.205,
  wheelW: 0.135,
  shaftY: -0.1365,
  jointX: 0.22,
  tubeLen: 0.3,
  legLen: 0.5,
};
const norm = (v) => v.clone().normalize();
// the side tube's axis (outboard, down, aft) and the spring leg's direction when down and locked: half a turn about
// that axis carries the wheel from a wide stance on the runway to a pocket beside the plate, level with it, aft
export const AXIS = norm(new V3(1, -0.6, -1));
export const LEG0 = norm(new V3(1, -1, 0.8));
export const J = new V3(G.jointX, G.shaftY, 0);
export const E0 = J.clone().addScaledVector(AXIS, G.tubeLen);
export const TIP0 = E0.clone().addScaledVector(LEG0, G.legLen);
/** where the wheel centre is (right gear, assembly frame) at gear angle th (radians) */
export const tipAt = (th) => TIP0.clone().sub(J).applyAxisAngle(AXIS, th).add(J);
/** the assembly's height above the ground when down and locked: the tyre touches the runway */
export const GROUND = -(TIP0.y - G.wheelR);
