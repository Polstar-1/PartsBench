/* ============================================================
   WHAT'S NEW
   Add a new entry at the TOP of this list whenever something ships,
   with the next id number. Only the newest 10 are ever shown, so the
   older ones drop off by themselves; no need to delete anything.
   ============================================================ */
export const MAX_UPDATES = 10;

const ALL = [
  { id: 5, date: "Nov 10", title: "Maintenance got smarter",
    text: "Every item now links straight to a parts search. Your mileage estimates itself between updates (shown with a ~). Brake and tire intervals adjust for hybrids, EVs and all-wheel drive, with the reason shown. Plus a link to your owner's manual." },
  { id: 4, date: "Nov 10", title: "Tires, brakes and shocks, part by part",
    text: "Log tires by corner (driver front, driver rear, passenger front, passenger rear) and brake pads, rotors and shocks by axle, or log the whole set at once. Added a 12V battery replacement reminder too." },
  { id: 3, title: "Cleaner part results",
    text: "Searching a part now shows the actual part first. Lookalikes like sensors, seals and tools sit behind a “Show related parts” button." },
  { id: 2, title: "Live eBay listings in Shop",
    text: "Open any part to see real eBay listings that fit your vehicle, with price, shipping and condition. Sort by best match, price or newest." },
  { id: 1, title: "Part pages for Google",
    text: "Every vehicle and part now has its own page with recalls and a maintenance schedule, so more people can find Parts Bench." },
];

// Newest first, never more than MAX_UPDATES.
export const UPDATES = [...ALL].sort((a, b) => b.id - a.id).slice(0, MAX_UPDATES);
export const LATEST_ID = UPDATES.length ? UPDATES[0].id : 0;
