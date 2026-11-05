import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  SHIN,
  THIGH,
  clamp,
  hipHeight,
  keyed,
  mix,
  mixAngle,
  ramp,
  walkLeg,
  type Leg,
} from "@/lib/landing-journey";

// A scale model of a registry office on a dark stage. The visitor's scroll drives one continuous
// shot: she walks in, waits, is served and rates the visit on her phone. Loaded on demand so the
// 3D library never weighs on the page's first paint; all of it is illustration, no product data.

const color = {
  stone: "#ece4d3",
  stoneDark: "#c9bda6",
  wall: "#43556f",
  wainscot: "#6f5236",
  floor: "#8c7b62",
  floorDark: "#2a3650",
  paving: "#3b475e",
  base: "#16233a",
  wood: "#8a6238",
  woodDark: "#5b3f24",
  gold: "#d9b778",
  goldDeep: "#a9843f",
  navy: "#16294a",
  paper: "#f7f5f0",
  leaf: "#3f7a60",
  leafDark: "#2f6450",
  glow: "#ffd58a",
  skinClient: "#9a6240",
  hairClient: "#20140e",
  blouse: "#e0a93f",
  skinClerk: "#d9a982",
  hairClerk: "#3d2a1d",
  blazer: "#efe8d8",
  skinOther: "#bd8a60",
  coatOther: "#6d8099",
  skinElder: "#e0b896",
  hairElder: "#c9c6c0",
  coatElder: "#8a4f5c",
} as const;

const SERIF = '"Source Serif 4", Georgia, serif';
const SANS = "Inter, system-ui, sans-serif";

function standard(hex: string, roughness = 0.75, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, castsShadow = true) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = castsShadow;
  item.receiveShadow = true;
  return item;
}

function block(
  size: [number, number, number],
  at: [number, number, number],
  hex: string,
  parent: THREE.Object3D,
  roughness = 0.8,
) {
  const item = mesh(new THREE.BoxGeometry(...size), standard(hex, roughness));
  item.position.set(...at);
  parent.add(item);
  return item;
}

/** A limb that hangs from its origin: rounded ends, tapering from `top` to `bottom` radius. */
function limb(top: number, bottom: number, length: number, hex: string) {
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(bottom * Math.sin(angle), -length - bottom * Math.cos(angle)));
  }
  for (let i = 6; i >= 0; i--) {
    const angle = (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(top * Math.sin(angle), top * Math.cos(angle)));
  }
  return mesh(new THREE.LatheGeometry(points, 16), standard(hex, 0.7));
}

function lathe(profile: Array<[number, number]>, hex: string, squash = 1) {
  const spline = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const points = spline.getPoints(28).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  const item = mesh(new THREE.LatheGeometry(points, 24), standard(hex, 0.68));
  item.scale.z = squash;
  return item;
}

function ellipsoid(radii: [number, number, number], hex: string, roughness = 0.65) {
  const item = mesh(new THREE.SphereGeometry(1, 24, 18), standard(hex, roughness));
  item.scale.set(...radii);
  return item;
}

type Side = {
  thigh: THREE.Group;
  shin: THREE.Group;
  foot: THREE.Group;
  upper: THREE.Group;
  fore: THREE.Group;
  hand: THREE.Group;
};
type Figure = {
  root: THREE.Group;
  spine: THREE.Group;
  head: THREE.Group;
  left: Side;
  right: Side;
};
type Look = {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  shoe: string;
  hairStyle: "long" | "short" | "bun";
  shirt?: string;
  flare?: boolean;
};

function createFigure(look: Look): Figure {
  const root = new THREE.Group();

  const side = (sign: 1 | -1): Side => {
    const thigh = new THREE.Group();
    thigh.position.set(sign * 0.088, 0, 0);
    root.add(thigh);
    thigh.add(limb(0.085, 0.062, THIGH, look.bottom));
    const shin = new THREE.Group();
    shin.position.y = -THIGH;
    thigh.add(shin);
    shin.add(limb(0.062, look.flare ? 0.075 : 0.05, SHIN - 0.02, look.bottom));
    const foot = new THREE.Group();
    foot.position.y = -SHIN;
    shin.add(foot);
    const shoe = mesh(new RoundedBoxGeometry(0.09, 0.07, 0.25, 4, 0.03), standard(look.shoe, 0.45));
    shoe.position.set(0, -0.035, 0.065);
    foot.add(shoe);

    const upper = new THREE.Group();
    upper.position.set(sign * 0.18, 0.46, 0);
    upper.rotation.z = sign * 0.05;
    const fore = new THREE.Group();
    fore.position.y = -0.29;
    const hand = new THREE.Group();
    hand.position.y = -0.25;
    upper.add(limb(0.052, 0.042, 0.28, look.top));
    fore.add(limb(0.042, 0.032, 0.24, look.top));
    const palm = ellipsoid([0.032, 0.05, 0.024], look.skin);
    palm.position.y = -0.03;
    hand.add(palm);
    fore.add(hand);
    upper.add(fore);
    return { thigh, shin, foot, upper, fore, hand };
  };
  const left = side(1);
  const right = side(-1);

  const spine = new THREE.Group();
  spine.position.y = 0.03;
  root.add(spine);
  spine.add(
    lathe(
      [
        [0, -0.1],
        [0.125, -0.085],
        [0.15, 0],
        [0.128, 0.2],
        [0.155, 0.38],
        [0.165, 0.46],
        [0.08, 0.525],
        [0, 0.535],
      ],
      look.top,
      0.66,
    ),
  );
  spine.add(left.upper, right.upper);
  if (look.shirt) {
    const collar = ellipsoid([0.05, 0.11, 0.02], look.shirt);
    collar.position.set(0, 0.42, 0.095);
    spine.add(collar);
  }
  const neck = mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.12, 12), standard(look.skin, 0.7));
  neck.position.y = 0.55;
  spine.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.59;
  spine.add(head);
  const skull = ellipsoid([0.09, 0.112, 0.102], look.skin);
  skull.position.y = 0.1;
  head.add(skull);
  const nose = ellipsoid([0.014, 0.02, 0.016], look.skin);
  nose.position.set(0, 0.09, 0.102);
  head.add(nose);
  const cap = ellipsoid([0.097, 0.1, 0.104], look.hair, 0.55);
  cap.position.set(0, 0.135, -0.018);
  head.add(cap);
  if (look.hairStyle === "long") {
    const fall = ellipsoid([0.105, 0.17, 0.07], look.hair, 0.55);
    fall.position.set(0, 0.02, -0.062);
    head.add(fall);
  }
  if (look.hairStyle === "bun") {
    const bun = ellipsoid([0.05, 0.05, 0.05], look.hair, 0.55);
    bun.position.set(0, 0.2, -0.08);
    head.add(bun);
  }
  return { root, spine, head, left, right };
}

type Body = {
  legL: Leg;
  legR: Leg;
  shL: number;
  elL: number;
  shR: number;
  elR: number;
  lean: number;
  twist: number;
  roll: number;
  headYaw: number;
  headPitch: number;
};

const easyLeg: Leg = { hip: 0.02, knee: 0.05, ankle: 0 };
const seatedLeg: Leg = { hip: 1.5, knee: 1.5, ankle: 0 };
const mixLeg = (a: Leg, b: Leg, t: number): Leg => ({
  hip: mix(a.hip, b.hip, t),
  knee: mix(a.knee, b.knee, t),
  ankle: mix(a.ankle, b.ankle, t),
});
const easyBody: Body = {
  legL: easyLeg,
  legR: { hip: -0.03, knee: 0.04, ankle: 0 },
  shL: 0.05,
  elL: 0.2,
  shR: 0.05,
  elR: 0.2,
  lean: 0,
  twist: 0,
  roll: 0,
  headYaw: 0,
  headPitch: 0,
};

function applyBody(figure: Figure, body: Body) {
  figure.root.position.y = hipHeight(body.legL, body.legR);
  const leg = (side: Side, value: Leg) => {
    side.thigh.rotation.x = -value.hip;
    side.shin.rotation.x = value.knee;
    // The foot stays level with the floor, apart from the push-off and the heel strike.
    side.foot.rotation.x = value.hip - value.knee + value.ankle;
  };
  leg(figure.left, body.legL);
  leg(figure.right, body.legR);
  figure.left.upper.rotation.x = -body.shL;
  figure.left.fore.rotation.x = -body.elL;
  figure.right.upper.rotation.x = -body.shR;
  figure.right.fore.rotation.x = -body.elR;
  figure.spine.rotation.set(body.lean, body.twist, body.roll);
  figure.head.rotation.set(body.headPitch - body.lean * 0.7, body.headYaw - body.twist, -body.roll);
}

const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);

type Walk = {
  from: number;
  to: number;
  curve: THREE.CatmullRomCurve3;
  length: number;
  before: number;
};

function createWalks(segments: Array<{ from: number; to: number; path: Array<[number, number]> }>) {
  let travelled = 0;
  return segments.map((segment): Walk => {
    const curve = new THREE.CatmullRomCurve3(
      segment.path.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    );
    const length = curve.getLength();
    const walk = { from: segment.from, to: segment.to, curve, length, before: travelled };
    travelled += length;
    return walk;
  });
}

const walks = createWalks([
  {
    from: 0.015,
    to: 0.262,
    path: [
      [-8.6, 0.25],
      [-5.5, 0.05],
      [-1.2, 0],
      [1, -0.05],
      [3, -0.7],
      [4.3, -1.72],
    ],
  },
  {
    from: 0.505,
    to: 0.572,
    path: [
      [4.3, -1.72],
      [5.6, -1.15],
      [8, -1.2],
      [9.32, -1.3],
    ],
  },
  {
    from: 0.72,
    to: 0.852,
    path: [
      [9.32, -1.3],
      [9.08, -0.2],
      [9.6, 1.25],
      [11.4, 1.6],
      [12.55, 1.6],
    ],
  },
]);

/** Her place on the floor, the way she faces and how much she is walking. */
function clientPlace(story: number) {
  for (const [index, walk] of walks.entries()) {
    const next = walks[index + 1];
    if (story < walk.from || (next && story >= next.from)) continue;
    const t = clamp((story - walk.from) / (walk.to - walk.from));
    // A short acceleration and stop; the stride follows the distance, so the feet never skate.
    const eased = mix(t, t * t * (3 - 2 * t), 0.45);
    const point = walk.curve.getPointAt(eased);
    const tangent = walk.curve.getTangentAt(eased);
    const weight = ramp(story, walk.from, walk.from + 0.012) * (1 - ramp(t, 0.94, 1));
    return {
      x: point.x,
      z: point.z,
      path: yawOf(tangent.x, tangent.z),
      weight,
      distance: walk.before + eased * walk.length,
    };
  }
  const first = walks[0]?.curve.getPointAt(0) ?? new THREE.Vector3();
  return { x: first.x, z: first.z, path: Math.PI / 2, weight: 0, distance: 0 };
}

const STRIDE = 1.5;

/** Direction she faces when not walking. */
function restingYaw(story: number, path: number) {
  if (story < 0.262) return path;
  if (story < 0.3) return mixAngle(path, 0, ramp(story, 0.262, 0.292));
  if (story < 0.54) return 0;
  return Math.PI / 2;
}

const rightArmReach: ReadonlyArray<readonly [number, number]> = [
  [0.635, 0.05],
  [0.662, 0.95],
  [0.674, 0.95],
  [0.7, 0.55],
  [0.722, 0.25],
  [0.852, 0.25],
  [0.872, 0.12],
  [0.905, 1.02],
];
const rightElbowReach: ReadonlyArray<readonly [number, number]> = [
  [0.635, 0.2],
  [0.662, 0.26],
  [0.674, 0.26],
  [0.7, 1.25],
  [0.722, 1.0],
  [0.852, 1.0],
  [0.872, 0.4],
  [0.905, 1.2],
];
const clerkShoulder: ReadonlyArray<readonly [number, number]> = [
  [0.57, 0.35],
  [0.592, 1.38],
  [0.606, 0.72],
  [0.618, 0.72],
  [0.632, 1.1],
  [0.648, 1.02],
  [0.664, 1.02],
  [0.69, 0.3],
];
const clerkElbow: ReadonlyArray<readonly [number, number]> = [
  [0.57, 1.15],
  [0.592, 1.6],
  [0.606, 0.75],
  [0.618, 0.75],
  [0.632, 0.7],
  [0.648, 0.25],
  [0.664, 0.25],
  [0.69, 1.05],
];

function clientBody(story: number, place: ReturnType<typeof clientPlace>): Body {
  const phase = (place.distance / STRIDE) * Math.PI * 2;
  const walking = place.weight;
  const sit = ramp(story, 0.292, 0.335) * (1 - ramp(story, 0.462, 0.505));
  const rising = Math.sin(Math.PI * clamp(sit));
  const rest = mixLeg(easyLeg, seatedLeg, sit);
  const swingL = 0.34 * Math.sin(phase + Math.PI);
  const swingR = 0.34 * Math.sin(phase);
  const holding = ramp(story, 0.635, 0.645);
  const reachSh = keyed(rightArmReach, story);
  const reachEl = keyed(rightElbowReach, story);
  const lap = 0.55;
  const armRest = mix(0.05, lap, sit);
  const elbowRest = mix(0.2, 1.05, sit);
  const shR = mix(mix(armRest, swingR, walking), reachSh, holding);
  const elR = mix(mix(elbowRest, 0.28 + Math.max(0, swingR) * 0.5, walking), reachEl, holding);
  return {
    legL: mixLeg(rest, walkLeg(phase), walking),
    legR: mixLeg(mixLeg(easyBody.legR, seatedLeg, sit), walkLeg(phase + Math.PI), walking),
    shL: mix(armRest, swingL, walking),
    elL: mix(elbowRest, 0.28 + Math.max(0, swingL) * 0.5, walking),
    shR,
    elR,
    lean:
      0.05 * walking +
      rising * 0.42 +
      keyed(
        [
          [0.64, 0],
          [0.662, 0.09],
          [0.7, 0],
        ],
        story,
      ),
    twist: 0.1 * Math.sin(phase) * walking,
    roll: 0.018 * Math.cos(phase) * walking,
    headYaw: keyed(
      [
        [0.34, 0],
        [0.4, 0.62],
        [0.48, 0.62],
        [0.5, 0],
      ],
      story,
    ),
    headPitch: keyed(
      [
        [0.34, 0],
        [0.4, -0.2],
        [0.48, -0.2],
        [0.5, 0],
        [0.66, 0.12],
        [0.7, 0.2],
        [0.72, 0],
        [0.89, 0],
        [0.91, 0.2],
      ],
      story,
    ),
  };
}

function drawn(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) paint(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function glowTexture() {
  return drawn(256, 256, (ctx) => {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.32)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  });
}

const qrRows = [
  "11111110010111111",
  "10000010110100001",
  "10111010001101101",
  "10111010101101101",
  "10111010011101101",
  "10000010110100001",
  "11111110101111111",
  "00000000110000000",
  "11011011010110110",
  "01100100101001011",
  "10101111100111010",
  "00000000101010110",
  "11111110011011001",
  "10000010110110100",
  "10111010101001111",
  "10000010011100010",
  "11111110110101101",
];

/**
 * Melds everything that never moves into a few meshes per stretch of the building, one colour per
 * vertex, so the whole office costs a handful of draw calls and off-screen stretches are skipped.
 * Textured, transparent and moving objects stay as they are.
 */
function bakeStillObjects(scene: THREE.Scene, moving: Set<THREE.Object3D>) {
  scene.updateMatrixWorld(true);
  const found: THREE.Mesh[] = [];
  const collect = (object: THREE.Object3D) => {
    if (moving.has(object)) return;
    if (object instanceof THREE.Mesh) {
      const material = object.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      if (!material.map && !material.transparent) found.push(object);
    }
    object.children.forEach(collect);
  };
  collect(scene);

  type Bucket = { parts: THREE.BufferGeometry[]; material: THREE.Material; castsShadow: boolean };
  const buckets = new Map<string, Bucket>();
  const box = new THREE.Box3();
  const centre = new THREE.Vector3();
  for (const item of found) {
    const source = item.material as THREE.MeshStandardMaterial;
    const lit = item.material instanceof THREE.MeshStandardMaterial;
    const part = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone();
    part.deleteAttribute("uv");
    part.applyMatrix4(item.matrixWorld);
    const count = part.getAttribute("position").count;
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) source.color.toArray(colours, i * 3);
    part.setAttribute("color", new THREE.BufferAttribute(colours, 3));

    box.setFromObject(item).getCenter(centre);
    const stretch = Math.floor((centre.x + 12) / 7);
    const rough = lit ? (source.roughness < 0.45 ? 0.4 : source.roughness < 0.7 ? 0.6 : 0.8) : 0;
    const metal = lit && source.metalness > 0 ? 0.6 : 0;
    const flat = lit && source.flatShading;
    const key = [stretch, lit, rough, metal, flat, source.toneMapped, item.castShadow].join();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        parts: [],
        castsShadow: item.castShadow,
        material: lit
          ? new THREE.MeshStandardMaterial({
              vertexColors: true,
              roughness: rough,
              metalness: metal,
              flatShading: flat,
            })
          : new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: source.toneMapped }),
      };
      buckets.set(key, bucket);
    }
    bucket.parts.push(part);
    item.removeFromParent();
    item.geometry.dispose();
    source.dispose();
  }

  const baked: THREE.Mesh[] = [];
  for (const { parts, material, castsShadow } of buckets.values()) {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!geometry) continue;
    const merged = new THREE.Mesh(geometry, material);
    merged.castShadow = castsShadow;
    merged.receiveShadow = material instanceof THREE.MeshStandardMaterial;
    merged.matrixAutoUpdate = false;
    scene.add(merged);
    baked.push(merged);
  }
  return baked;
}

function createWorld(scene: THREE.Scene) {
  const glow = glowTexture();
  const halo = (x: number, y: number, z: number, size: number, opacity = 0.75) => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: color.glow,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(size, size, 1);
    scene.add(sprite);
  };

  // Plinth of the model and the gold light pool it stands on.
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 30),
    new THREE.MeshBasicMaterial({
      map: glow,
      color: color.goldDeep,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(2.5, -0.62, 0);
  scene.add(pool);
  block([26.6, 0.5, 7.4], [2.1, -0.3, 0], color.base, scene);

  // Street.
  block([11.4, 0.06, 6.9], [-5.8, -0.03, 0], color.paving, scene);
  for (let x = -11; x < 0; x += 1.3) {
    block([0.03, 0.005, 6.9], [x, 0.002, 0], color.base, scene);
  }
  const tree = (x: number, z: number, scale: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    const trunk = mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.9, 10), standard(color.woodDark));
    trunk.position.y = 0.95;
    group.add(trunk);
    const crowns: Array<[number, number, number, number, string]> = [
      [0, 2.7, 0, 1.05, color.leaf],
      [-0.62, 2.2, 0.2, 0.68, color.leafDark],
      [0.6, 2.25, -0.15, 0.72, color.leafDark],
    ];
    for (const [cx, cy, cz, radius, hex] of crowns) {
      const material = standard(hex, 0.9);
      material.flatShading = true;
      const crown = mesh(new THREE.IcosahedronGeometry(radius, 2), material);
      crown.position.set(cx, cy, cz);
      group.add(crown);
    }
    scene.add(group);
  };
  tree(-8.2, -2.4, 1);
  tree(-3.5, -2.55, 0.86);
  const lamp = (x: number, z: number) => {
    const post = mesh(
      new THREE.CylinderGeometry(0.035, 0.05, 3, 10),
      standard(color.navy, 0.4, 0.5),
    );
    post.position.set(x, 1.5, z);
    scene.add(post);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      new THREE.MeshBasicMaterial({ color: "#fff1cf", toneMapped: false }),
    );
    bulb.position.set(x, 3.05, z);
    scene.add(bulb);
    halo(x, 3.05, z, 2.2);
    const light = new THREE.PointLight(color.glow, 7, 7, 1.8);
    light.position.set(x, 2.9, z);
    scene.add(light);
  };
  lamp(-6, -2.6);
  block([1.5, 0.08, 0.42], [-5.4, 0.45, -2.75], color.wood, scene);
  block([1.5, 0.45, 0.06], [-5.4, 0.72, -2.96], color.wood, scene);
  block([0.08, 0.45, 0.4], [-6, 0.22, -2.75], color.navy, scene);
  block([0.08, 0.45, 0.4], [-4.8, 0.22, -2.75], color.navy, scene);

  // Interior shell, open to the camera like a cutaway model.
  block([15.1, 0.06, 6.9], [7.55, -0.03, 0], color.floor, scene, 0.5);
  block([15.1, 3.7, 0.24], [7.55, 1.85, -3.33], color.wall, scene);
  block([15.1, 1, 0.03], [7.55, 0.5, -3.195], color.wainscot, scene);
  block([15.1, 0.04, 0.05], [7.55, 1.02, -3.19], color.gold, scene, 0.4);
  block([0.24, 3.7, 6.9], [15.22, 1.85, 0], color.wall, scene);

  // Façade: portico, columns, pediment and the name over the door, seen from the street.
  block([0.3, 3.95, 2.65], [-0.15, 1.97, -2.12], color.stone, scene);
  block([0.3, 3.95, 2.65], [-0.15, 1.97, 2.12], color.stone, scene);
  block([0.3, 1.45, 1.6], [-0.15, 3.22, 0], color.stone, scene);
  block([1.3, 0.72, 7.1], [-0.5, 4.21, 0], color.stoneDark, scene);
  for (const z of [-2.75, -1.15, 1.15, 2.75]) {
    const column = mesh(new THREE.CylinderGeometry(0.135, 0.16, 3.8, 18), standard(color.stone));
    column.position.set(-0.88, 1.9, z);
    scene.add(column);
    block([0.42, 0.1, 0.42], [-0.88, 0.05, z], color.stoneDark, scene);
    block([0.42, 0.1, 0.42], [-0.88, 3.8, z], color.stoneDark, scene);
  }
  const gable = new THREE.Shape();
  gable.moveTo(-3.65, 0);
  gable.lineTo(0, 1.25);
  gable.lineTo(3.65, 0);
  gable.closePath();
  const pediment = mesh(
    new THREE.ExtrudeGeometry(gable, { depth: 1.1, bevelEnabled: false }),
    standard(color.stone),
  );
  pediment.rotation.y = -Math.PI / 2;
  pediment.position.set(0.1, 4.57, 0);
  scene.add(pediment);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.64),
    new THREE.MeshBasicMaterial({
      map: drawn(1024, 205, (ctx) => {
        ctx.fillStyle = color.navy;
        ctx.fillRect(0, 0, 1024, 205);
        ctx.strokeStyle = color.gold;
        ctx.lineWidth = 5;
        ctx.strokeRect(14, 14, 996, 177);
        ctx.fillStyle = color.paper;
        ctx.font = `700 118px ${SERIF}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = "14px";
        ctx.fillText("CARTÓRIO", 512, 108);
      }),
    }),
  );
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(-1.16, 4.21, 0);
  scene.add(sign);
  for (const z of [-2, 2]) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 1.85),
      new THREE.MeshBasicMaterial({ color: "#f6c877" }),
    );
    pane.rotation.y = -Math.PI / 2;
    pane.position.set(-0.305, 1.45, z);
    scene.add(pane);
    block([0.03, 1.9, 0.05], [-0.315, 1.45, z], color.woodDark, scene);
    block([0.03, 0.05, 0.96], [-0.315, 1.5, z], color.woodDark, scene);
    halo(-0.5, 1.45, z, 2.2, 0.28);
  }
  const leaf = (sign: 1 | -1) => {
    const hinge = new THREE.Group();
    hinge.position.set(-0.02, 0, sign * 0.8);
    const panel = block([0.08, 2.48, 0.8], [0, 1.24, -sign * 0.4], color.wood, hinge, 0.5);
    panel.castShadow = true;
    block([0.1, 0.9, 0.56], [0, 1.8, -sign * 0.4], color.woodDark, hinge, 0.5);
    block([0.1, 0.9, 0.56], [0, 0.72, -sign * 0.4], color.woodDark, hinge, 0.5);
    scene.add(hinge);
    return hinge;
  };
  const doorL = leaf(1);
  const doorR = leaf(-1);

  // Wall lights give the room its warmth.
  for (const x of [2.8, 7.2, 12]) {
    const sconce = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 12),
      new THREE.MeshBasicMaterial({ color: "#fff1cf", toneMapped: false }),
    );
    sconce.position.set(x, 3.15, -3.05);
    scene.add(sconce);
    halo(x, 3.15, -3, 2.8, 0.55);
    const light = new THREE.PointLight(color.glow, 10, 9, 1.7);
    light.position.set(x, 2.8, -2);
    scene.add(light);
  }

  // Waiting area.
  const chair = (x: number) => {
    const group = new THREE.Group();
    group.position.set(x, 0, -2.2);
    const seat = mesh(new RoundedBoxGeometry(0.48, 0.07, 0.46, 3, 0.03), standard(color.navy, 0.4));
    seat.position.y = 0.47;
    group.add(seat);
    const back = mesh(new RoundedBoxGeometry(0.48, 0.5, 0.05, 3, 0.02), standard(color.navy, 0.4));
    back.position.set(0, 0.78, -0.24);
    group.add(back);
    for (const [lx, lz] of [
      [-0.2, -0.19],
      [0.2, -0.19],
      [-0.2, 0.19],
      [0.2, 0.19],
    ] as const) {
      const leg = mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.46, 8),
        standard(color.gold, 0.3, 0.7),
      );
      leg.position.set(lx, 0.23, lz);
      group.add(leg);
    }
    scene.add(group);
  };
  [2.2, 3.25, 4.3, 5.35].forEach(chair);

  const seated = (x: number, look: Look, headYaw: number) => {
    const figure = createFigure(look);
    figure.root.position.set(x, 0, -2.2);
    scene.add(figure.root);
    applyBody(figure, {
      ...easyBody,
      legL: seatedLeg,
      legR: seatedLeg,
      shL: 0.55,
      elL: 1.05,
      shR: 0.55,
      elR: 1.05,
      headYaw,
    });
  };
  seated(
    2.2,
    {
      skin: color.skinOther,
      hair: color.hairClerk,
      top: color.coatOther,
      bottom: "#2a3347",
      shoe: color.woodDark,
      hairStyle: "short",
    },
    0.3,
  );
  seated(
    3.25,
    {
      skin: color.skinElder,
      hair: color.hairElder,
      top: color.coatElder,
      bottom: "#3a3a48",
      shoe: "#2a2a30",
      hairStyle: "bun",
    },
    -0.25,
  );

  // Ticket display.
  const paintTicket = (number: string, active: boolean) =>
    drawn(640, 380, (ctx) => {
      ctx.fillStyle = color.navy;
      ctx.fillRect(0, 0, 640, 380);
      ctx.fillStyle = color.paper;
      ctx.textAlign = "center";
      ctx.font = `600 54px ${SANS}`;
      ctx.fillText("Senha", 320, 96);
      ctx.fillStyle = active ? "#ffd27a" : color.gold;
      ctx.font = `700 196px ${SERIF}`;
      ctx.fillText(number, 320, 292);
    });
  const ticketWaiting = paintTicket("041", false);
  const ticketCalled = paintTicket("042", true);
  const ticket = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.01),
    new THREE.MeshBasicMaterial({ map: ticketWaiting }),
  );
  ticket.position.set(7.1, 2.3, -3.17);
  scene.add(ticket);
  block([1.8, 1.11, 0.04], [7.1, 2.3, -3.2], color.gold, scene);

  // Wall clock; the minute hand follows the wait.
  const face = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 40), standard(color.paper, 0.4));
  face.rotation.x = Math.PI / 2;
  face.position.set(3.2, 2.5, -3.18);
  scene.add(face);
  const rim = mesh(new THREE.TorusGeometry(0.42, 0.028, 10, 48), standard(color.navy, 0.3));
  rim.position.set(3.2, 2.5, -3.15);
  scene.add(rim);
  block([0.03, 0.2, 0.012], [3.2, 2.59, -3.14], color.navy, scene);
  const minuteHand = new THREE.Group();
  minuteHand.position.set(3.2, 2.5, -3.135);
  block([0.022, 0.32, 0.012], [0, 0.15, 0], color.goldDeep, minuteHand);
  scene.add(minuteHand);

  // Plant by the waiting area.
  const pot = mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.5, 20), standard(color.woodDark));
  pot.position.set(6.3, 0.25, -2.75);
  scene.add(pot);
  for (let i = 0; i < 7; i++) {
    const blade = ellipsoid([0.075, 0.55, 0.018], i % 2 ? color.leaf : color.leafDark);
    const angle = (i / 7) * Math.PI * 2;
    blade.position.set(6.3 + Math.cos(angle) * 0.14, 0.95, -2.75 + Math.sin(angle) * 0.14);
    blade.rotation.set(Math.sin(angle) * 0.42, -angle, -Math.cos(angle) * 0.42);
    scene.add(blade);
  }

  // Counter, the registry's books behind it, and the clerk's desk things.
  block([0.7, 1.02, 3.72], [10.1, 0.51, -1.34], color.wood, scene, 0.55);
  block([0.82, 0.05, 3.82], [10.1, 1.045, -1.34], color.stone, scene, 0.35);
  for (let shelf = 0; shelf < 3; shelf++) {
    const y = 1.45 + shelf * 0.72;
    block([3.8, 0.04, 0.3], [13, y - 0.03, -3.05], color.woodDark, scene);
    for (let i = 0; i < 22; i++) {
      const palette = [color.navy, "#8d7a55", "#4d6a5b", "#6d4444"] as const;
      const hex = palette[(i * 7 + shelf * 3) % palette.length] ?? color.navy;
      const height = 0.46 + ((i * 13 + shelf * 5) % 5) * 0.035;
      block([0.145, height, 0.22], [11.25 + i * 0.165, y + height / 2, -3.03], hex, scene, 0.6);
    }
  }
  const monitor = mesh(
    new RoundedBoxGeometry(0.06, 0.34, 0.54, 3, 0.02),
    standard("#1b2436", 0.35),
  );
  monitor.position.set(10.36, 1.32, -2.35);
  scene.add(monitor);
  block([0.04, 0.12, 0.05], [10.36, 1.1, -2.35], "#1b2436", scene);
  block([0.26, 0.09, 0.34], [10.3, 1.115, -2.95], color.navy, scene);
  block([0.25, 0.06, 0.33], [10.3, 1.19, -2.95], color.goldDeep, scene);

  const doc = new THREE.Group();
  block([0.21, 0.006, 0.3], [0, 0, 0], color.paper, doc, 0.9);
  const seal = mesh(
    new THREE.CylinderGeometry(0.038, 0.038, 0.004, 24),
    standard(color.goldDeep, 0.4),
  );
  seal.position.set(0.02, 0.005, 0.07);
  doc.add(seal);
  doc.position.set(10.2, 1.074, -1.3);
  scene.add(doc);

  // Stand with the QR Code she points her phone at.
  const stand = new THREE.Group();
  stand.position.set(13.7, 0, 1.6);
  const pole = mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 1.05, 10),
    standard(color.gold, 0.3, 0.7),
  );
  pole.position.y = 0.525;
  stand.add(pole);
  const standBase = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), standard(color.navy, 0.4));
  standBase.position.y = 0.015;
  stand.add(standBase);
  const board = mesh(
    new RoundedBoxGeometry(0.03, 0.72, 0.52, 3, 0.012),
    standard(color.paper, 0.5),
  );
  board.position.y = 1.32;
  stand.add(board);
  const qrFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.7),
    new THREE.MeshBasicMaterial({
      map: drawn(500, 700, (ctx) => {
        ctx.fillStyle = color.paper;
        ctx.fillRect(0, 0, 500, 700);
        ctx.fillStyle = color.navy;
        ctx.textAlign = "center";
        ctx.font = `700 50px ${SERIF}`;
        ctx.fillText("CartoQuali", 250, 86);
        qrRows.forEach((row, y) => {
          [...row].forEach((cell, x) => {
            if (cell === "1") ctx.fillRect(71 + x * 21, 130 + y * 21, 21, 21);
          });
        });
        ctx.font = `600 34px ${SANS}`;
        ctx.fillText("Aponte a câmera", 250, 548);
        ctx.font = `400 28px ${SANS}`;
        ctx.fillText("e conte como foi", 250, 596);
      }),
    }),
  );
  qrFace.rotation.y = -Math.PI / 2;
  qrFace.position.set(-0.018, 1.32, 0);
  stand.add(qrFace);
  scene.add(stand);

  return {
    doorL,
    doorR,
    doc,
    seal,
    ticket,
    ticketWaiting,
    ticketCalled,
    minuteHand,
  };
}

type Screen = "ask" | "thanks";

function paintPhone(stars: number, pressed: boolean, screen: Screen) {
  return (ctx: CanvasRenderingContext2D) => {
    const w = 480;
    const h = 960;
    ctx.fillStyle = "#fbf9f5";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    if (screen === "thanks") {
      ctx.fillStyle = "#3f8a68";
      ctx.beginPath();
      ctx.arc(w / 2, 330, 84, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 17;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(w / 2 - 38, 332);
      ctx.lineTo(w / 2 - 8, 364);
      ctx.lineTo(w / 2 + 42, 298);
      ctx.stroke();
      ctx.fillStyle = color.navy;
      ctx.font = `700 50px ${SERIF}`;
      ctx.fillText("Obrigado pela", w / 2, 500);
      ctx.fillText("avaliação!", w / 2, 560);
      ctx.fillStyle = "#59647a";
      ctx.font = `400 28px ${SANS}`;
      ctx.fillText("Sua opinião ajuda o", w / 2, 640);
      ctx.fillText("cartório a melhorar.", w / 2, 678);
      return;
    }
    ctx.fillStyle = color.navy;
    ctx.font = `700 52px ${SERIF}`;
    ctx.fillText("CartoQuali", w / 2, 170);
    ctx.font = `500 35px ${SANS}`;
    ctx.fillText("Como foi sua", w / 2, 330);
    ctx.fillText("experiência hoje?", w / 2, 378);
    for (let i = 0; i < 5; i++) {
      const cx = w / 2 + (i - 2) * 80;
      ctx.fillStyle = i < stars ? "#e0a93f" : "#dcd6c9";
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const radius = p % 2 === 0 ? 34 : 14.5;
        const angle = (Math.PI / 5) * p - Math.PI / 2;
        ctx.lineTo(cx + radius * Math.cos(angle), 490 + radius * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = pressed ? color.navy : "#2c4f86";
    ctx.beginPath();
    ctx.roundRect(62, 610, w - 124, 92, 18);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 33px ${SANS}`;
    ctx.fillText("Enviar avaliação", w / 2, 668);
  };
}

function createPhone(scene: THREE.Scene) {
  const group = new THREE.Group();
  const body = mesh(
    new RoundedBoxGeometry(0.1, 0.2, 0.012, 4, 0.006),
    standard("#10172a", 0.25, 0.4),
  );
  group.add(body);
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 960;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.186),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  screen.position.z = 0.0065;
  group.add(screen);
  group.visible = false;
  scene.add(group);
  let shown = "";
  const paint = (stars: number, pressed: boolean, state: Screen) => {
    const key = `${stars}-${pressed}-${state}`;
    if (key === shown) return;
    shown = key;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintPhone(stars, pressed, state)(ctx);
    texture.needsUpdate = true;
  };
  return { group, paint };
}

type Shot = { at: number; position: [number, number, number]; target: [number, number, number] };

const shots: Shot[] = [
  { at: 0, position: [-16.5, 4.6, 12], target: [-5.2, 2.1, 0] },
  { at: 0.09, position: [-12, 3.4, 11], target: [-2.8, 2.2, 0] },
  { at: 0.17, position: [-7.2, 2.8, 12.5], target: [-0.5, 2.3, 0] },
  { at: 0.24, position: [1.6, 3, 13], target: [3.2, 1.45, -0.7] },
  { at: 0.32, position: [3.8, 2.5, 10.5], target: [4.2, 1.35, -1.6] },
  { at: 0.46, position: [5.2, 2.2, 8.4], target: [5.2, 1.5, -1.8] },
  { at: 0.54, position: [8.2, 2.6, 8.8], target: [9, 1.3, -1.1] },
  { at: 0.61, position: [9.7, 2.4, 6.1], target: [9.9, 1.25, -1.25] },
  { at: 0.7, position: [9.75, 2.25, 5.2], target: [9.85, 1.25, -1.25] },
  { at: 0.78, position: [10.2, 2.7, 9.6], target: [11.2, 1.25, 0.6] },
  { at: 0.86, position: [11.2, 2.05, 6.4], target: [12.8, 1.2, 1.5] },
  { at: 0.92, position: [11.5, 1.8, 5.4], target: [12.9, 1.2, 1.6] },
];

const shotPositions = new THREE.CatmullRomCurve3(
  shots.map((s) => new THREE.Vector3(...s.position)),
);
const shotTargets = new THREE.CatmullRomCurve3(shots.map((s) => new THREE.Vector3(...s.target)));

/** Position along the shot list, moving evenly from one framing to the next. */
function shotParameter(story: number) {
  const last = shots.length - 1;
  for (let i = 0; i < last; i++) {
    const from = shots[i];
    const to = shots[i + 1];
    if (from && to && story <= to.at) {
      return (i + clamp((story - from.at) / (to.at - from.at))) / last;
    }
  }
  return 1;
}

export type JourneyScene = {
  setStory: (story: number) => void;
  start: () => void;
  stop: () => void;
  renderOnce: () => void;
  dispose: () => void;
};

/** Lets the browser breathe between building steps, so the page keeps scrolling meanwhile. */
function breather() {
  return new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 300 });
    } else {
      setTimeout(resolve, 30);
    }
  });
}

export async function createJourneyScene(canvas: HTMLCanvasElement): Promise<JourneyScene> {
  const small = window.innerWidth < 768;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  let pixelRatio = Math.min(window.devicePixelRatio, small ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = small ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  // Redrawn only when something moves, instead of on every frame.
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  await breather();
  const world = createWorld(scene);
  await breather();
  const baked = bakeStillObjects(
    scene,
    new Set<THREE.Object3D>([world.doorL, world.doorR, world.doc, world.minuteHand]),
  );
  await breather();

  scene.add(new THREE.HemisphereLight("#b9c9e6", "#1a2437", 1.25));
  const key = new THREE.DirectionalLight("#fff0d8", 3.1);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  key.shadow.camera.left = -11;
  key.shadow.camera.right = 11;
  key.shadow.camera.top = 9;
  key.shadow.camera.bottom = -9;
  key.shadow.camera.far = 40;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.025;
  scene.add(key, key.target);
  const streetFill = new THREE.DirectionalLight("#ffe6c2", 1.3);
  streetFill.position.set(-12, 4, 3);
  scene.add(streetFill);
  const rim = new THREE.DirectionalLight("#7f9fd8", 0.9);
  rim.position.set(6, 6, -10);
  scene.add(rim);

  const client = createFigure({
    skin: color.skinClient,
    hair: color.hairClient,
    top: color.blouse,
    bottom: color.navy,
    shoe: "#3a2415",
    hairStyle: "long",
    flare: true,
  });
  scene.add(client.root);
  const bag = mesh(
    new RoundedBoxGeometry(0.09, 0.22, 0.27, 3, 0.03),
    standard(color.woodDark, 0.5),
  );
  bag.position.set(0.215, 0.02, -0.03);
  client.spine.add(bag);
  const strap = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.36, 6), standard(color.woodDark));
  strap.position.set(0.19, 0.3, -0.03);
  strap.rotation.z = 0.12;
  client.spine.add(strap);

  const handDoc = new THREE.Group();
  block([0.006, 0.3, 0.21], [0, -0.14, 0.03], color.paper, handDoc, 0.9);
  const handSeal = mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.004, 24),
    standard(color.goldDeep, 0.4),
  );
  handSeal.rotation.z = Math.PI / 2;
  handSeal.scale.y = 3;
  handSeal.position.set(0, -0.2, 0.08);
  handDoc.add(handSeal);
  handDoc.visible = false;
  client.right.hand.add(handDoc);

  const clerk = createFigure({
    skin: color.skinClerk,
    hair: color.hairClerk,
    top: color.blazer,
    bottom: "#1d2c48",
    shoe: "#1a1a22",
    hairStyle: "short",
    shirt: color.navy,
  });
  clerk.root.position.set(10.72, 0, -1.3);
  clerk.root.rotation.y = -Math.PI / 2;
  scene.add(clerk.root);
  const stamp = new THREE.Group();
  const stampHandle = mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.09, 14),
    standard(color.woodDark, 0.4),
  );
  stampHandle.position.y = -0.09;
  stamp.add(stampHandle);
  const stampFoot = mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 0.024, 20),
    standard(color.gold, 0.35, 0.5),
  );
  stampFoot.position.y = -0.14;
  stamp.add(stampFoot);
  clerk.left.hand.add(stamp);

  const phone = createPhone(scene);
  phone.paint(0, false, "ask");
  await breather();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 90);
  const handPoint = new THREE.Vector3();
  const heroPoint = new THREE.Vector3();
  // Veil that darkens the room as the phone rises to the front of the shot.
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 3),
    new THREE.MeshBasicMaterial({
      color: "#0a1424",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  veil.position.z = -0.9;
  camera.add(veil);
  scene.add(camera);
  const focus = new THREE.Vector3();
  const pathPoint = new THREE.Vector3();
  const pathTarget = new THREE.Vector3();

  let aspect = 1;
  let width = 1;
  let height = 1;

  function resize() {
    const box = canvas.parentElement ?? canvas;
    width = Math.max(1, box.clientWidth);
    height = Math.max(1, box.clientHeight);
    aspect = width / height;
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function update(story: number) {
    // Her.
    const place = clientPlace(story);
    const facing = mixAngle(restingYaw(story, place.path), place.path, place.weight);
    const sit = ramp(story, 0.292, 0.335) * (1 - ramp(story, 0.462, 0.505));
    // Sitting moves the hips back onto the seat while the feet stay where they are.
    client.root.position.x = place.x;
    client.root.position.z = place.z - (story > 0.27 && story < 0.54 ? sit * 0.48 : 0);
    client.root.rotation.y = facing;
    applyBody(client, clientBody(story, place));
    // The façade door swings as she reaches it.
    const open = ramp(story, 0.135, 0.165) * (1 - ramp(story, 0.215, 0.25));
    world.doorL.rotation.y = -open * 1.75;
    world.doorR.rotation.y = open * 1.75;

    // Waiting room.
    world.minuteHand.rotation.z = -story * Math.PI * 9;
    const called = story >= 0.43;
    const wanted = called ? world.ticketCalled : world.ticketWaiting;
    const ticketMaterial = world.ticket.material as THREE.MeshBasicMaterial;
    if (ticketMaterial.map !== wanted) {
      ticketMaterial.map = wanted;
      ticketMaterial.needsUpdate = true;
    }

    // Counter: the clerk stamps the document and passes it across.
    const stamping = keyed(clerkShoulder, story);
    const stampingElbow = keyed(clerkElbow, story);
    const lean = keyed(
      [
        [0.59, 0.03],
        [0.606, 0.2],
        [0.625, 0.08],
        [0.648, 0.2],
        [0.69, 0.03],
      ],
      story,
    );
    applyBody(clerk, {
      ...easyBody,
      shL: stamping,
      elL: stampingElbow,
      shR: 0.1,
      elR: 0.3,
      lean,
      headPitch: 0.1,
      headYaw: 0,
    });
    clerk.root.visible = story > 0.45 && story < 0.92;
    stamp.visible = story < 0.63;
    world.seal.visible = story >= 0.604;
    const slid = ramp(story, 0.635, 0.655);
    world.doc.position.x = mix(10.2, 9.86, slid);
    const handed = story >= 0.668;
    world.doc.visible = !handed;
    handDoc.visible = handed && story < 0.862;

    // Camera: narrow screens stand further back so the whole room still fits.
    const along = shotParameter(story);
    shotPositions.getPoint(along, pathPoint);
    shotTargets.getPoint(along, pathTarget);
    const back = aspect < 1.25 ? Math.min(2.1, 1.25 / aspect) : 1;
    pathPoint.sub(pathTarget).multiplyScalar(back).add(pathTarget);
    camera.position.copy(pathPoint);
    camera.lookAt(pathTarget);
    camera.updateMatrixWorld(true);
    // Keeps the action clear of the caption: to the right on wide screens, upwards on phones.
    const shiftX = aspect >= 1.25 ? -width * 0.1 : 0;
    const shiftY = aspect < 1.25 ? height * 0.13 : 0;
    camera.setViewOffset(width, height, shiftX, shiftY, width, height);

    // Phone: leaves her hand and rises to the centre of the shot, screen always towards the visitor.
    client.root.updateMatrixWorld(true);
    client.right.hand.getWorldPosition(handPoint);
    handPoint.y -= 0.04;
    const rise = ramp(story, 0.905, 0.94);
    heroPoint.set(aspect >= 1.25 ? 0.05 : 0, 0, aspect >= 1.25 ? -0.62 : -0.82);
    camera.localToWorld(heroPoint);
    phone.group.visible = story >= 0.878;
    phone.group.position.lerpVectors(handPoint, heroPoint, rise);
    phone.group.lookAt(camera.position);
    const veilMaterial = veil.material as THREE.MeshBasicMaterial;
    veilMaterial.opacity = rise * 0.62;
    veil.visible = rise > 0;
    const stars = Math.round(clamp((story - 0.94) / 0.028) * 5);
    const state: Screen = story >= 0.976 ? "thanks" : "ask";
    phone.paint(stars, story >= 0.97 && story < 0.976, state);

    // The key light travels with the action, so its shadows stay sharp where the eye is.
    focus.set(pathTarget.x, 0, 0);
    key.position.set(focus.x - 6, 12, 9);
    key.target.position.copy(focus);
    key.target.updateMatrixWorld();
  }

  let story = 0;
  let shown = 0;
  let frame = 0;
  let last = 0;
  let active = false;
  let measured = 0;
  let slowFrames = 0;
  let frameCount = 0;
  let shadowEvery = 1;
  let quality = 0;

  /** Slower devices give up detail one step at a time; none of these steps recompiles anything. */
  function setQuality(step: number) {
    quality = step;
    // Only the people cast moving shadows; the building's are the least noticed on a small screen.
    if (step >= 1) for (const item of baked) item.castShadow = false;
    if (step >= 1) shadowEvery = 2;
    if (step >= 2 && pixelRatio > 1) {
      pixelRatio = 1;
      renderer.setPixelRatio(1);
      resize();
    }
    if (step >= 3) {
      shadowEvery = 4;
      pixelRatio = Math.min(pixelRatio, 0.8);
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
    renderer.shadowMap.needsUpdate = true;
  }

  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016);
    last = now;
    // Softens wheel steps into one gliding camera move.
    shown += (story - shown) * (1 - Math.exp(-dt * 7));
    if (Math.abs(story - shown) < 0.00005) shown = story;
    update(shown);
    frameCount++;
    if (frameCount % shadowEvery === 0 || shown === story) renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    measured++;
    if (dt > 0.03) slowFrames++;
    if (measured === 30) {
      if (slowFrames > 15 && quality < 3) setQuality(quality + 1);
      measured = 0;
      slowFrames = 0;
    }
    // With the visitor's scroll at rest nothing changes, so nothing is drawn.
    if (shown !== story) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!active || frame) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const observer = new ResizeObserver(() => {
    resize();
    renderer.shadowMap.needsUpdate = true;
    wake();
  });
  observer.observe(canvas.parentElement ?? canvas);
  resize();
  if (small) setQuality(1);
  update(0);

  // Prepares shaders and uploads everything now, while the canvas is still hidden, so that the
  // visitor's first scroll into the story does not pay for it.
  await renderer.compileAsync(scene, camera);
  await breather();
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);

  return {
    setStory(value) {
      story = clamp(value);
      wake();
    },
    start() {
      active = true;
      wake();
    },
    stop() {
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
    },
    renderOnce() {
      shown = story;
      update(story);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    },
    dispose() {
      cancelAnimationFrame(frame);
      frame = 0;
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          const textured = material as THREE.MeshBasicMaterial;
          textured.map?.dispose();
          material.dispose();
        }
      });
      world.ticketWaiting.dispose();
      world.ticketCalled.dispose();
      renderer.dispose();
    },
  };
}
