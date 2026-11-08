import { useEffect, useState } from "react";
import "./styles.css";
import Icon from "./Icon";
import Identify from "./screens/Identify";
import Garage from "./screens/Garage";
import Maintain from "./screens/Maintain";
import Shop from "./screens/Shop";
import Ask from "./screens/Ask";
import { loadGarage, saveGarage, newId } from "./storage";

const TABS = [
  { key: "identify", label: "Identify", icon: "search" },
  { key: "garage", label: "Garage", icon: "garage" },
  { key: "maintain", label: "Maintain", icon: "wrench" },
  { key: "shop", label: "Shop", icon: "tag" },
  { key: "ask", label: "Ask", icon: "chat" },
];

export default function App() {
  const [tab, setTab] = useState("identify");
  const [garage, setGarage] = useState(loadGarage);
  const [draft, setDraft] = useState(null); // a looked-up vehicle that isn't saved yet

  useEffect(() => { saveGarage(garage); }, [garage]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  const savedMatch = draft && draft.vin ? garage.vehicles.find((v) => v.vin === draft.vin) || null : null;
  const savedActive = garage.vehicles.find((v) => v.id === garage.activeId) || null;
  const active = savedMatch || draft || savedActive;

  function saveVehicle(d, mileage) {
    const v = { ...d, id: newId(), nickname: "", mileage: mileage == null ? null : mileage, log: {}, intervals: {} };
    setGarage((g) => ({ vehicles: [...g.vehicles, v], activeId: v.id }));
    setDraft(null);
    setTab("garage");
  }

  function updateVehicle(id, patch) {
    setGarage((g) => ({
      ...g,
      vehicles: g.vehicles.map((v) => (v.id === id ? { ...v, ...(typeof patch === "function" ? patch(v) : patch) } : v)),
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
        <div className="brand"><span className="brand-mark" />PARTSBENCH</div>
        <div className="topbar-sub">{active ? [active.year, active.make].filter(Boolean).join(" ") : "No vehicle yet"}</div>
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
            saveDraft={() => saveVehicle(active, null)} />
        )}
        {tab === "shop" && <Shop vehicle={active} goIdentify={() => setTab("identify")} />}
        {tab === "ask" && <Ask vehicle={active} />}
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
