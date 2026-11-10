import { useCallback, useEffect, useState } from "react";
import "./styles.css";
import Icon from "./Icon";
import Identify from "./screens/Identify";
import Garage from "./screens/Garage";
import Maintain from "./screens/Maintain";
import Shop from "./screens/Shop";
import Ask from "./screens/Ask";
import Ideas from "./screens/Ideas";
import Settings from "./screens/Settings";
import useAuth from "./useAuth";
import useGarageSync from "./useGarageSync";
import usePremium from "./usePremium";
import { loadGarage, saveGarage, newId } from "./storage";
import { readDeepLink } from "./deeplink";
import { withReading } from "./maintenance";
import Updates from "./Updates";

const TABS = [
  { key: "identify", label: "Identify", icon: "search" },
  { key: "garage", label: "Garage", icon: "garage" },
  { key: "maintain", label: "Maintain", icon: "wrench" },
  { key: "shop", label: "Shop", icon: "tag" },
  { key: "ask", label: "Ask", icon: "chat" },
  { key: "ideas", label: "Ideas", icon: "bulb" },
];

export default function App() {
  // Arriving from one of our search pages: open straight to Shop for that vehicle and part.
  const [link] = useState(() => readDeepLink(window.location.search));
  const [tab, setTab] = useState(link ? "shop" : "identify");
  const [garage, setGarage] = useState(loadGarage);
  const [draft, setDraft] = useState(link ? link.vehicle : null); // a looked-up vehicle that isn't saved yet
  const [shopQuery, setShopQuery] = useState(link ? link.query : "");
  const clearShopQuery = useCallback(() => setShopQuery(""), []);
  const auth = useAuth();
  const sync = useGarageSync(auth.user, garage, setGarage);
  const premium = usePremium(auth.user);

  // Signing out uploads anything still waiting, then empties this device's Garage
  // so the next person to sign in here never sees these vehicles.
  const accountAuth = {
    ...auth,
    signOut: async () => {
      await sync.flush();
      const r = await auth.signOut();
      sync.clearLocal();
      setDraft(null);
      return r;
    },
    // Deleting removes the account and its saved Garage. This device is emptied too.
    deleteAccount: async () => {
      const r = await auth.deleteAccount();
      if (!r.error) {
        sync.clearLocal();
        setDraft(null);
      }
      return r;
    },
  };

  useEffect(() => { saveGarage(garage); }, [garage]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  useEffect(() => { if (link) window.history.replaceState(null, "", "/"); }, [link]);

  const savedMatch = draft && draft.vin ? garage.vehicles.find((v) => v.vin === draft.vin) || null : null;
  const savedActive = garage.vehicles.find((v) => v.id === garage.activeId) || null;
  const active = savedMatch || draft || savedActive;

  function saveVehicle(d, mileage) {
    const v = withReading(null, { ...d, id: newId(), nickname: "", mileage: mileage == null ? null : mileage, log: {}, intervals: {}, odos: [] });
    setGarage((g) => ({ vehicles: [...g.vehicles, v], activeId: v.id }));
    setDraft(null);
    setTab("garage");
  }

  function updateVehicle(id, patch) {
    setGarage((g) => ({
      ...g,
      vehicles: g.vehicles.map((v) => (v.id === id ? withReading(v, { ...v, ...(typeof patch === "function" ? patch(v) : patch) }) : v)),
    }));
  }

  function removeVehicle(id) {
    setGarage((g) => {
      const vehicles = g.vehicles.filter((v) => v.id !== id);
      return { vehicles, activeId: g.activeId === id ? (vehicles[0] ? vehicles[0].id : null) : g.activeId };
    });
  }

  function selectVehicle(id) {
    setDraft(null);
    setGarage((g) => ({ ...g, activeId: id }));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <button className={"cog-btn" + (tab === "settings" ? " active" : "")} aria-label="Settings" aria-current={tab === "settings" ? "page" : undefined} onClick={() => setTab("settings")}>
            <Icon name="cog" size={22} />
          </button>
          <span className="brand-text">
            PARTSBENCH
            {premium && <span className="brand-tier">PREMIUM</span>}
          </span>
        </div>
        <div className="topbar-right">
          <div className="topbar-sub">{active ? [active.year, active.make].filter(Boolean).join(" ") : "No vehicle yet"}</div>
          <Updates />
        </div>
      </header>

      <main className="content">
        {tab === "identify" && (
          <Identify draft={draft} savedMatch={savedMatch}
            onDraft={setDraft} onSave={saveVehicle}
            goShop={() => setTab("shop")} goGarage={() => setTab("garage")} />
        )}
        {tab === "garage" && (
          <Garage vehicles={garage.vehicles} activeId={active && active.id} onSelect={selectVehicle}
            onUpdate={updateVehicle} onRemove={removeVehicle}
            goIdentify={() => setTab("identify")} goMaintain={() => setTab("maintain")} goShop={() => setTab("shop")} />
        )}
        {tab === "maintain" && (
          <Maintain vehicle={active} onUpdate={updateVehicle}
            goGarage={() => setTab("garage")} goIdentify={() => setTab("identify")}
            goShopFor={(q) => { setShopQuery(q); setTab("shop"); }}
            saveDraft={() => saveVehicle(active, null)} />
        )}
        {tab === "shop" && <Shop vehicle={active} goIdentify={() => setTab("identify")} initialQuery={shopQuery} onQueryUsed={clearShopQuery} />}
        {tab === "ask" && <Ask vehicle={active} />}
        {tab === "ideas" && <Ideas auth={auth} goSettings={() => setTab("settings")} />}
        {tab === "settings" && <Settings auth={accountAuth} sync={sync} premium={premium} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.key} className={"tab-item" + (tab === t.key ? " active" : "")} aria-current={tab === t.key ? "page" : undefined} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} size={20} /><span className="tab-item-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
