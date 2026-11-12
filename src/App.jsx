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
import Plans from "./screens/Plans";
import useAuth from "./useAuth";
import useGarageSync from "./useGarageSync";
import usePremium from "./usePremium";
import { canAddVehicle } from "./premium";
import { loadGarage, saveGarage, newId } from "./storage";
import { readDeepLink } from "./deeplink";
import { withReading } from "./maintenance";
import Updates from "./Updates";
import AccountNotice from "./AccountNotice";
import { rememberAccount } from "./accountMemory";
import { rememberTestMode } from "./billing";

// Coming back from Stripe: ?checkout=success | cancel | portal
const RETURN = (() => {
  rememberTestMode(window.location.search);
  const v = new URLSearchParams(window.location.search).get("checkout");
  return v === "success" || v === "cancel" || v === "portal" ? v : null;
})();
const RETURN_TEXT = {
  success: "Thanks! Your payment went through. Premium switches on in a few seconds.",
  cancel: "Checkout cancelled. You weren't charged.",
  portal: "",
};

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
  const [tab, setTab] = useState(link ? "shop" : RETURN ? "plans" : "identify");
  const [banner, setBanner] = useState(RETURN ? RETURN_TEXT[RETURN] : "");
  const [tick, setTick] = useState(0);
  const [waited, setWaited] = useState(false); // finished checking for Premium after paying
  const [garage, setGarage] = useState(loadGarage);
  const [draft, setDraft] = useState(link ? link.vehicle : null); // a looked-up vehicle that isn't saved yet
  const [shopQuery, setShopQuery] = useState(link ? link.query : "");
  const clearShopQuery = useCallback(() => setShopQuery(""), []);
  const auth = useAuth();
  const sync = useGarageSync(auth.user, garage, setGarage);
  const premium = usePremium(auth.user, tick);

  // Signing out uploads anything still waiting, then empties this device's Garage
  // so the next person to sign in here never sees these vehicles.
  const accountAuth = {
    ...auth,
    signOut: async () => {
      await sync.flush();
      const r = await auth.signOut();
      rememberAccount(false); // signing out on purpose: no "you're signed out" reminder afterwards
      sync.clearLocal();
      setDraft(null);
      return r;
    },
    // Deleting removes the account and its saved Garage. This device is emptied too.
    deleteAccount: async () => {
      const r = await auth.deleteAccount();
      if (!r.error) {
        rememberAccount(false);
        sync.clearLocal();
        setDraft(null);
      }
      return r;
    },
  };

  useEffect(() => { saveGarage(garage); }, [garage]);
  useEffect(() => { if (auth.user) rememberAccount(true); }, [auth.user]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  useEffect(() => { if (link || RETURN) window.history.replaceState(null, "", "/"); }, [link]);

  // After paying, Stripe tells our server a moment later, so check a few times until Premium shows up.
  useEffect(() => {
    if (RETURN !== "success" && RETURN !== "portal") return undefined;
    let n = 0;
    const id = setInterval(() => { n += 1; setTick((t) => t + 1); if (n >= 24) { clearInterval(id); setWaited(true); } }, 2500);
    return () => clearInterval(id);
  }, []);
  const shownBanner = banner && RETURN === "success"
    ? (premium ? "You're Premium now. Thank you for supporting Parts Bench!" : waited ? "Your payment went through, but Premium hasn't shown up yet. Please refresh the page. If it still isn't there after a few minutes, contact support." : banner)
    : banner;

  const savedMatch = draft && draft.vin ? garage.vehicles.find((v) => v.vin === draft.vin) || null : null;
  const savedActive = garage.vehicles.find((v) => v.id === garage.activeId) || null;
  const active = savedMatch || draft || savedActive;

  const canAdd = canAddVehicle(garage.vehicles.length, premium);

  function saveVehicle(d, mileage) {
    if (!canAdd) return; // the screens show the Premium note instead of a Save button
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
        {(tab === "identify" || tab === "garage" || tab === "maintain") && (
          <AccountNotice auth={auth} tab={tab} hasVehicles={garage.vehicles.length > 0} goSettings={() => setTab("settings")} />
        )}
        {tab === "identify" && (
          <Identify draft={draft} savedMatch={savedMatch}
            onDraft={setDraft} onSave={saveVehicle} canAdd={canAdd} goPlans={() => setTab("plans")}
            goShop={() => setTab("shop")} goGarage={() => setTab("garage")} />
        )}
        {tab === "garage" && (
          <Garage vehicles={garage.vehicles} activeId={active && active.id} onSelect={selectVehicle}
            onUpdate={updateVehicle} onRemove={removeVehicle} canAdd={canAdd} goPlans={() => setTab("plans")}
            goIdentify={() => setTab("identify")} goMaintain={() => setTab("maintain")} goShop={() => setTab("shop")} />
        )}
        {tab === "maintain" && (
          <Maintain vehicle={active} onUpdate={updateVehicle}
            goGarage={() => setTab("garage")} goIdentify={() => setTab("identify")}
            goShopFor={(q) => { setShopQuery(q); setTab("shop"); }}
            saveDraft={() => saveVehicle(active, null)}
            premium={premium} goPlans={() => setTab("plans")} canAdd={canAdd} />
        )}
        {tab === "shop" && <Shop vehicle={active} goIdentify={() => setTab("identify")} initialQuery={shopQuery} onQueryUsed={clearShopQuery} />}
        {tab === "ask" && <Ask vehicle={active} signedIn={!!auth.user} premium={premium} goSettings={() => setTab("settings")} goPlans={() => setTab("plans")} goShopFor={(q) => { setShopQuery(q); setTab("shop"); }} />}
        {tab === "ideas" && <Ideas auth={auth} goSettings={() => setTab("settings")} />}
        {tab === "settings" && <Settings auth={accountAuth} sync={sync} premium={premium} goPlans={() => setTab("plans")} />}
        {tab === "plans" && <Plans premium={premium} signedIn={!!auth.user} goSettings={() => setTab("settings")} banner={shownBanner} onDismissBanner={() => setBanner("")} />}
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
