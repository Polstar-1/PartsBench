import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, configured } from "./supabase";

// Keeps the Garage in step with the signed-in account.
//
// The Garage always lives in this device's storage first, so the app works
// offline and when signed out. When someone is signed in, the same data is
// also saved to one row in the "garages" table (one row per account).
//
// A small note kept on this device remembers which account the Garage belongs
// to, the last version we saw in the cloud, and whether there are edits that
// haven't been uploaded yet.

const META = "partsbench.sync.v1";
const EMPTY = { vehicles: [], activeId: null };

function readMeta() {
  try { return JSON.parse(localStorage.getItem(META)) || null; } catch { return null; }
}
function writeMeta(m) {
  try {
    if (m) localStorage.setItem(META, JSON.stringify(m));
    else localStorage.removeItem(META);
  } catch {
    // storage blocked: sync still works while the page is open
  }
}

function clean(g) {
  return g && Array.isArray(g.vehicles) ? { vehicles: g.vehicles, activeId: g.activeId || null } : EMPTY;
}

// Combine two garages without losing a vehicle. The cloud copy wins when the
// same vehicle is in both; vehicles only on this device are added.
export function mergeGarages(local, remote) {
  const ids = new Set(remote.vehicles.map((v) => v.id));
  const vins = new Set(remote.vehicles.map((v) => v.vin).filter(Boolean));
  const extra = local.vehicles.filter((v) => !ids.has(v.id) && !(v.vin && vins.has(v.vin)));
  const vehicles = [...remote.vehicles, ...extra];
  const has = (id) => id && vehicles.some((v) => v.id === id);
  const activeId = has(remote.activeId) ? remote.activeId : has(local.activeId) ? local.activeId : vehicles[0] ? vehicles[0].id : null;
  return { vehicles, activeId };
}

function fetchRow(uid) {
  return supabase.from("garages").select("data,updated_at").eq("user_id", uid).maybeSingle();
}

export default function useGarageSync(user, garage, setGarage) {
  const uid = user ? user.id : null;
  const [st, setSt] = useState({ uid: null, status: "idle" });
  // "off" signed out, "syncing" working, "synced" up to date, "error" cloud unreachable
  const status = !configured || !uid ? "off" : st.uid === uid ? st.status : "syncing";

  const garageRef = useRef(garage);
  const loadedFor = useRef(null); // account whose cloud copy we've already loaded
  const skipPush = useRef(false); // the next Garage change came from the cloud, don't upload it back
  const version = useRef(0); // counts real edits, so an edit during an upload isn't marked as saved
  const timer = useRef(null);

  useEffect(() => { garageRef.current = garage; });

  const push = useCallback(async (id, snapshot) => {
    const sent = version.current;
    const { data, error } = await supabase.from("garages").upsert({ user_id: id, data: snapshot }).select("updated_at").single();
    if (error) {
      setSt({ uid: id, status: "error" });
      return false;
    }
    writeMeta({ uid: id, at: data.updated_at, dirty: version.current !== sent });
    setSt({ uid: id, status: "synced" });
    return true;
  }, []);

  // When someone signs in (or the app opens already signed in): load the cloud copy.
  useEffect(() => {
    if (!configured || !uid) {
      loadedFor.current = null;
      return undefined;
    }
    let live = true;
    (async () => {
      const { data: row, error } = await fetchRow(uid);
      if (!live) return;
      if (error) { setSt({ uid, status: "error" }); return; }

      const local = clean(garageRef.current);
      const meta = readMeta();
      const mine = Boolean(meta && meta.uid === uid);
      const dirty = mine && Boolean(meta.dirty);

      if (!row) {
        loadedFor.current = uid;
        await push(uid, local);
        return;
      }
      const remote = clean(row.data);
      const changed = !mine || row.updated_at !== meta.at;

      if (!mine || (dirty && changed)) {
        // first time on this device, or edits on two devices: keep everything from both
        const merged = mergeGarages(local, remote);
        skipPush.current = true;
        setGarage(merged);
        loadedFor.current = uid;
        await push(uid, merged);
      } else if (changed) {
        skipPush.current = true;
        setGarage(remote);
        writeMeta({ uid, at: row.updated_at, dirty: false });
        loadedFor.current = uid;
        setSt({ uid, status: "synced" });
      } else if (dirty) {
        loadedFor.current = uid;
        await push(uid, local);
      } else {
        loadedFor.current = uid;
        setSt({ uid, status: "synced" });
      }
    })();
    return () => { live = false; };
  }, [uid, push, setGarage]);

  // Every edit: note it, then upload shortly after the last change.
  useEffect(() => {
    if (skipPush.current) { skipPush.current = false; return undefined; }
    if (!configured || !uid || loadedFor.current !== uid) return undefined;
    version.current += 1;
    const m = readMeta();
    writeMeta({ uid, at: m && m.uid === uid ? m.at : null, dirty: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { push(uid, garageRef.current); }, 800);
    return () => clearTimeout(timer.current);
  }, [garage, uid, push]);

  // Coming back to the app: pick up changes made on another device.
  useEffect(() => {
    if (!configured || !uid) return undefined;
    const onVisible = async () => {
      if (document.visibilityState !== "visible" || loadedFor.current !== uid) return;
      const before = readMeta();
      if (before && before.dirty) return;
      const { data: row, error } = await fetchRow(uid);
      if (error || !row) return;
      const m = readMeta();
      if (m && m.dirty) return;
      if (!m || m.uid !== uid || row.updated_at !== m.at) {
        skipPush.current = true;
        writeMeta({ uid, at: row.updated_at, dirty: false });
        setGarage(clean(row.data));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [uid, setGarage]);

  // Upload anything still waiting (used just before signing out).
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const m = readMeta();
    if (uid && loadedFor.current === uid && m && m.uid === uid && m.dirty) {
      await push(uid, garageRef.current);
    }
  }, [uid, push]);

  // After signing out, this device's Garage is emptied so the next person to
  // sign in here never gets someone else's vehicles.
  const clearLocal = useCallback(() => {
    clearTimeout(timer.current);
    writeMeta(null);
    skipPush.current = true;
    setGarage(EMPTY);
  }, [setGarage]);

  return { status, flush, clearLocal };
}
