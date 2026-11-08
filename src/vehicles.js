/* ============================================================
   VEHICLE SILHOUETTES
   Hand-tuned side profiles (facing right) in a 400x160 box.
   Each profile is a list of [x, y, cornerRadius] points tracing the
   outline from the rear sill, up over the roof, to the front sill.
   "S" means "sill height" (set from the wheel size). Wheel arches,
   glass, door seams, lights and wheels are generated from that.
   ============================================================ */

export const GROUND = 136;
export const VIEW = { w: 400, h: 160 };

const f = (n) => Math.round(n * 10) / 10;

// Rounded polyline / polygon through points with per-corner radius.
function roundedPath(pts, closed = false) {
  const n = pts.length;
  const at = (i) => pts[(i + n) % n];
  const corner = (i) => {
    const [x, y, r = 0] = pts[i];
    const [px, py] = at(i - 1);
    const [nx, ny] = at(i + 1);
    const l1 = Math.hypot(px - x, py - y);
    const l2 = Math.hypot(nx - x, ny - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    return {
      x, y,
      a: [x + ((px - x) / l1) * rr, y + ((py - y) / l1) * rr],
      b: [x + ((nx - x) / l2) * rr, y + ((ny - y) / l2) * rr],
    };
  };
  let d = "";
  if (closed) {
    for (let i = 0; i < n; i++) {
      const c = corner(i);
      d += (i === 0 ? "M" : "L") + f(c.a[0]) + " " + f(c.a[1]) + "Q" + c.x + " " + c.y + " " + f(c.b[0]) + " " + f(c.b[1]);
    }
    return d + "Z";
  }
  d = "M" + pts[0][0] + " " + pts[0][1];
  for (let i = 1; i < n - 1; i++) {
    const c = corner(i);
    d += "L" + f(c.a[0]) + " " + f(c.a[1]) + "Q" + c.x + " " + c.y + " " + f(c.b[0]) + " " + f(c.b[1]);
  }
  const last = pts[n - 1];
  return d + "L" + last[0] + " " + last[1];
}

const SPECS = [
  {
    key: "sedan", label: "Sedan", r: 24, rear: 108, front: 296,
    top: [[26,"S"],[26,86,9],[104,72,6],[148,33,20],[222,31,18],[276,68,10],[350,76,12],[377,94,10],[377,"S"]],
    glass: [
      [[114,68],[142,42],[183,40],[183,68]],
      [[191,68],[191,40],[221,38],[258,68]],
    ],
    seams: [[138,70],[188,70],[252,70]],
    handles: [[160,78],[222,78]],
    headlight: [[352,80],[374,86],[374,91],[356,89]],
    taillight: [[26,86],[26,95],[36,95],[34,86]],
  },
  {
    key: "hatchback", label: "Hatchback", r: 24, rear: 112, front: 290,
    top: [[52,"S"],[52,82,12],[94,34,22],[206,31,18],[258,68,10],[324,76,12],[352,94,10],[352,"S"]],
    glass: [
      [[76,68],[96,44],[138,40],[138,68]],
      [[146,68],[146,40],[205,38],[246,68]],
    ],
    seams: [[142,70],[252,70]],
    handles: [[150,78],[216,78]],
    headlight: [[328,80],[350,86],[350,91],[332,89]],
    taillight: [[52,84],[52,94],[60,94],[59,84]],
  },
  {
    key: "wagon", label: "Wagon", r: 24, rear: 100, front: 298,
    top: [[24,"S"],[24,80,8],[40,36,16],[222,32,18],[278,68,10],[348,76,12],[378,94,10],[378,"S"]],
    glass: [
      [[48,70],[54,42],[130,40],[130,70]],
      [[140,70],[140,40],[182,39],[182,70]],
      [[190,70],[190,39],[222,37],[260,70]],
    ],
    seams: [[136,72],[186,72],[252,72]],
    handles: [[148,80],[212,80]],
    rails: [[58,31],[212,27]],
    headlight: [[354,80],[376,86],[376,91],[358,89]],
    taillight: [[24,80],[24,92],[31,92],[30,80]],
  },
  {
    key: "suv", label: "SUV", r: 26, rear: 96, front: 302,
    top: [[28,"S"],[28,66,9],[36,24,14],[236,22,18],[292,66,10],[350,74,12],[372,92,10],[372,"S"]],
    glass: [
      [[44,66],[48,32],[100,30],[100,66]],
      [[108,66],[108,30],[170,29],[170,66]],
      [[178,66],[178,29],[232,28],[274,66]],
    ],
    seams: [[104,68],[174,68],[262,68]],
    handles: [[116,76],[186,76]],
    rails: [[46,19],[228,16]],
    headlight: [[348,78],[370,84],[370,90],[352,88]],
    taillight: [[28,66],[28,80],[35,80],[34,66]],
  },
  {
    key: "minivan", label: "Minivan", r: 24, rear: 96, front: 300,
    top: [[24,"S"],[24,72,10],[32,28,14],[232,26,20],[300,70,12],[352,78,12],[376,96,10],[376,"S"]],
    glass: [
      [[44,68],[46,36],[104,34],[104,68]],
      [[112,68],[112,34],[170,33],[170,68]],
      [[178,68],[178,33],[234,32],[284,68]],
    ],
    seams: [[108,70],[174,70],[262,70]],
    handles: [[120,80],[186,80]],
    headlight: [[352,84],[374,90],[374,95],[356,93]],
    taillight: [[24,72],[24,88],[31,88],[30,72]],
  },
  {
    key: "truck", label: "Truck", r: 27, rear: 82, front: 316,
    top: [[14,"S"],[14,63,5],[148,63,3],[154,22,12],[250,18,14],[306,62,10],[362,66,10],[388,84,10],[388,"S"]],
    glass: [
      [[162,58],[162,28],[206,26],[206,58]],
      [[214,58],[214,26],[250,24],[292,58]],
    ],
    seams: [[210,60],[272,60],[22,64]],
    handles: [[218,68],[250,68]],
    bed: [[18,72],[146,72]],
    headlight: [[364,70],[386,76],[386,83],[368,80]],
    taillight: [[14,66],[14,78],[20,78],[20,66]],
  },
  {
    key: "coupe", label: "Coupe", r: 24, rear: 104, front: 300,
    top: [[22,"S"],[22,92,10],[86,80,8],[154,48,26],[214,46,20],[272,76,10],[352,84,12],[380,98,10],[380,"S"]],
    glass: [
      [[134,76],[160,54],[214,52],[252,76]],
    ],
    seams: [[134,78],[252,78]],
    handles: [[190,86]],
    headlight: [[354,90],[378,94],[378,99],[358,97]],
    taillight: [[22,92],[22,99],[31,99],[29,92]],
  },
];

function build(spec) {
  const S = GROUND - spec.r;
  const a = spec.r + 5;
  const pts = spec.top.map(([x, y, rad]) => [x, y === "S" ? S : y, rad]);
  const first = pts[0];
  const last = pts[pts.length - 1];

  let body = roundedPath(pts);
  body += "L" + (spec.front + a) + " " + S
    + "A" + a + " " + a + " 0 0 0 " + (spec.front - a) + " " + S
    + "L" + (spec.rear + a) + " " + S
    + "A" + a + " " + a + " 0 0 0 " + (spec.rear - a) + " " + S
    + "L" + first[0] + " " + S + "Z";

  // Door seams run from the belt line down, but stop short of wheel arches.
  const seams = (spec.seams || []).map(([x, y0]) => {
    let y1 = S - 6;
    [spec.rear, spec.front].forEach((cx) => {
      const dx = Math.abs(x - cx);
      if (dx < a) y1 = Math.min(y1, S - Math.sqrt(a * a - dx * dx) - 4);
    });
    return y1 - y0 > 6 ? "M" + x + " " + y0 + "L" + x + " " + f(y1) : null;
  }).filter(Boolean);

  const handles = (spec.handles || []).map(([x, y]) => "M" + x + " " + y + "L" + (x + 12) + " " + y);

  const rails = spec.rails
    ? [
        "M" + spec.rails[0][0] + " " + spec.rails[0][1] + "L" + spec.rails[1][0] + " " + spec.rails[1][1],
        "M" + (spec.rails[0][0] + 14) + " " + spec.rails[0][1] + "L" + (spec.rails[0][0] + 14) + " " + (spec.rails[0][1] + 3),
        "M" + (spec.rails[1][0] - 14) + " " + spec.rails[1][1] + "L" + (spec.rails[1][0] - 14) + " " + (spec.rails[1][1] + 3),
      ]
    : [];

  const bed = spec.bed ? ["M" + spec.bed[0][0] + " " + spec.bed[0][1] + "L" + spec.bed[1][0] + " " + spec.bed[1][1]] : [];

  const poly = (p) => roundedPath(p.map(([x, y]) => [x, y, 3]), true);
  // Lift each window's top edge a little so the roof pillars look slimmer.
  const lift = (p) => {
    const maxY = Math.max(...p.map(([, y]) => y));
    return p.map(([x, y]) => [x, y < maxY - 1 ? y - 3 : y]);
  };

  return {
    key: spec.key,
    label: spec.label,
    body,
    glass: spec.glass.map((p) => poly(lift(p))),
    lines: [...seams, ...handles, ...rails, ...bed],
    lights: [spec.headlight, spec.taillight].filter(Boolean).map(poly),
    wheels: [spec.rear, spec.front].map((cx) => ({ cx, cy: GROUND - spec.r, r: spec.r })),
    _last: last,
  };
}

export const VEHICLES = SPECS.map(build);
export const BY_KEY = Object.fromEntries(VEHICLES.map((v) => [v.key, v]));

// Order the scan cycles through: most common first, mixed so neighbours differ.
export const ORDER = ["sedan", "suv", "truck", "hatchback", "coupe", "wagon", "minivan"];
