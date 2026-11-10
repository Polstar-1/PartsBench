/* ============================================================
   WHAT'S NEW
   New entries now write themselves: every push to GitHub adds one,
   using the commit title and the lines under it (see
   scripts/updates-from-git.mjs). Put [internal] in a commit title to
   keep it out of the list. The entries below are the older, hand-written
   ones. Only the newest 10 are ever shown, so old ones drop off by themselves.
   ============================================================ */
/* global __GIT_UPDATES__ */
export const MAX_UPDATES = 10;

// Filled in at build time from the Git history. Empty when there is none.
const FROM_GIT = typeof __GIT_UPDATES__ !== "undefined" ? __GIT_UPDATES__ : [];

const ALL = [
  { id: 6, date: "Nov 10", title: "Premium accounts",
    text: "Accounts with Premium now show a small PREMIUM tag under the logo, and Settings shows your plan." },
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
export const UPDATES = [...FROM_GIT, ...ALL].sort((a, b) => b.id - a.id).slice(0, MAX_UPDATES);
export const LATEST_ID = UPDATES.length ? UPDATES[0].id : 0;
