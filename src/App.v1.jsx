import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

/* ============================================================
   CONSTANTS
   ============================================================ */

const CURRENT_YEAR = new Date().getFullYear() + 1;
const YEAR_MIN = 1990;
const MIN_SCAN_MS = 3400;

const MAKES = ["Acura","Alfa Romeo","Audi","BMW","Buick","Cadillac","Chevrolet","Chrysler",
  "Dodge","Fiat","Ford","Genesis","GMC","Honda","Hyundai","Infiniti","Jaguar","Jeep","Kia",
  "Land Rover","Lexus","Lincoln","Mazda","Mercedes-Benz","Mini","Mitsubishi","Nissan",
  "Porsche","Ram","Subaru","Tesla","Toyota","Volkswagen","Volvo"];

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC",
  "ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const BODY_ORDER = ["sedan", "hatchback", "suv", "truck", "sports"];
const BODY_LABELS = { sedan: "Sedan", hatchback: "Hatchback", suv: "SUV", truck: "Truck", sports: "Sports Car" };

const STATUS_MESSAGES = [
  "Querying NHTSA vehicle records…",
  "Matching body style…",
  "Reading engine configuration…",
  "Cross-checking trim data…",
  "Finalizing specification…",
];

function mapBodyClassToType(bodyClass) {
  const s = (bodyClass || "").toLowerCase();
  if (/pickup|truck/.test(s)) return "truck";
  if (/suv|sport utility|crossover/.test(s)) return "suv";
  if (/hatchback|wagon/.test(s)) return "hatchback";
  if (/convertible|coupe|roadster/.test(s)) return "sports";
  if (/sedan/.test(s)) return "sedan";
  return "sedan";
}

/* ============================================================
   VEHICLE SILHOUETTE PROFILES
   Each is a real 2D side-profile curve (hood, windshield rake,
   roofline, rear) extruded to width, not a stack of boxes.
   ============================================================ */

function sedanShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.05, 0.18);
  s.quadraticCurveTo(-2.15, 0.32, -2.05, 0.5);
  s.lineTo(-1.6, 0.75);
  s.quadraticCurveTo(-1.3, 0.95, -1.0, 1.05);
  s.quadraticCurveTo(-0.3, 1.4, 0.35, 1.36);
  s.quadraticCurveTo(0.75, 1.3, 0.95, 0.98);
  s.lineTo(1.55, 0.68);
  s.quadraticCurveTo(2.02, 0.55, 2.05, 0.3);
  s.lineTo(2.05, 0.18);
  s.lineTo(-2.05, 0.18);
  s.closePath();
  return s;
}
function hatchbackShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.75, 0.18);
  s.quadraticCurveTo(-1.85, 0.32, -1.78, 0.5);
  s.lineTo(-1.55, 1.05);
  s.quadraticCurveTo(-0.4, 1.38, 0.55, 1.3);
  s.quadraticCurveTo(0.85, 1.22, 1.0, 0.9);
  s.lineTo(1.35, 0.68);
  s.quadraticCurveTo(1.72, 0.55, 1.75, 0.3);
  s.lineTo(1.75, 0.18);
  s.lineTo(-1.75, 0.18);
  s.closePath();
  return s;
}
function suvShape() {
  const s = new THREE.Shape();
  s.moveTo(-2.15, 0.32);
  s.quadraticCurveTo(-2.25, 0.5, -2.15, 0.75);
  s.lineTo(-1.85, 1.55);
  s.lineTo(1.65, 1.55);
  s.quadraticCurveTo(1.95, 1.45, 2.05, 1.05);
  s.lineTo(2.15, 0.85);
  s.quadraticCurveTo(2.28, 0.7, 2.25, 0.42);
  s.lineTo(2.25, 0.32);
  s.lineTo(-2.15, 0.32);
  s.closePath();
  return s;
}
function truckShape() {
  const s = new THREE.Shape();
  s.moveTo(2.05, 0.35);
  s.quadraticCurveTo(2.18, 0.5, 2.12, 0.68);
  s.lineTo(1.5, 0.88);
  s.quadraticCurveTo(1.15, 1.05, 1.0, 1.55);
  s.lineTo(0.1, 1.6);
  s.quadraticCurveTo(-0.2, 1.58, -0.35, 1.15);
  s.lineTo(-1.9, 1.15);
  s.lineTo(-1.9, 0.55);
  s.quadraticCurveTo(-2.05, 0.5, -2.0, 0.35);
  s.lineTo(2.05, 0.35);
  s.closePath();
  return s;
}
function sportsShape() {
  const s = new THREE.Shape();
  s.moveTo(2.1, 0.22);
  s.quadraticCurveTo(2.22, 0.35, 2.15, 0.48);
  s.lineTo(1.3, 0.58);
  s.quadraticCurveTo(0.85, 0.68, 0.6, 0.98);
  s.lineTo(-0.2, 1.02);
  s.quadraticCurveTo(-0.55, 1.0, -0.75, 0.75);
  s.lineTo(-1.55, 0.62);
  s.quadraticCurveTo(-2.05, 0.4, -2.02, 0.22);
  s.lineTo(2.1, 0.22);
  s.closePath();
  return s;
}

const BODY_PROFILES = {
  sedan:     { shape: sedanShape,     halfWidth: 0.9,   wheels: [{ x: 1.5,  r: 0.42 }, { x: -1.5,  r: 0.42 }] },
  hatchback: { shape: hatchbackShape, halfWidth: 0.875, wheels: [{ x: 1.15, r: 0.4  }, { x: -1.15, r: 0.4  }] },
  suv:       { shape: suvShape,       halfWidth: 0.975, wheels: [{ x: 1.65, r: 0.5  }, { x: -1.65, r: 0.5  }] },
  truck:     { shape: truckShape,     halfWidth: 0.95,  wheels: [{ x: 1.65, r: 0.52 }, { x: -1.55, r: 0.52 }] },
  sports:    { shape: sportsShape,    halfWidth: 0.925, wheels: [{ x: 1.55, r: 0.44 }, { x: -1.5,  r: 0.44 }] },
};

function buildBodyGroup(type, hexColor) {
  const p = BODY_PROFILES[type];
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: hexColor, transparent: true, opacity: 0 });
  group.userData.mat = mat;

  const pts2D = p.shape().getPoints(72);
  const hw = p.halfWidth;
  const frontPts = pts2D.map((v) => new THREE.Vector3(v.x, v.y, hw));
  const backPts = pts2D.map((v) => new THREE.Vector3(v.x, v.y, -hw));

  function addLine(pts, closed) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(closed ? new THREE.LineLoop(geo, mat) : new THREE.Line(geo, mat));
  }
  addLine(frontPts, true);
  addLine(backPts, true);

  const ribCount = 9;
  const stride = Math.max(1, Math.floor(pts2D.length / ribCount));
  for (let i = 0; i < pts2D.length; i += stride) addLine([frontPts[i], backPts[i]], false);

  p.wheels.forEach((w) => {
    [hw - 0.04, -(hw - 0.04)].forEach((z) => {
      const edges = new THREE.EdgesGeometry(new THREE.CircleGeometry(w.r, 28));
      const line = new THREE.LineSegments(edges, mat);
      line.position.set(w.x, w.r, z);
      group.add(line);
    });
  });

  return group;
}

/* ============================================================
   SHOP TAXONOMY — group > subcategory > part type
   ============================================================ */

const SHOP = [
  { key: "engine", label: "Engine", icon: "engine", subcats: [
    { key: "ignition", label: "Ignition", icon: "spark", items: [
      { label: "Spark Plugs", terms: "spark plugs" },
      { label: "Ignition Coils", terms: "ignition coils" } ] },
    { key: "cooling", label: "Cooling", icon: "radiator", items: [
      { label: "Radiator", terms: "radiator" },
      { label: "Water Pump", terms: "water pump" },
      { label: "Thermostat", terms: "thermostat" } ] },
    { key: "belts", label: "Belts & Hoses", icon: "belt", items: [
      { label: "Serpentine Belt", terms: "serpentine belt" },
      { label: "Radiator Hose", terms: "radiator hose" } ] },
  ]},
  { key: "brakes-suspension", label: "Brakes & Suspension", icon: "brake", subcats: [
    { key: "brakes", label: "Brakes", icon: "brake", items: [
      { label: "Brake Pads", terms: "brake pads" },
      { label: "Brake Rotors", terms: "brake rotors" },
      { label: "Calipers", terms: "brake calipers" },
      { label: "Brake Fluid", terms: "brake fluid" } ] },
    { key: "suspension", label: "Suspension", icon: "strut", items: [
      { label: "Struts", terms: "struts" },
      { label: "Shocks", terms: "shock absorbers" },
      { label: "Control Arms", terms: "control arms" } ] },
  ]},
  { key: "electrical", label: "Electrical", icon: "battery", subcats: [
    { key: "battery", label: "Battery & Starting", icon: "battery", items: [
      { label: "Car Battery", terms: "car battery" },
      { label: "Alternator", terms: "alternator" },
      { label: "Starter", terms: "starter motor" } ] },
  ]},
  { key: "exhaust", label: "Exhaust", icon: "exhaust", subcats: [
    { key: "exhaust", label: "Exhaust", icon: "exhaust", items: [
      { label: "Muffler", terms: "muffler" },
      { label: "Catalytic Converter", terms: "catalytic converter" } ] },
  ]},
  { key: "maintenance", label: "Maintenance", icon: "filter", subcats: [
    { key: "filters", label: "Filters", icon: "filter", items: [
      { label: "Oil Filter", terms: "oil filter" },
      { label: "Air Filter", terms: "engine air filter" },
      { label: "Cabin Air Filter", terms: "cabin air filter" } ] },
    { key: "wipers", label: "Wipers", icon: "wiper", items: [
      { label: "Wiper Blades", terms: "wiper blades" } ] },
  ]},
  { key: "lighting-body", label: "Lighting & Body", icon: "light", subcats: [
    { key: "lighting", label: "Lighting", icon: "light", items: [
      { label: "Headlight Assembly", terms: "headlight assembly" },
      { label: "Bulbs", terms: "headlight bulbs" },
      { label: "Tail Lights", terms: "tail light assembly" } ] },
    { key: "mirrors", label: "Mirrors & Trim", icon: "mirror", items: [
      { label: "Side Mirror", terms: "side mirror" },
      { label: "Door Handle", terms: "door handle" } ] },
  ]},
];

const RETAILER_COLORS = {
  "eBay Motors": "#5b8dbe",
  "Amazon": "#ff9900",
  "AutoZone": "#e51937",
  "O'Reilly Auto Parts": "#c8102e",
  "RockAuto": "#3f6fb0",
  "Search the whole web": "#9199a3",
};

function buildLinks(query) {
  const q = encodeURIComponent(query);
  return [
    { name: "eBay Motors", url: "https://www.ebay.com/sch/i.html?_nkw=" + q },
    { name: "Amazon", url: "https://www.amazon.com/s?k=" + q },
    { name: "AutoZone", url: "https://www.autozone.com/searchresult?searchText=" + q },
    { name: "O'Reilly Auto Parts", url: "https://www.oreillyauto.com/search?q=" + q },
    { name: "RockAuto", url: "https://www.google.com/search?q=" + encodeURIComponent("site:rockauto.com " + query) },
    { name: "Search the whole web", url: "https://www.google.com/search?q=" + encodeURIComponent(query + " for sale") },
  ];
}

function composeEngine(r) {
  const parts = [];
  if (r.DisplacementL) parts.push(parseFloat(r.DisplacementL).toFixed(1) + "L");
  const cfg = (r.EngineConfiguration || "").trim();
  const cyl = r.EngineCylinders;
  if (cfg && cyl) parts.push(cfg + cyl);
  else if (cyl) parts.push(cyl + "-cyl");
  if (!parts.length && r.FuelTypePrimary) parts.push(r.FuelTypePrimary);
  return parts.length ? parts.join(" ") : "Not reported for this VIN";
}

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

/* ============================================================
   ICONS
   ============================================================ */

function Icon({ name, size = 22 }) {
  const c = { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "brake": return (<svg {...c}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.2" /><line x1="12" y1="4" x2="12" y2="7" /><line x1="12" y1="17" x2="12" y2="20" /><line x1="4" y1="12" x2="7" y2="12" /><line x1="17" y1="12" x2="20" y2="12" /></svg>);
    case "filter": return (<svg {...c}><rect x="7" y="3" width="10" height="18" rx="2.5" /><line x1="9.5" y1="6" x2="9.5" y2="18" /><line x1="12" y1="6" x2="12" y2="18" /><line x1="14.5" y1="6" x2="14.5" y2="18" /></svg>);
    case "battery": return (<svg {...c}><rect x="3" y="8" width="18" height="10" rx="1.5" /><line x1="8" y1="5.5" x2="8" y2="8" /><line x1="16" y1="5.5" x2="16" y2="8" /><line x1="7" y1="13" x2="10" y2="13" /><line x1="14" y1="13" x2="17" y2="13" /><line x1="8.5" y1="11.5" x2="8.5" y2="14.5" /></svg>);
    case "spark": return (<svg {...c}><path d="M9 3h6l-1 5h2l-7 12 1-8H8l1-9z" /></svg>);
    case "belt": return (<svg {...c}><circle cx="7" cy="12" r="4" /><circle cx="17" cy="12" r="4" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="16" x2="17" y2="16" /></svg>);
    case "strut": return (<svg {...c}><path d="M12 2v3" /><path d="M9 5c0 1 3 .5 3 1.5S9 7.5 9 8.5s3 .5 3 1.5-3 .5-3 1.5 3 .5 3 1.5-3 .5-3 1.5" /><path d="M12 19v3" /></svg>);
    case "light": return (<svg {...c}><path d="M4 12c0-4 3-7 7-7s7 3 7 7-3 4-7 4-7 0-7-4z" /><line x1="18" y1="9" x2="21" y2="8" /><line x1="18" y1="12" x2="21.5" y2="12" /><line x1="18" y1="15" x2="21" y2="16" /></svg>);
    case "radiator": return (<svg {...c}><rect x="4" y="5" width="16" height="14" rx="1" /><line x1="7.5" y1="5" x2="7.5" y2="19" /><line x1="11" y1="5" x2="11" y2="19" /><line x1="14.5" y1="5" x2="14.5" y2="19" /><line x1="18" y1="5" x2="18" y2="19" /></svg>);
    case "wiper": return (<svg {...c}><circle cx="5" cy="19" r="1.6" /><path d="M6 18L18 5" /><path d="M18 5l3 1-1 3" /></svg>);
    case "exhaust": return (<svg {...c}><line x1="3" y1="15" x2="12" y2="15" /><rect x="12" y="11" width="7" height="8" rx="2" /><line x1="19" y1="13.5" x2="22" y2="13" /><line x1="19" y1="16.5" x2="22" y2="17" /></svg>);
    case "mirror": return (<svg {...c}><path d="M6 9c0-2 2-4 5-4s5 2 5 4-2 5-5 5-5-3-5-5z" /><line x1="9" y1="14" x2="7" y2="19" /></svg>);
    case "engine": return (<svg {...c}><rect x="4" y="9" width="12" height="8" rx="1" /><rect x="16" y="11" width="4" height="4" /><line x1="7" y1="9" x2="7" y2="6" /><line x1="10" y1="9" x2="10" y2="6" /><line x1="13" y1="9" x2="13" y2="6" /></svg>);
    default: return (<svg {...c}><circle cx="12" cy="12" r="8" /></svg>);
  }
}

/* ============================================================
   THREE.JS WIREFRAME VEHICLE
   ============================================================ */

function VehicleWireframe({ mode, targetType }) {
  const mountRef = useRef(null);
  const labelRef = useRef(null);
  const statusRef = useRef(null);
  const groupsRef = useRef({});
  const activeIndexRef = useRef(0);
  const animStateRef = useRef(null);
  const scanElapsedRef = useRef(0);
  const statusIdxRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const modeRef = useRef(mode);
  const targetTypeRef = useRef(targetType);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { targetTypeRef.current = targetType; }, [targetType]);

  const startFade = useCallback((toKey, duration, dim) => {
    const groups = groupsRef.current;
    const fromKey = BODY_ORDER[activeIndexRef.current];
    const restOpacity = dim ? 0.32 : 1;

    // Hard reset: any group not involved in this transition must not be left
    // stuck at a stale partial opacity from an earlier interrupted fade.
    BODY_ORDER.forEach((k) => {
      if (k !== fromKey && k !== toKey) groups[k].userData.mat.opacity = 0;
    });

    if (labelRef.current) labelRef.current.textContent = BODY_LABELS[toKey];

    if (fromKey === toKey) {
      groups[toKey].userData.mat.opacity = restOpacity;
      return;
    }
    activeIndexRef.current = BODY_ORDER.indexOf(toKey);
    animStateRef.current = { from: fromKey, to: toKey, start: performance.now(), duration: duration || 450, restOpacity };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(5.4, 3.0, 6.6);
    camera.lookAt(0, 0.75, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(16, 16, 0x5b8dbe, 0x5b8dbe);
    grid.material.transparent = true;
    grid.material.opacity = 0.07;
    scene.add(grid);

    const groups = {};
    BODY_ORDER.forEach((key) => {
      const g = buildBodyGroup(key, 0x5b8dbe);
      scene.add(g);
      groups[key] = g;
    });
    groupsRef.current = groups;
    groups[BODY_ORDER[activeIndexRef.current]].userData.mat.opacity = mode === "idle" ? 0.32 : 0;

    function onResize() {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    function loop(now) {
      if (lastTimeRef.current == null) lastTimeRef.current = now;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const currentMode = modeRef.current;
      const rotSpeed = currentMode === "scanning" ? 0.95 : currentMode === "settled" ? 0.32 : 0.1;
      BODY_ORDER.forEach((key) => { groups[key].rotation.y += rotSpeed * dt; });

      if (animStateRef.current) {
        const st = animStateRef.current;
        const t = Math.min(1, (now - st.start) / st.duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        if (groups[st.from]) groups[st.from].userData.mat.opacity = (1 - eased) * st.restOpacity;
        groups[st.to].userData.mat.opacity = eased * st.restOpacity;
        if (t >= 1) {
          if (groups[st.from]) groups[st.from].userData.mat.opacity = 0;
          groups[st.to].userData.mat.opacity = st.restOpacity;
          animStateRef.current = null;
        }
      }

      if (currentMode === "scanning") {
        scanElapsedRef.current += dt * 1000;
        if (scanElapsedRef.current > 900 && !animStateRef.current) {
          scanElapsedRef.current = 0;
          const nextIdx = (activeIndexRef.current + 1) % BODY_ORDER.length;
          startFade(BODY_ORDER[nextIdx], 420, false);
          statusIdxRef.current = (statusIdxRef.current + 1) % STATUS_MESSAGES.length;
          if (statusRef.current) statusRef.current.textContent = STATUS_MESSAGES[statusIdxRef.current];
        }
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      BODY_ORDER.forEach((key) => {
        groups[key].children.forEach((child) => child.geometry.dispose());
        groups[key].userData.mat.dispose();
      });
      grid.geometry.dispose();
      grid.material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupsRef.current[BODY_ORDER[0]]) return;
    if (mode === "scanning") {
      scanElapsedRef.current = 0;
      statusIdxRef.current = 0;
      if (statusRef.current) statusRef.current.textContent = STATUS_MESSAGES[0];
      startFade(BODY_ORDER[(activeIndexRef.current + 1) % BODY_ORDER.length], 420, false);
    } else if (mode === "settled" && targetType) {
      startFade(targetType, 600, false);
    } else if (mode === "idle") {
      startFade(BODY_ORDER[activeIndexRef.current], 400, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetType]);

  return (
    <div className="wireframe-card">
      <div className={"scan-sweep" + (mode === "scanning" ? " active" : "")} />
      <div className="wireframe-canvas" ref={mountRef} />
      <div className="wireframe-label" ref={labelRef}>Sedan</div>
      <div className={"wireframe-status" + (mode === "scanning" ? " visible" : "")} ref={statusRef}>{STATUS_MESSAGES[0]}</div>
    </div>
  );
}

/* ============================================================
   SMALL UI PARTS
   ============================================================ */

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button key={opt.value} className={"seg-btn" + (value === opt.value ? " active" : "")} onClick={() => onChange(opt.value)}>{opt.label}</button>
      ))}
    </div>
  );
}

function SpecRow({ label, value, mono }) {
  return (
    <div className="spec-row">
      <div className="spec-label">{label}</div>
      <div className={"spec-value" + (mono ? " mono" : "")}>{value}</div>
    </div>
  );
}

function LinkDrawer({ query }) {
  const [pendingUrl, setPendingUrl] = useState(null);
  const links = buildLinks(query);
  function handleClick(e, url) {
    e.preventDefault();
    if (pendingUrl) return;
    setPendingUrl(url);
    setTimeout(() => {
      window.open(url, "_blank", "noopener");
      setPendingUrl(null);
    }, 380);
  }
  return (
    <div className="link-drawer">
      {links.map((l) => {
        const isPending = pendingUrl === l.url;
        return (
          <a key={l.name} className={"link-row" + (isPending ? " pending" : "")} href={l.url} onClick={(e) => handleClick(e, l.url)}>
            <span className="link-dot" style={{ background: RETAILER_COLORS[l.name] || "var(--blue)" }} />
            <span className="link-name">{l.name}</span>
            <span className="go">{isPending ? "Opening…" : "View ↗"}</span>
          </a>
        );
      })}
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  const [activeTab, setActiveTab] = useState("vehicle");
  const [entryMode, setEntryMode] = useState("vin");
  const [vehicle, setVehicle] = useState(null);
  const [decoding, setDecoding] = useState(false);
  const [vinValue, setVinValue] = useState("");
  const [vinError, setVinError] = useState("");

  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [ymmError, setYmmError] = useState("");

  const [plateState, setPlateState] = useState("CA");
  const [plateValue, setPlateValue] = useState("");
  const [plateNote, setPlateNote] = useState("");

  const [groupKey, setGroupKey] = useState(null);
  const [subKey, setSubKey] = useState(null);
  const [openItemKey, setOpenItemKey] = useState(null);

  const vinInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("vehicle", false);
        if (res && res.value) {
          const saved = JSON.parse(res.value);
          if (saved && saved.bodyType) setVehicle(saved);
        }
      } catch (e) { /* nothing saved yet */ }
    })();
  }, []);

  const persistVehicle = useCallback(async (v) => {
    try { await window.storage.set("vehicle", JSON.stringify(v), false); } catch (e) { /* ignore */ }
  }, []);

  const wireMode = decoding ? "scanning" : vehicle ? "settled" : "idle";
  const wireTarget = vehicle ? vehicle.bodyType : null;

  function handleVinChange(e) {
    setVinValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
  }

  async function handleVinSubmit() {
    setVinError("");
    const vin = vinValue.trim();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      setVinError("That's not a valid 17-character VIN — check for mixed-up characters (VINs never use I, O, or Q).");
      return;
    }
    setDecoding(true);
    const scanStart = performance.now();
    try {
      const res = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/" + encodeURIComponent(vin) + "?format=json");
      const data = await res.json();
      const r = data.Results && data.Results[0];
      const elapsed = performance.now() - scanStart;
      if (elapsed < MIN_SCAN_MS) await sleep(MIN_SCAN_MS - elapsed);

      if (!r || !r.Make) {
        setVinError("NHTSA doesn't have a match for that VIN. Double-check it, or use Year / Make / Model instead.");
        setDecoding(false);
        return;
      }
      const v = {
        year: r.ModelYear || "",
        make: r.Make || "",
        model: r.Model || "",
        trim: r.Trim || r.Series || "",
        bodyClass: r.BodyClass || "",
        bodyType: mapBodyClassToType(r.BodyClass),
        engine: composeEngine(r),
        cylinders: r.EngineCylinders || "Not reported",
        hp: r.EngineHP ? Math.round(parseFloat(r.EngineHP)) + " hp" : "Not reported by manufacturer",
        vin,
      };
      setVehicle(v);
      persistVehicle(v);
    } catch (e) {
      const elapsed = performance.now() - scanStart;
      if (elapsed < MIN_SCAN_MS) await sleep(MIN_SCAN_MS - elapsed);
      setVinError("Couldn't reach NHTSA's decoder right now. Check your connection and try again.");
    } finally {
      setDecoding(false);
    }
  }

  function handleYearOrMakeChange(nextYear, nextMake) {
    setYear(nextYear);
    setMake(nextMake);
    setModel("");
    setModels([]);
    setYmmError("");
    if (!nextYear || !nextMake) return;
    setModelsLoading(true);
    fetch("https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformakeyear/make/" + encodeURIComponent(nextMake) + "/modelyear/" + encodeURIComponent(nextYear) + "?format=json")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.Results || []).map((r) => r.Model_Name).filter((v, i, arr) => v && arr.indexOf(v) === i).sort();
        if (!list.length) setYmmError("No models found for that year and make — try a nearby model year.");
        setModels(list);
      })
      .catch(() => setYmmError("Couldn't reach NHTSA's vehicle database. Check your connection and try again."))
      .finally(() => setModelsLoading(false));
  }

  function handleYmmSubmit() {
    const v = { year, make, model, trim: "", bodyClass: "", bodyType: "sedan", engine: "", cylinders: "", hp: "", vin: "" };
    setVehicle(v);
    persistVehicle(v);
  }

  function handlePlateSubmit() {
    if (!plateValue.trim()) { setPlateNote("Enter a plate number first."); return; }
    setPlateNote("Plate " + plateState + " " + plateValue.trim().toUpperCase() + " can't be decoded here. Plate-to-VIN lookups run against state DMV records, which aren't open to the public. Grab the VIN off the driver-side door jamb sticker or registration and use the VIN tab instead.");
  }

  function goToVehicleTab() {
    setActiveTab("vehicle");
    setEntryMode("vin");
    setTimeout(() => vinInputRef.current && vinInputRef.current.focus(), 50);
  }

  const group = SHOP.find((g) => g.key === groupKey);
  const hasMultipleSubs = group && group.subcats.length > 1;
  const sub = group ? (hasMultipleSubs ? group.subcats.find((s) => s.key === subKey) : group.subcats[0]) : null;

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

        :root{
          --bg:#14161a; --panel:#1b1e23; --panel-2:#21252b; --border:#2b2f36;
          --metal-1:#d3d7da; --metal-2:#a3a9ad; --metal-shadow:#6c7176;
          --ink:#edeeea; --ink-dim:#9199a3; --ink-faint:#5b6169;
          --orange:#ff5a1f; --orange-dim:#d9491a; --blue:#5b8dbe; --green:#7fa660;
          --font-display:'Oswald', sans-serif; --font-mono:'JetBrains Mono', monospace; --font-body:'Inter', sans-serif;
        }
        *{ box-sizing:border-box; }
        .app-shell{ font-family:var(--font-body); color:var(--ink); background:var(--bg); width:100%; max-width:430px; margin:0 auto; min-height:100vh; display:flex; flex-direction:column; position:relative; border-left:1px solid var(--border); border-right:1px solid var(--border); }
        a{ color:var(--blue); }
        button{ font-family:inherit; }
        :focus-visible{ outline:2px solid var(--orange); outline-offset:2px; }

        .topbar{ display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--bg); z-index:5; }
        .brand{ font-family:var(--font-display); font-weight:700; font-size:17px; letter-spacing:0.05em; display:flex; align-items:center; gap:8px; }
        .brand-mark{ width:18px; height:18px; border-radius:50%; background:linear-gradient(145deg, var(--orange), var(--orange-dim)); box-shadow:0 0 0 3px rgba(255,90,31,0.15); }
        .topbar-sub{ font-family:var(--font-mono); font-size:9.5px; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink-dim); }

        .content{ flex:1; overflow-y:auto; padding:20px 18px 90px; }
        .eyebrow{ font-family:var(--font-mono); font-size:11px; letter-spacing:0.12em; color:var(--orange); text-transform:uppercase; margin:0 0 8px; }
        h1.page-title{ font-family:var(--font-display); font-weight:700; font-size:26px; line-height:1.1; margin:0 0 6px; }
        .page-sub{ color:var(--ink-dim); font-size:14px; margin:0 0 20px; }
        .section-title{ font-family:var(--font-display); font-weight:600; font-size:17px; margin:0; }

        .segmented{ display:flex; background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:3px; margin-bottom:16px; }
        .seg-btn{ flex:1; background:transparent; border:none; color:var(--ink-dim); font-size:12px; font-family:var(--font-mono); letter-spacing:0.04em; text-transform:uppercase; padding:9px 4px; border-radius:6px; cursor:pointer; transition:background .15s ease, color .15s ease; }
        .seg-btn.active{ background:var(--panel-2); color:var(--orange); box-shadow:inset 0 0 0 1px var(--border); }

        .panel{ background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:18px; }
        label{ display:block; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.08em; text-transform:uppercase; color:var(--ink-dim); margin-bottom:7px; }
        input, select{ background:#101215; border:1px solid var(--border); color:var(--ink); font-family:var(--font-mono); font-size:14.5px; padding:11px 12px; border-radius:6px; width:100%; }
        input::placeholder{ color:var(--ink-faint); font-family:var(--font-body); }
        select{ font-family:var(--font-body); font-size:13.5px; }
        select:disabled, input:disabled{ opacity:0.4; }

        .row{ display:flex; gap:8px; }
        .grid3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px; }
        .grid2{ display:grid; grid-template-columns:96px 1fr; gap:8px; margin-bottom:14px; }

        .btn-primary{ background:var(--orange); color:#181000; border:none; font-family:var(--font-display); font-weight:600; font-size:12.5px; letter-spacing:0.03em; text-transform:uppercase; padding:0 18px; border-radius:6px; cursor:pointer; min-height:41px; transition:background .15s ease, transform .1s ease; white-space:nowrap; }
        .btn-primary:hover:not(:disabled){ background:#ff7241; }
        .btn-primary:disabled{ background:var(--ink-faint); color:#2b2f36; cursor:not-allowed; }
        .btn-primary.block{ width:100%; }
        .btn-secondary{ background:transparent; border:1px solid var(--border); color:var(--ink); font-size:13px; padding:10px 16px; border-radius:6px; cursor:pointer; }

        .hint{ font-size:12.5px; color:var(--ink-dim); margin:9px 0 0; }
        .error-note{ font-size:12.5px; color:var(--orange); margin:11px 0 0; padding-left:12px; border-left:2px solid var(--orange); }
        .info-note{ margin-top:14px; font-size:12.5px; line-height:1.55; color:var(--ink-dim); padding:12px 14px; background:var(--panel-2); border-left:2px solid var(--blue); border-radius:0 6px 6px 0; }

        .wireframe-card{ position:relative; background:radial-gradient(circle at 50% 30%, #1c2530, var(--panel) 70%); border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:18px; }
        .wireframe-canvas{ width:100%; height:250px; }
        .wireframe-label{ position:absolute; bottom:30px; left:0; right:0; text-align:center; font-family:var(--font-mono); font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:var(--blue); opacity:0.9; }
        .wireframe-status{ position:absolute; bottom:10px; left:0; right:0; text-align:center; font-family:var(--font-mono); font-size:10px; letter-spacing:0.04em; color:var(--ink-faint); opacity:0; transition:opacity .25s ease; }
        .wireframe-status.visible{ opacity:1; }
        .scan-sweep{ position:absolute; left:0; right:0; height:70px; top:-70px; background:linear-gradient(180deg, transparent, rgba(91,141,190,0.16), transparent); opacity:0; pointer-events:none; }
        .scan-sweep.active{ opacity:1; animation:sweep 2.2s linear infinite; }
        @keyframes sweep{ 0%{ transform:translateY(0); } 100%{ transform:translateY(320px); } }

        .spec-plate{ position:relative; padding:22px 20px; border-radius:8px;
          background:
            repeating-linear-gradient(100deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px),
            linear-gradient(150deg, var(--metal-1), var(--metal-2) 55%, var(--metal-shadow));
          box-shadow:0 12px 24px -12px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.25);
          margin-bottom:14px;
        }
        .rivet{ position:absolute; width:8px; height:8px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #fff, #8b8f93 55%, #4d5156); box-shadow:0 1px 2px rgba(0,0,0,0.6) inset; }
        .rivet.tl{top:8px;left:8px;} .rivet.tr{top:8px;right:8px;} .rivet.bl{bottom:8px;left:8px;} .rivet.br{bottom:8px;right:8px;}
        .plate-title{ font-family:var(--font-display); font-weight:700; font-size:21px; color:#22262a; text-shadow:0 1px 0 rgba(255,255,255,0.45); margin:0 0 14px; }
        .spec-row{ display:flex; justify-content:space-between; align-items:baseline; padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.18); }
        .spec-row:last-child{ border-bottom:none; }
        .spec-label{ font-family:var(--font-mono); font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#4a4f54; }
        .spec-value{ font-family:var(--font-mono); font-weight:600; font-size:13.5px; color:#202428; text-align:right; }
        .spec-value.mono{ letter-spacing:0.06em; }

        .empty-state{ text-align:center; padding:50px 20px; color:var(--ink-dim); }
        .empty-state p{ font-size:14px; margin:0 0 16px; }

        .cat-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .cat-tile{ background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:16px 14px; cursor:pointer; display:flex; flex-direction:column; align-items:flex-start; gap:10px; color:var(--ink); transition:border-color .15s ease, transform .12s ease; }
        .cat-tile:hover{ border-color:var(--orange); transform:translateY(-1px); }
        .cat-icon-wrap{ width:38px; height:38px; border-radius:8px; background:var(--panel-2); display:flex; align-items:center; justify-content:center; color:var(--blue); }
        .cat-tile-label{ font-size:13px; font-weight:500; text-align:left; line-height:1.25; }

        .cat-detail-header{ display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .back-btn{ background:var(--panel); border:1px solid var(--border); color:var(--ink); border-radius:6px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; flex-shrink:0; }

        .item-row{ background:var(--panel); border:1px solid var(--border); border-radius:8px; margin-bottom:8px; overflow:hidden; }
        .item-row-head{ display:flex; align-items:center; gap:12px; padding:13px 14px; cursor:pointer; }
        .item-row-icon{ color:var(--blue); flex-shrink:0; }
        .item-row-label{ flex:1; font-size:13.5px; font-weight:500; }
        .item-row-chev{ color:var(--ink-faint); font-family:var(--font-mono); transition:transform .15s ease; }
        .item-row-chev.open{ transform:rotate(90deg); color:var(--orange); }
        .link-drawer{ padding:0 14px 14px; display:flex; flex-direction:column; gap:7px; }
        .link-row{ display:flex; align-items:center; gap:10px; background:var(--panel-2); border:1px solid var(--border); border-radius:6px; padding:10px 12px; text-decoration:none; color:var(--ink); font-size:12.5px; transition:border-color .15s ease, opacity .15s ease; }
        .link-row:hover{ border-color:var(--blue); }
        .link-row.pending{ opacity:0.6; }
        .link-dot{ width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .link-name{ flex:1; }
        .link-row .go{ font-family:var(--font-mono); color:var(--blue); font-size:11px; }

        .tabbar{ position:sticky; bottom:0; display:flex; background:var(--panel); border-top:1px solid var(--border); padding:8px 10px calc(8px + env(safe-area-inset-bottom)); z-index:5; }
        .tab-item{ flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; background:transparent; border:none; color:var(--ink-faint); cursor:pointer; padding:6px 4px; border-radius:8px; }
        .tab-item.active{ color:var(--orange); }
        .tab-item-label{ font-family:var(--font-mono); font-size:10px; letter-spacing:0.05em; text-transform:uppercase; }

        @media (prefers-reduced-motion:reduce){ *{ animation:none !important; transition:none !important; } }
      `}</style>

      <header className="topbar">
        <div className="brand"><span className="brand-mark" />PARTSBENCH</div>
        <div className="topbar-sub">{vehicle ? vehicle.year + " " + vehicle.make : "No vehicle yet"}</div>
      </header>

      <main className="content">
        {activeTab === "vehicle" && (
          <>
            <p className="eyebrow">Vehicle</p>
            <h1 className="page-title">Identify your car.</h1>
            <p className="page-sub">VIN gives you the full breakdown. Year/Make/Model and plate are quick fallbacks.</p>

            <Segmented value={entryMode} onChange={setEntryMode} options={[
              { value: "vin", label: "VIN" },
              { value: "ymm", label: "Year/Make/Model" },
              { value: "plate", label: "Plate" },
            ]} />

            {entryMode === "vin" && (
              <div className="panel">
                <label htmlFor="vin">17-character VIN</label>
                <div className="row">
                  <input id="vin" ref={vinInputRef} maxLength={17} value={vinValue} onChange={handleVinChange}
                    onKeyDown={(e) => e.key === "Enter" && handleVinSubmit()}
                    placeholder="e.g. 1HGCM82633A004352" autoComplete="off" spellCheck="false" style={{ textTransform: "uppercase" }} disabled={decoding} />
                  <button className="btn-primary" onClick={handleVinSubmit} disabled={decoding}>{decoding ? "Decoding…" : "Decode"}</button>
                </div>
                <p className="hint">Find it on the driver-side door jamb sticker, the dash through the windshield, or your registration.</p>
                {vinError && <p className="error-note">{vinError}</p>}
              </div>
            )}

            {entryMode === "ymm" && (
              <div className="panel">
                <div className="grid3">
                  <div>
                    <label htmlFor="year">Year</label>
                    <select id="year" value={year} onChange={(e) => handleYearOrMakeChange(e.target.value, make)}>
                      <option value="">Year</option>
                      {Array.from({ length: CURRENT_YEAR - YEAR_MIN + 1 }, (_, i) => CURRENT_YEAR - i).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="make">Make</label>
                    <select id="make" value={make} onChange={(e) => handleYearOrMakeChange(year, e.target.value)}>
                      <option value="">Make</option>
                      {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="model">Model</label>
                    <select id="model" value={model} disabled={!models.length} onChange={(e) => setModel(e.target.value)}>
                      <option value="">{modelsLoading ? "Loading…" : models.length ? "Model" : "Year+Make first"}</option>
                      {models.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn-primary block" onClick={handleYmmSubmit} disabled={!model}>Find Parts</button>
                {ymmError && <p className="error-note">{ymmError}</p>}
              </div>
            )}

            {entryMode === "plate" && (
              <div className="panel">
                <label htmlFor="plate">State &amp; plate number</label>
                <div className="grid2">
                  <select id="plateState" value={plateState} onChange={(e) => setPlateState(e.target.value)}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input value={plateValue} onChange={(e) => setPlateValue(e.target.value.toUpperCase())} placeholder="e.g. 8ABC123" style={{ textTransform: "uppercase" }} />
                </div>
                <button className="btn-primary block" onClick={handlePlateSubmit}>Look Up</button>
                {plateNote && <p className="info-note">{plateNote}</p>}
              </div>
            )}

            <VehicleWireframe mode={wireMode} targetType={wireTarget} />

            {vehicle && vehicle.vin && (
              <div className="spec-plate">
                <div className="rivet tl" /><div className="rivet tr" /><div className="rivet bl" /><div className="rivet br" />
                <h3 className="plate-title">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                <SpecRow label="Trim" value={vehicle.trim || "—"} />
                <SpecRow label="Body Style" value={vehicle.bodyClass || "—"} />
                <SpecRow label="Engine" value={vehicle.engine} />
                <SpecRow label="Cylinders" value={vehicle.cylinders} />
                <SpecRow label="Horsepower" value={vehicle.hp} />
                <SpecRow label="VIN" value={vehicle.vin} mono />
              </div>
            )}

            {vehicle && !vehicle.vin && (
              <div className="spec-plate">
                <div className="rivet tl" /><div className="rivet tr" /><div className="rivet bl" /><div className="rivet br" />
                <h3 className="plate-title">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                <SpecRow label="Source" value="Year / Make / Model" />
              </div>
            )}
            {vehicle && !vehicle.vin && (
              <p className="info-note">Enter your VIN for the full breakdown — engine, cylinders, horsepower, and body style all come from the VIN, not the model name alone.</p>
            )}
          </>
        )}

        {activeTab === "shop" && (
          <>
            <p className="eyebrow">Shop</p>
            <h1 className="page-title">Shop by category.</h1>
            <p className="page-sub">
              {vehicle ? "Browse down to the exact part for your " + vehicle.year + " " + vehicle.make + " " + vehicle.model + "." : "Add your vehicle first — every result here is matched to it."}
            </p>

            {!vehicle && (
              <div className="empty-state">
                <p>No vehicle on file yet.</p>
                <button className="btn-secondary" onClick={goToVehicleTab}>Add Your Vehicle</button>
              </div>
            )}

            {vehicle && !group && (
              <div className="cat-grid">
                {SHOP.map((g) => (
                  <button key={g.key} className="cat-tile" onClick={() => { setGroupKey(g.key); setSubKey(null); setOpenItemKey(null); }}>
                    <span className="cat-icon-wrap"><Icon name={g.icon} /></span>
                    <span className="cat-tile-label">{g.label}</span>
                  </button>
                ))}
              </div>
            )}

            {vehicle && group && hasMultipleSubs && !sub && (
              <>
                <div className="cat-detail-header">
                  <button className="back-btn" onClick={() => setGroupKey(null)}>‹</button>
                  <h2 className="section-title">{group.label}</h2>
                </div>
                <div className="cat-grid">
                  {group.subcats.map((s) => (
                    <button key={s.key} className="cat-tile" onClick={() => { setSubKey(s.key); setOpenItemKey(null); }}>
                      <span className="cat-icon-wrap"><Icon name={s.icon} /></span>
                      <span className="cat-tile-label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {vehicle && group && sub && (
              <>
                <div className="cat-detail-header">
                  <button className="back-btn" onClick={() => (hasMultipleSubs ? setSubKey(null) : setGroupKey(null))}>‹</button>
                  <h2 className="section-title">{sub.label}</h2>
                </div>
                {sub.items.map((item) => {
                  const isOpen = openItemKey === item.label;
                  const query = [vehicle.year, vehicle.make, vehicle.model, item.terms].filter(Boolean).join(" ");
                  return (
                    <div className="item-row" key={item.label}>
                      <div className="item-row-head" onClick={() => setOpenItemKey(isOpen ? null : item.label)}>
                        <span className="item-row-icon"><Icon name={sub.icon} size={18} /></span>
                        <span className="item-row-label">{item.label}</span>
                        <span className={"item-row-chev" + (isOpen ? " open" : "")}>›</span>
                      </div>
                      {isOpen && <LinkDrawer query={query} />}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </main>

      <nav className="tabbar">
        <button className={"tab-item" + (activeTab === "vehicle" ? " active" : "")} onClick={() => setActiveTab("vehicle")}>
          <Icon name="brake" size={20} /><span className="tab-item-label">Vehicle</span>
        </button>
        <button className={"tab-item" + (activeTab === "shop" ? " active" : "")} onClick={() => setActiveTab("shop")}>
          <Icon name="filter" size={20} /><span className="tab-item-label">Shop</span>
        </button>
      </nav>
    </div>
  );
}
