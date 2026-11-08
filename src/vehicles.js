/* ============================================================
   VEHICLE SILHOUETTES
   Original side-profile designs, one per body style, facing right in a
   400x160 box. Each profile is a list of [x, y, cornerRadius] points that
   trace the outline from the rear sill, up over the roof, to the front
   sill ("S" = sill height, set from the wheel size). Everything else
   (arches, glass, creases, lights, mirrors, trim, wheels) is generated
   from the spec so the nine shapes share one drawing style.
   ============================================================ */

export const GROUND = 136;
export const VIEW = { w: 400, h: 160 };

const f = (n) => Math.round(n * 10) / 10;

// Rounded polyline / polygon through points with a per-corner radius.
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

const poly = (p, r = 3) => roundedPath(p.map(([x, y]) => [x, y, r]), true);
const stroke = (p, r = 14) => roundedPath(p.map(([x, y], i) => [x, y, i === 0 || i === p.length - 1 ? 0 : r]), false);
const seg = (x1, y1, x2, y2) => "M" + x1 + " " + y1 + "L" + x2 + " " + y2;

const SPECS = [
  /* ---------------- sedan ---------------- */
  {
    key: "sedan", label: "Sedan", r: 24, rear: 106, front: 298, wheel: "multi",
    top: [[26,"S"],[25,90,8],[30,80,10],[96,73,12],[118,64,14],[150,35,26],[184,29,18],[222,30,18],[256,50,14],[278,68,10],[312,70,14],[352,77,16],[375,88,10],[377,99,6],[377,"S"]],
    glass: [
      [[124,63],[148,41],[183,36],[183,63]],
      [[191,63],[191,36],[222,37],[252,54],[266,63]],
    ],
    seams: [[138,66],[187,66],[250,66]],
    handles: [[158,81],[220,81]],
    crease: [[36,80],[120,74],[262,72],[352,78]],
    mirror: [257,60],
    hood: [[288,74],[350,82]],
    trunk: [[34,85],[104,77]],
    fuel: [62,84],
    headlight: [[346,80],[374,86],[374,92],[350,90]],
    taillight: [[26,84],[26,94],[38,94],[36,84]],
  },
  /* ---------------- crossover (compact SUV) ---------------- */
  {
    key: "crossover", label: "Crossover", r: 25, rear: 102, front: 300, wheel: "multi",
    top: [[32,"S"],[31,88,8],[36,66,12],[64,30,22],[128,25,16],[216,24,18],[258,46,14],[280,64,10],[316,69,14],[350,75,14],[370,87,10],[372,99,6],[372,"S"]],
    glass: [
      [[72,60],[82,35],[110,32],[110,60]],
      [[116,60],[116,31],[172,29],[172,60]],
      [[180,60],[180,29],[214,28],[250,46],[264,60]],
    ],
    seams: [[112,62],[176,62],[248,62]],
    handles: [[124,73],[190,73]],
    crease: [[40,80],[130,73],[270,72],[348,78]],
    rails: [[70,21],[214,18]],
    mirror: [262,55],
    hood: [[286,73],[346,80]],
    trunk: [[36,70],[40,86]],
    fuel: [58,82],
    headlight: [[344,78],[368,85],[368,91],[348,89]],
    taillight: [[32,70],[33,86],[40,86],[38,70]],
  },
  /* ---------------- suv (large, boxy) ---------------- */
  {
    key: "suv", label: "SUV", r: 27, rear: 94, front: 306, wheel: "multi",
    top: [[24,"S"],[23,72,8],[27,28,12],[40,20,14],[200,18,16],[238,19,16],[284,42,12],[302,62,10],[340,67,14],[360,73,12],[375,86,10],[375,98,6],[375,"S"]],
    glass: [
      [[44,60],[47,32],[94,29],[94,60]],
      [[102,60],[102,29],[152,28],[152,60]],
      [[160,60],[160,28],[206,27],[206,60]],
      [[214,60],[214,27],[236,28],[276,44],[294,60]],
    ],
    seams: [[98,62],[156,62],[210,62]],
    handles: [[108,72],[166,72],[220,72]],
    crease: [[34,76],[130,70],[280,70],[350,76]],
    rails: [[46,13],[230,12]],
    mirror: [284,54],
    hood: [[308,71],[352,79]],
    trunk: [[28,40],[28,64]],
    fuel: [54,80],
    headlight: [[350,76],[373,83],[373,90],[352,88]],
    taillight: [[24,70],[24,88],[31,88],[30,70]],
  },
  /* ---------------- truck (crew-cab pickup) ---------------- */
  {
    key: "truck", label: "Pickup", r: 27, rear: 82, front: 318, wheel: "truck",
    top: [[14,"S"],[14,64,5],[148,64,3],[152,40,6],[158,22,12],[168,18,14],[244,17,14],[286,38,12],[306,60,10],[326,63,14],[364,67,12],[387,82,10],[388,96,6],[388,"S"]],
    glass: [
      [[166,58],[166,28],[206,26],[206,58]],
      [[214,58],[214,26],[246,25],[282,42],[296,58]],
    ],
    seams: [[210,60],[274,60],[20,68]],
    handles: [[218,70],[252,70],[24,72]],
    crease: [[160,76],[250,74],[304,74]],
    mirror: [292,49],
    hood: [[330,70],[374,78]],
    bed: [[18,73],[146,73]],
    extras: [
      seg(150, 100, 280, 100),            // running board
      seg(18, 64, 18, 73),                // bed rail end
      seg(8, 104, 14, 104),               // rear step
      seg(32, 60, 140, 60),               // bed rail
    ],
    headlight: [[366,70],[386,76],[386,84],[370,82]],
    taillight: [[14,67],[14,81],[19,81],[19,67]],
  },
  /* ---------------- hatchback ---------------- */
  {
    key: "hatchback", label: "Hatchback", r: 24, rear: 112, front: 290, wheel: "multi",
    top: [[52,"S"],[51,86,8],[56,70,12],[88,34,22],[136,28,14],[206,29,16],[250,48,14],[266,66,10],[304,70,14],[332,76,14],[350,87,10],[352,99,6],[352,"S"]],
    glass: [
      [[80,62],[96,41],[138,35],[138,62]],
      [[146,62],[146,35],[205,36],[240,50],[256,62]],
    ],
    seams: [[142,66],[250,66]],
    handles: [[152,78],[212,78]],
    crease: [[58,80],[140,74],[262,72],[330,78]],
    mirror: [250,57],
    hood: [[272,74],[330,81]],
    trunk: [[56,72],[58,88]],
    fuel: [76,82],
    headlight: [[326,80],[348,86],[348,92],[330,90]],
    taillight: [[52,82],[52,94],[60,94],[58,82]],
  },
  /* ---------------- wagon ---------------- */
  {
    key: "wagon", label: "Wagon", r: 24, rear: 100, front: 298, wheel: "multi",
    top: [[24,"S"],[23,88,8],[25,70,10],[40,34,14],[70,29,10],[216,30,16],[260,48,12],[278,66,10],[316,70,14],[348,76,14],[376,87,10],[378,99,6],[378,"S"]],
    glass: [
      [[48,66],[56,38],[128,33],[128,66]],
      [[136,66],[136,33],[180,32],[180,66]],
      [[188,66],[188,32],[218,33],[250,50],[264,66]],
    ],
    seams: [[132,68],[184,68],[252,68]],
    handles: [[142,79],[204,79]],
    crease: [[32,80],[130,75],[262,74],[350,79]],
    rails: [[56,24],[210,24]],
    mirror: [258,60],
    hood: [[286,74],[348,81]],
    trunk: [[26,74],[28,90]],
    fuel: [66,84],
    headlight: [[350,79],[375,85],[375,91],[354,89]],
    taillight: [[24,76],[24,92],[32,92],[30,76]],
  },
  /* ---------------- coupe ---------------- */
  {
    key: "coupe", label: "Coupe", r: 24, rear: 104, front: 300, wheel: "multi",
    top: [[22,"S"],[21,94,10],[30,84,12],[84,80,14],[120,66,16],[156,45,28],[200,41,22],[236,54,16],[270,76,10],[310,78,16],[352,86,16],[376,96,10],[379,104,6],[379,"S"]],
    glass: [
      [[132,74],[160,50],[200,46],[232,56],[250,74]],
    ],
    seams: [[132,78],[250,78]],
    handles: [[186,88]],
    crease: [[34,92],[140,86],[262,86],[350,92]],
    mirror: [250,66],
    hood: [[274,82],[348,91]],
    trunk: [[30,88],[84,84]],
    fuel: [64,92],
    headlight: [[352,90],[377,95],[377,100],[357,98]],
    taillight: [[21,92],[21,100],[32,100],[30,92]],
  },
  /* ---------------- minivan ---------------- */
  {
    key: "minivan", label: "Minivan", r: 24, rear: 96, front: 300, wheel: "multi",
    top: [[24,"S"],[23,90,8],[25,70,12],[34,30,16],[60,25,14],[218,25,16],[252,34,12],[300,64,12],[330,70,14],[356,77,14],[375,90,10],[376,100,6],[376,"S"]],
    glass: [
      [[48,66],[50,36],[100,32],[100,66]],
      [[108,66],[108,32],[166,31],[166,66]],
      [[174,66],[174,31],[216,31],[240,38],[286,66]],
    ],
    seams: [[104,68],[170,68],[262,68]],
    handles: [[116,80],[182,80]],
    crease: [[36,84],[130,78],[270,78],[352,84]],
    mirror: [276,57],
    hood: [[308,75],[354,84]],
    extras: [seg(108, 73, 262, 73)],       // sliding-door track
    trunk: [[28,40],[28,70]],
    fuel: [58,86],
    headlight: [[352,82],[374,89],[374,95],[356,93]],
    taillight: [[24,72],[24,90],[31,90],[30,72]],
  },
  /* ---------------- electric crossover ---------------- */
  {
    key: "ev", label: "Electric", r: 26, rear: 98, front: 296, wheel: "aero", ev: true,
    top: [[28,"S"],[27,90,8],[32,70,12],[70,45,26],[128,26,30],[190,20,24],[222,22,22],[270,54,14],[288,68,10],[330,72,16],[364,80,14],[374,93,8],[374,"S"]],
    glass: [
      [[64,64],[100,44],[150,31],[173,30],[173,64]],
      [[181,64],[181,30],[216,31],[262,54],[274,64]],
    ],
    seams: [[177,66],[250,66],[120,66]],
    handles: [[190,77],[258,77],[130,77]],
    crease: [[40,82],[140,76],[270,76],[360,84]],
    mirror: [268,59],
    hood: [[294,75],[360,85]],
    trunk: [[34,74],[34,88]],
    headlight: [[348,76],[372,82],[372,86],[352,85]],
    taillight: [[28,68],[28,74],[46,70],[46,66]],
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

  // Door seams run from the belt line down but stop short of wheel arches.
  const clipDown = (x, y0) => {
    let y1 = S - 7;
    [spec.rear, spec.front].forEach((cx) => {
      const dx = Math.abs(x - cx);
      if (dx < a) y1 = Math.min(y1, S - Math.sqrt(a * a - dx * dx) - 4);
    });
    return y1 - y0 > 6 ? seg(x, y0, x, f(y1)) : null;
  };

  const arc = (cx, rad) => "M" + (cx + rad) + " " + S + "A" + rad + " " + rad + " 0 0 0 " + (cx - rad) + " " + S;

  const lines = [
    ...(spec.seams || []).map(([x, y0]) => clipDown(x, y0)).filter(Boolean),
    ...(spec.handles || []).map(([x, y]) => seg(x, y, x + 12, y)),
    ...(spec.crease ? [stroke(spec.crease, 18)] : []),
  ];

  const fine = [
    arc(spec.rear, a - 3),
    arc(spec.front, a - 3),
    seg(spec.rear + a + 4, S - 5, spec.front - a - 4, S - 5),                         // rocker / sill
    seg(first[0], S - 9, spec.rear - a - 2, S - 9),                                   // rear bumper lip
    seg(last[0], S - 9, spec.front + a + 2, S - 9),                                   // front bumper lip
    ...(spec.hood ? [seg(spec.hood[0][0], spec.hood[0][1], spec.hood[1][0], spec.hood[1][1])] : []),
    ...(spec.trunk ? [seg(spec.trunk[0][0], spec.trunk[0][1], spec.trunk[1][0], spec.trunk[1][1])] : []),
    ...(spec.fuel ? [poly([[spec.fuel[0], spec.fuel[1]], [spec.fuel[0] + 9, spec.fuel[1]], [spec.fuel[0] + 9, spec.fuel[1] + 8], [spec.fuel[0], spec.fuel[1] + 8]], 1.5)] : []),
    ...(spec.bed ? [seg(spec.bed[0][0], spec.bed[0][1], spec.bed[1][0], spec.bed[1][1])] : []),
    ...(spec.extras || []),
  ];

  const rails = spec.rails
    ? [
        seg(spec.rails[0][0], spec.rails[0][1], spec.rails[1][0], spec.rails[1][1]),
        seg(spec.rails[0][0] + 14, spec.rails[0][1], spec.rails[0][0] + 14, spec.rails[0][1] + 3),
        seg(spec.rails[1][0] - 14, spec.rails[1][1], spec.rails[1][0] - 14, spec.rails[1][1] + 3),
      ]
    : [];

  // Lift each window's top edge a little so the roof pillars look slimmer.
  const lift = (p) => {
    const maxY = Math.max(...p.map(([, y]) => y));
    return p.map(([x, y]) => [x, y < maxY - 1 ? y - 3 : y]);
  };

  const mirror = spec.mirror
    ? poly([[spec.mirror[0], spec.mirror[1]], [spec.mirror[0] + 11, spec.mirror[1] + 1], [spec.mirror[0] + 12, spec.mirror[1] + 7], [spec.mirror[0] + 2, spec.mirror[1] + 7]], 2.5)
    : null;

  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const lampCore = (p) => {
    const m1 = mid(p[0], p[3]);
    const m2 = mid(p[1], p[2]);
    return seg(f(m1[0]), f(m1[1]), f(m2[0]), f(m2[1]));
  };
  const lamps = [spec.headlight, spec.taillight].filter(Boolean);

  return {
    key: spec.key,
    label: spec.label,
    body,
    glass: spec.glass.map((p) => poly(lift(p))),
    lines: [...lines, ...rails],
    fine: [...fine, ...lamps.map(lampCore)],
    lights: lamps.map((p) => poly(p)),
    mirror,
    wheels: [spec.rear, spec.front].map((cx) => ({ cx, cy: GROUND - spec.r, r: spec.r, style: spec.wheel })),
  };
}

export const VEHICLES = SPECS.map(build);
export const BY_KEY = Object.fromEntries(VEHICLES.map((v) => [v.key, v]));

// Order the scan cycles through: common bodies first, mixed so neighbours differ.
export const ORDER = ["sedan", "crossover", "truck", "ev", "hatchback", "suv", "coupe", "wagon", "minivan"];
