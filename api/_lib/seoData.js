// Data for the public search-engine pages (/parts/...). Nothing here runs in the app itself.
// Files starting with "_" inside api/ are NOT turned into web endpoints by Vercel.
import { CATALOG } from "../../src/catalog.js";

export const SITE = "https://www.mypartsbench.com";

export const slugify = (s) => String(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ------------------------------------------------------------------ vehicles
   Only vehicles listed here get a page. Years are conservative: the first and last
   model years sold continuously in the U.S. Add models here to grow the site. */
const V = (make, model, from, to) => ({ make, model, from, to, slug: slugify(make) + "-" + slugify(model) });

export const VEHICLES = [
  V("Toyota", "Camry", 2000, 2025), V("Toyota", "Corolla", 2000, 2025), V("Toyota", "RAV4", 2000, 2025),
  V("Toyota", "Highlander", 2001, 2025), V("Toyota", "Tacoma", 2000, 2025), V("Toyota", "Tundra", 2000, 2025),
  V("Toyota", "4Runner", 2000, 2025), V("Toyota", "Sienna", 2000, 2025),
  V("Honda", "Civic", 2000, 2025), V("Honda", "Accord", 2000, 2025), V("Honda", "CR-V", 2000, 2025),
  V("Honda", "Pilot", 2003, 2025), V("Honda", "Odyssey", 2000, 2025),
  V("Ford", "F-150", 2000, 2025), V("Ford", "Escape", 2001, 2025), V("Ford", "Explorer", 2000, 2025),
  V("Ford", "Fusion", 2006, 2020), V("Ford", "Focus", 2000, 2018), V("Ford", "Mustang", 2000, 2025), V("Ford", "Edge", 2007, 2024),
  V("Chevrolet", "Silverado 1500", 2000, 2025), V("Chevrolet", "Equinox", 2005, 2025), V("Chevrolet", "Malibu", 2000, 2024),
  V("Chevrolet", "Impala", 2000, 2020), V("Chevrolet", "Cruze", 2011, 2019), V("Chevrolet", "Traverse", 2009, 2025),
  V("Chevrolet", "Tahoe", 2000, 2025), V("Chevrolet", "Suburban", 2000, 2025), V("Chevrolet", "Camaro", 2010, 2024),
  V("GMC", "Sierra 1500", 2000, 2025), V("GMC", "Acadia", 2007, 2025), V("GMC", "Terrain", 2010, 2025),
  V("Ram", "1500", 2011, 2025),
  V("Dodge", "Charger", 2006, 2023), V("Dodge", "Challenger", 2008, 2023), V("Dodge", "Grand Caravan", 2000, 2020),
  V("Jeep", "Wrangler", 2000, 2025), V("Jeep", "Grand Cherokee", 2000, 2025), V("Jeep", "Cherokee", 2014, 2023),
  V("Nissan", "Altima", 2000, 2025), V("Nissan", "Sentra", 2000, 2025), V("Nissan", "Rogue", 2008, 2025),
  V("Nissan", "Maxima", 2000, 2023), V("Nissan", "Pathfinder", 2000, 2025), V("Nissan", "Frontier", 2000, 2025),
  V("Hyundai", "Elantra", 2001, 2025), V("Hyundai", "Sonata", 2000, 2025), V("Hyundai", "Santa Fe", 2001, 2025), V("Hyundai", "Tucson", 2005, 2025),
  V("Kia", "Optima", 2001, 2020), V("Kia", "Sorento", 2003, 2025), V("Kia", "Soul", 2010, 2025),
  V("Subaru", "Outback", 2000, 2025), V("Subaru", "Forester", 2000, 2025), V("Subaru", "Impreza", 2000, 2025), V("Subaru", "Crosstrek", 2013, 2025),
  V("Mazda", "Mazda3", 2004, 2025), V("Mazda", "CX-5", 2013, 2025), V("Mazda", "Mazda6", 2003, 2021),
  V("Volkswagen", "Jetta", 2000, 2025), V("Volkswagen", "Passat", 2000, 2022),
  V("BMW", "3 Series", 2000, 2025), V("Mercedes-Benz", "C-Class", 2001, 2025), V("Audi", "A4", 2000, 2025),
  V("Cadillac", "Escalade", 2000, 2025), V("Saab", "9-3", 2003, 2011),
];

const BY_SLUG = new Map(VEHICLES.map((v) => [v.slug, v]));

export function vehicleFromSlug(slug) {
  const m = /^(\d{4})-([a-z0-9-]+)$/.exec(String(slug || ""));
  if (!m) return null;
  const v = BY_SLUG.get(m[2]);
  const year = Number(m[1]);
  if (!v || year < v.from || year > v.to) return null;
  return { ...v, year, name: year + " " + v.make + " " + v.model, path: "/parts/" + year + "-" + v.slug };
}

export const yearsOf = (v) => Array.from({ length: v.to - v.from + 1 }, (_, i) => v.to - i);

/* ---------------------------------------------------------------------- parts
   Core parts that people search for most. Everything is written as general guidance
   ("often", "commonly") because lifespans and difficulty vary by vehicle.
   label  must match a part in src/catalog.js exactly (a test checks this).
   maint  optional key from src/maintenance.js, to show the related service interval.
   top    included in the sitemap (the rest are still linked from each vehicle page). */

// Part pages go in the sitemap only for the newest model years of each vehicle, where the searches are.
export const SITEMAP_PART_YEARS = 12;
const P = (label, o) => ({ label, slug: slugify(label), ...o });

export const CORE_PARTS = [
  P("Front Brake Pads", { top: true, maint: "brake-inspect",
    what: "Front brake pads press against the rotors to slow your {v}. The front brakes do most of the stopping, so the front pads usually wear out before the rears.",
    signs: ["Squealing or grinding when you brake", "A longer pedal travel or a brake warning light", "Pad material thinner than about 3 mm (1/8 inch) when checked through the wheel or with the wheel off"],
    life: "Commonly 30,000 to 70,000 miles, depending on driving and pad material.", diff: "Intermediate", diffNote: "Needs a jack, jack stands and a caliper tool or C-clamp.",
    tip: "Replace pads on both sides of the same axle together. Ceramic pads are usually quieter and cleaner; semi-metallic pads often bite harder and handle heat better. Pick up new hardware and check the rotors at the same time." }),
  P("Rear Brake Pads", { maint: "brake-inspect",
    what: "Rear brake pads add stopping power at the back of your {v} and hold the car on a slope when the parking brake is applied on some designs.",
    signs: ["Grinding or squealing from the rear when braking", "Dust or wear that is uneven side to side", "Pad material thinner than about 3 mm (1/8 inch)"],
    life: "Often longer than front pads, sometimes twice as long.", diff: "Intermediate", diffNote: "Some cars with an electronic parking brake need a scan tool to retract the caliper first.",
    tip: "Check whether your rear brakes are discs or drums before ordering. Replace both sides together." }),
  P("Front Brake Rotors", { top: true, maint: "brake-inspect",
    what: "Rotors are the discs the pads clamp onto. They turn braking force into heat and need a smooth, thick enough surface to work well.",
    signs: ["Pulsing in the pedal or a shaking steering wheel when braking", "Deep grooves, scoring or a raised rusty lip at the edge", "Thickness below the minimum stamped on the rotor"],
    life: "Often 50,000 to 70,000 miles, and many are replaced with every second set of pads.", diff: "Intermediate", diffNote: "Same tools as a pad job, plus a way to clean the hub face.",
    tip: "Replace rotors in pairs and fit new pads at the same time. Check the minimum thickness stamped on the rotor before reusing one." }),
  P("Rear Brake Rotors", { maint: "brake-inspect",
    what: "Rear rotors work with the rear pads to share braking with the front. They wear more slowly than the fronts.",
    signs: ["Vibration under braking from the back of the car", "Scoring, rust ridges or a lip at the edge", "Thickness below the minimum stamped on the rotor"],
    life: "Often 70,000 miles or more.", diff: "Intermediate", diffNote: "Parking brake designs vary; some have a small drum inside the rotor.",
    tip: "Replace in pairs. Confirm your car has rear discs, not drums." }),
  P("Front Brake Caliper", { maint: "brake-inspect",
    what: "The caliper squeezes the pads against the rotor when you press the pedal. A sticking caliper can cause pulling, heat and uneven wear.",
    signs: ["The car pulls to one side when braking", "One wheel is much hotter than the others or smells like burning", "Fluid leaking at the caliper, or one pad worn far more than the other"],
    life: "Often 75,000 miles or more, but they can seize sooner where roads are salted.", diff: "Advanced", diffNote: "The brake system has to be bled after the hydraulic line is opened.",
    tip: "Remanufactured calipers are common and cost less. Ask about the core charge, and replace pads and fluid at the same time." }),
  P("Brake Master Cylinder", { maint: "brake-fluid",
    what: "The master cylinder turns pedal movement into hydraulic pressure for all four brakes.",
    signs: ["A spongy pedal that slowly sinks to the floor", "Brake fluid level dropping with no visible leak", "A brake warning light"],
    life: "Often lasts the life of the vehicle, but seals can wear after many years.", diff: "Advanced", diffNote: "The system must be bled afterward, and brakes are a safety system.",
    tip: "Match the bore size and brake type (ABS or not). If you are not confident bleeding brakes, have a shop do it." }),
  P("Spark Plugs", { top: true, maint: "plugs",
    what: "Spark plugs ignite the air and fuel mixture in each cylinder of your {v}. Worn plugs make the engine run less smoothly and use more fuel.",
    signs: ["Rough idle or hesitation", "Hard starting or misfires", "Worse fuel economy or a check-engine light for misfires"],
    life: "Copper plugs often need changing around 20,000 to 30,000 miles. Iridium or platinum plugs commonly last 60,000 to 100,000 miles.", diff: "Beginner to Intermediate", diffNote: "On some engines the plugs sit under the intake or coil packs, which adds time.",
    tip: "Use the plug type and gap listed in your owner's manual, and replace the full set at once." }),
  P("Ignition Coils", {
    what: "Ignition coils turn the battery's low voltage into the high voltage a spark plug needs. Many engines have one coil per cylinder.",
    signs: ["A flashing check-engine light or misfire codes", "Rough running under load", "Hard starting"],
    life: "Often 80,000 to 100,000 miles or more.", diff: "Beginner", diffNote: "Usually held by a single bolt and a connector on each coil.",
    tip: "A misfire on one cylinder points to that cylinder's coil or plug. Many people change the plugs at the same time." }),
  P("Starter Motor", { top: true,
    what: "The starter turns the engine over to begin running. A weak starter can leave you stranded even with a good battery.",
    signs: ["A click but no cranking", "Slow cranking after the battery has been tested", "Grinding noises when starting"],
    life: "Often 100,000 miles or more.", diff: "Intermediate", diffNote: "Usually accessed from underneath and held by two or three bolts.",
    tip: "Test the battery and cable connections first. Remanufactured starters are common and cost less." }),
  P("Alternator", { top: true,
    what: "The alternator charges the battery and powers the electrical system while the engine runs in your {v}.",
    signs: ["A battery or charging warning light", "Dim or flickering lights", "A battery that keeps going flat, or a whining noise"],
    life: "Often 100,000 to 150,000 miles.", diff: "Intermediate", diffNote: "Disconnect the battery first. Access varies a lot between engines.",
    tip: "Have the battery and alternator tested before buying; a bad battery is often mistaken for a bad alternator. Remanufactured units are common." }),
  P("Car Battery", { top: true, maint: "battery",
    what: "The battery starts your {v} and supports the electrical system. Heat and short trips shorten its life.",
    signs: ["Slow cranking or clicking", "Dim lights, or a battery warning light", "A case that is swollen, leaking or heavily corroded, or a battery older than about 4 years"],
    life: "Commonly 3 to 5 years.", diff: "Beginner", diffNote: "Basic wrenches. Some cars need the radio or windows relearned afterward.",
    tip: "Match the group size, terminal layout and cold-cranking amps in your owner's manual. If your car came with an AGM battery or has start-stop, replace it with the same type. Check the date code on the case." }),
  P("Water Pump", { top: true, maint: "coolant",
    what: "The water pump moves coolant through the engine and radiator. A failing pump can lead to overheating.",
    signs: ["Coolant leaking from the front of the engine", "Overheating, or a whining or grinding noise", "Coolant residue around the pump's weep hole"],
    life: "Often 60,000 to 100,000 miles. On engines with a timing belt it is commonly replaced with the belt.", diff: "Advanced", diffNote: "Access varies; on some engines it sits behind the timing belt.",
    tip: "If the pump is driven by the timing belt, replace both together. Use the coolant type in your owner's manual and bleed air from the system afterward." }),
  P("Thermostat", { maint: "coolant",
    what: "The thermostat keeps the engine at the right temperature by controlling coolant flow.",
    signs: ["The engine overheats, or never reaches normal temperature", "Weak heater output", "A temperature gauge that swings"],
    life: "Often 10 years or 100,000 miles.", diff: "Intermediate", diffNote: "Usually under a housing at the end of the upper radiator hose.",
    tip: "Use the right temperature rating, replace the gasket or seal, and bleed air from the cooling system afterward." }),
  P("Radiator", { maint: "coolant",
    what: "The radiator releases engine heat into the air. Leaks and clogs reduce cooling and can lead to overheating.",
    signs: ["Coolant leaking or a puddle under the front of the car", "Overheating or low coolant", "A sweet smell, or coolant mixed into the transmission fluid"],
    life: "Often 8 to 12 years.", diff: "Intermediate", diffNote: "Includes draining and refilling coolant and moving transmission cooler lines on many cars.",
    tip: "Check whether your car needs an automatic or manual transmission version. Replace the cap and hoses if they are old, and refill with the right coolant." }),
  P("Radiator Fan Assembly", {
    what: "The radiator fan pulls air through the radiator when the car is slow or stopped, which keeps the engine and air conditioning cool in traffic.",
    signs: ["Overheating in traffic but not at highway speed", "A/C that blows warm at idle", "A fan that never runs"],
    life: "Often 100,000 miles or more.", diff: "Intermediate", diffNote: "Often held by a few clips and bolts, plus an electrical connector.",
    tip: "Check the fuse and relay first. Some cars have one fan, some two; match yours." }),
  P("Serpentine Belt", { maint: "serp",
    what: "The serpentine belt drives the alternator, power steering, A/C compressor and often the water pump on your {v}.",
    signs: ["Squealing from the front of the engine", "Cracks, fraying or a glazed surface", "Battery, power steering or overheating problems if the belt slips or breaks"],
    life: "Commonly 60,000 to 100,000 miles.", diff: "Beginner to Intermediate", diffNote: "A belt tool or long breaker bar helps release the tensioner.",
    tip: "Photograph the routing before you remove the old belt. If the tensioner or pulleys are noisy or weak, replace them too." }),
  P("Timing Belt", { maint: "timing",
    what: "The timing belt keeps the crankshaft and camshaft turning together. If your engine has a timing chain instead, there is no belt to replace.",
    signs: ["There is often no warning before a belt fails", "Ticking, misfires or oil leaking near the timing cover", "Mileage or age past the interval in your owner's manual"],
    life: "Commonly 60,000 to 105,000 miles or 7 to 10 years.", diff: "Advanced", diffNote: "The job is precise and mistakes can damage the engine.",
    tip: "Confirm in your owner's manual that your engine has a belt, not a chain. Buy a kit with tensioner and idlers, and consider the water pump. On some engines a broken belt can cause severe damage." }),
  P("Electric Fuel Pump", {
    what: "The fuel pump sends fuel from the tank to the engine at the right pressure.",
    signs: ["The engine cranks but will not start", "Sputtering or power loss under load", "A whining noise from the fuel tank"],
    life: "Often 100,000 miles or more.", diff: "Advanced", diffNote: "Usually reached through the tank or under the rear seat, with fuel pressure to release first.",
    tip: "Many cars use a complete pump module. Work with a low tank, no sparks, and good ventilation. Check the fuse and relay first." }),
  P("Fuel Filter", { maint: "fuel-filter",
    what: "The fuel filter catches dirt before it reaches the injectors. Many modern cars have the filter inside the tank and no scheduled replacement.",
    signs: ["Hard starting or hesitation under load", "Stalling or a loss of power", "Mileage past the interval in your owner's manual"],
    life: "Varies a lot. Some cars have a lifetime filter; others call for replacement every 30,000 miles or so.", diff: "Intermediate", diffNote: "Fuel pressure must be released first.",
    tip: "Check whether your car has an in-line filter or one inside the tank. Use quick-connect release tools for the fuel lines." }),
  P("Fuel Injectors", {
    what: "Injectors spray fuel into the engine in a fine mist. Dirty or failing injectors cause rough running.",
    signs: ["Rough idle or misfires", "Worse fuel economy or a fuel smell", "Hard starting or a check-engine light"],
    life: "Often 100,000 miles or more.", diff: "Intermediate", diffNote: "Fuel pressure must be released and new seals fitted.",
    tip: "Replace the O-rings or seals with the injectors. Replacing them as a matched set is common." }),
  P("Engine Air Filter", { top: true, maint: "engine-air",
    what: "The engine air filter keeps dust and debris out of the engine as it breathes in air.",
    signs: ["Lower power or fuel economy", "A filter that looks dark or clogged", "Driving often on dusty or gravel roads"],
    life: "Often 15,000 to 30,000 miles.", diff: "Beginner", diffNote: "Usually held by clips; no tools in many cases.",
    tip: "Match the filter to your engine and year. A paper filter is the standard choice." }),
  P("Cabin Air Filter", { top: true, maint: "cabin-air",
    what: "The cabin air filter cleans the air that comes through the vents inside your {v}.",
    signs: ["Weak airflow from the vents", "A musty smell, or windows that fog easily", "More dust or allergy trouble in the car"],
    life: "Often 12,000 to 20,000 miles, or about once a year.", diff: "Beginner", diffNote: "Often behind the glovebox or under the hood cowl.",
    tip: "Check your car has a cabin filter, since some older ones do not. Activated-carbon versions cut odors." }),
  P("Oil Filter", { maint: "oil",
    what: "The oil filter removes dirt and metal particles from the engine oil as it circulates.",
    signs: ["It is replaced at every oil change rather than when it fails", "Low oil pressure or leaks around the filter", "A filter that has been on longer than one oil change"],
    life: "Replace at every oil change.", diff: "Beginner", diffNote: "An oil-filter wrench helps; some cars use a cartridge filter in a housing.",
    tip: "Match the filter to your engine, and use the oil grade and amount in your owner's manual. Lightly oil the new gasket before fitting." }),
  P("Throttle Body", {
    what: "The throttle body controls how much air enters the engine when you press the accelerator.",
    signs: ["Rough or unstable idle", "Hesitation or stalling", "A check-engine light"],
    life: "Often lasts the life of the vehicle but can get dirty.", diff: "Intermediate", diffNote: "Often a cleaning job first. Some cars need a relearn procedure afterward.",
    tip: "Try cleaning before replacing. Use a cleaner made for throttle bodies and a new gasket." }),
  P("Catalytic Converter", {
    what: "The catalytic converter reduces harmful emissions in the exhaust.",
    signs: ["A check-engine light with codes such as P0420 or P0430", "A rattling sound, a sulfur smell, or a failed emissions test", "Loss of power"],
    life: "Often 100,000 miles or more and can last the life of the vehicle.", diff: "Advanced", diffNote: "Bolts and pipes are often rusted, and fitment is exact.",
    tip: "Emissions rules differ by state, and some states require a specific type. Fix the cause of the failure, such as misfires or burning oil, or the new one can fail too." }),
  P("Upstream Oxygen Sensor", {
    what: "The upstream oxygen sensor measures the exhaust ahead of the catalytic converter so the computer can balance the air and fuel mixture.",
    signs: ["A check-engine light", "Worse fuel economy or a rough idle", "A failed emissions test"],
    life: "Often 60,000 to 100,000 miles.", diff: "Intermediate", diffNote: "An oxygen sensor socket helps; sensors often stick in the exhaust.",
    tip: "Check the code to find which sensor and bank are at fault. Upstream means before the catalytic converter." }),
  P("Mass Air Flow Sensor", {
    what: "The mass air flow sensor tells the engine computer how much air is entering the engine.",
    signs: ["Hesitation or stalling", "Worse fuel economy or black smoke", "A check-engine light"],
    life: "Often 100,000 miles or more.", diff: "Beginner", diffNote: "Usually a couple of screws and a connector.",
    tip: "Cleaning it with MAF sensor cleaner sometimes fixes the problem. Do not touch the sensing wire." }),
  P("Crankshaft Position Sensor", {
    what: "This sensor tells the engine computer the crankshaft's position and speed so it can time the spark and fuel.",
    signs: ["The engine cranks but will not start, or stalls when warm", "Rough running, or an erratic tachometer", "A check-engine light"],
    life: "Often 100,000 miles or more.", diff: "Intermediate", diffNote: "Access depends on the engine; it may be low or behind the starter.",
    tip: "Use a quality sensor; cheap ones are a common cause of repeat failures." }),
  P("Outer Tie Rod End", {
    what: "Outer tie rod ends connect the steering rack to the wheels so they turn when you turn the steering wheel.",
    signs: ["A clunk or loose feel in the steering", "Uneven wear on the inside or outside edge of a tire", "The car wandering or the steering wheel off-center"],
    life: "Often 70,000 to 100,000 miles or more.", diff: "Intermediate", diffNote: "A wheel alignment is needed afterward.",
    tip: "Count the turns or mark the old tie rod's position to get close to the old alignment, then get an alignment. Replace in pairs if both are worn." }),
  P("Lower Ball Joint", {
    what: "Ball joints let the wheel move up and down and steer. A worn ball joint can fail and is a safety issue.",
    signs: ["Clunking over bumps", "Wandering steering or uneven tire wear", "Visible play when the wheel is lifted and rocked"],
    life: "Often 70,000 to 150,000 miles.", diff: "Advanced", diffNote: "Often needs a ball joint press, and an alignment afterward.",
    tip: "Some cars use a joint that is part of the control arm, so the whole arm is replaced. Check which type yours is." }),
  P("Lower Control Arm", {
    what: "The control arm links the wheel to the car's body and holds its position as it moves through the suspension.",
    signs: ["Clunking or knocking over bumps", "Vibration, or the car pulling to one side", "Cracked or torn bushings you can see"],
    life: "Often 100,000 miles or more.", diff: "Intermediate to Advanced", diffNote: "An alignment is needed afterward.",
    tip: "Many control arms come with the ball joint and bushings already fitted, which saves a lot of work." }),
  P("Struts", {
    what: "Struts support the car's weight and control how the springs move. They are part of both the ride and the steering.",
    signs: ["A bouncy or floaty ride", "Nose-dive when braking", "Fluid leaking down the strut, or scalloped tire wear"],
    life: "Often 50,000 to 100,000 miles.", diff: "Advanced", diffNote: "Springs under tension; a spring compressor is risky. A complete assembly avoids that.",
    tip: "Replace struts in pairs, both fronts or both rears. A complete strut assembly includes the spring and mount and is far easier to fit. Get an alignment afterward." }),
  P("Shocks", {
    what: "Shocks damp the movement of the suspension so the car stays controlled over bumps.",
    signs: ["A bouncy ride or poor control", "Fluid leaking from the shock body", "Uneven tire wear"],
    life: "Often 50,000 to 100,000 miles.", diff: "Intermediate", diffNote: "Often a simple bolt-on job at the rear.",
    tip: "Replace in pairs. Check whether your vehicle uses shocks, struts or both at each end." }),
  P("Wheel Bearing", {
    what: "Wheel bearings let the wheels spin freely with very little friction.",
    signs: ["A humming or growling noise that changes when you turn", "A rumble that rises with speed", "Play in the wheel when it is rocked by hand"],
    life: "Often 85,000 to 150,000 miles.", diff: "Intermediate to Advanced", diffNote: "Some are pressed in and need a shop press; others come as a bolt-on hub.",
    tip: "Many cars use a complete hub assembly with the bearing built in. Replace on the side that is failing, and check the other side." }),
  P("Wheel Hub Assembly", {
    what: "The hub assembly holds the wheel and includes the bearing on many cars. It also carries the ABS wheel speed sensor on many designs.",
    signs: ["Humming or grinding that changes with speed or turning", "Looseness in the wheel", "An ABS light"],
    life: "Often 85,000 to 150,000 miles.", diff: "Intermediate", diffNote: "A large axle nut and a sturdy breaker bar are needed.",
    tip: "Check whether your car needs the version with or without the ABS sensor, and replace the axle nut if it is a one-use type." }),
  P("Sway Bar Link", {
    what: "Sway bar links connect the sway bar to the suspension, which reduces body roll in turns.",
    signs: ["Rattling or clunking over bumps", "A loose or noisy feel at low speed", "More body lean in corners"],
    life: "Often 50,000 to 100,000 miles.", diff: "Beginner to Intermediate", diffNote: "Often two nuts; the stud may need to be held with a hex key.",
    tip: "Replace in pairs. They are a common cause of suspension rattles." }),
  P("CV Axle Shaft", {
    what: "The CV axle carries power from the transmission to the wheel while allowing the wheel to move and steer.",
    signs: ["Clicking when turning", "Grease flung around the inside of the wheel from a torn boot", "A vibration when accelerating"],
    life: "Often 100,000 miles or more, but a torn boot shortens it.", diff: "Intermediate", diffNote: "Axle nut, sometimes a ball joint to separate.",
    tip: "A complete axle is usually easier than replacing the boot. Match the left or right side and the transmission type." }),
  P("A/C Compressor", {
    what: "The A/C compressor circulates refrigerant to cool the air in your {v}.",
    signs: ["A/C blows warm air", "Loud noises, or the clutch does not engage", "Visible refrigerant oil leaks"],
    life: "Often 100,000 miles or more.", diff: "Advanced", diffNote: "The system must be recovered, evacuated and recharged, which needs special equipment.",
    tip: "Replace the receiver-drier or accumulator at the same time. Damage from a failed compressor often needs the system flushed. Many people have a shop handle the refrigerant." }),
  P("A/C Condenser", {
    what: "The condenser sits at the front of the car and releases heat from the A/C system.",
    signs: ["Weak cooling, especially at idle", "Visible damage from road debris", "Oily residue on the condenser or lines"],
    life: "Often 100,000 miles or more.", diff: "Advanced", diffNote: "The refrigerant must be recovered and recharged.",
    tip: "Replace the drier at the same time. Check for road-debris damage to the radiator too." }),
  P("Blower Motor", {
    what: "The blower motor pushes air through the vents for heating and cooling.",
    signs: ["No airflow, or airflow on only some fan speeds (the resistor may be at fault)", "Squealing or rattling from behind the dash", "Weak airflow even with a new cabin filter"],
    life: "Often 100,000 miles or more.", diff: "Beginner to Intermediate", diffNote: "Often under the dash on the passenger side.",
    tip: "If the fan works only on high, the blower resistor is the more likely cause. Check it before replacing the motor." }),
  P("Headlight Bulb", {
    what: "The headlight bulbs light the road ahead of your {v}. Bulb type and size depend on the year and trim.",
    signs: ["A bulb that is out or dimmer than the other side", "Lighting that looks yellow or uneven", "A dash warning for a bulb failure"],
    life: "Halogen bulbs often last 500 to 1,000 hours of use.", diff: "Beginner", diffNote: "Usually reached from under the hood; some cars need the bumper cover or wheel liner moved.",
    tip: "Check the bulb type in your owner's manual or on the old bulb, since it varies by year and trim. Replace in pairs, and avoid touching a halogen bulb's glass." }),
  P("Headlight Assembly", {
    what: "The headlight assembly includes the housing, lens and reflector or projector around the bulb.",
    signs: ["Cloudy or yellowed lens that cuts light output", "Cracks, or water inside the housing", "Broken mounting tabs"],
    life: "Often 10 years or more, but lenses fade from sun and weather.", diff: "Intermediate", diffNote: "Often needs the bumper cover or grille removed.",
    tip: "A restoration kit can fix a hazy lens. If you replace the assembly, check the version for your trim, and get the aim adjusted." }),
  P("Tail Light Assembly", {
    what: "The tail light assembly holds the brake lights, tail lights and turn signals at the rear.",
    signs: ["A cracked lens", "Moisture inside the housing", "Bulbs that keep failing, which can point to a bad socket"],
    life: "Often 10 years or more.", diff: "Beginner", diffNote: "Usually held by a few screws or nuts inside the trunk.",
    tip: "Check the left or right side and whether your trim has LED or bulb lights." }),
  P("Wiper Blades", { top: true, maint: "wipers",
    what: "Wiper blades clear rain, snow and spray from the windshield of your {v}.",
    signs: ["Streaking, smearing or chattering", "Squeaking, or unwiped areas", "Cracked, split or hardened rubber"],
    life: "Often 6 to 12 months.", diff: "Beginner", diffNote: "Most blades clip on without tools.",
    tip: "The driver and passenger blades are often different lengths. Check the sizes, and look at the rear blade separately." }),
  P("TPMS Sensor", {
    what: "TPMS sensors report each tire's pressure to the dash. Each has a small battery that eventually runs out.",
    signs: ["The tire pressure light stays on after the pressures are corrected", "One tire's reading is missing", "A sensor that is 5 to 10 years old"],
    life: "Often 5 to 10 years, since the battery is sealed in.", diff: "Intermediate", diffNote: "A tire shop must remove the tire and program the sensor.",
    tip: "Buy a sensor that matches your car's frequency (usually 315 or 433 MHz) and programming method." }),
  P("Engine Mount", {
    what: "Engine mounts hold the engine in place and absorb its vibration so it is not felt in the cabin.",
    signs: ["More vibration at idle or in gear", "A clunk when accelerating or shifting", "Visible engine movement, or cracked or collapsed rubber"],
    life: "Often 100,000 miles or more.", diff: "Intermediate", diffNote: "The engine has to be supported while the mount is removed.",
    tip: "Check all of the mounts, including the transmission mount, since one failed mount often means others are worn too." }),
  P("Valve Cover Gasket", {
    what: "The valve cover gasket seals the top of the engine so oil stays inside.",
    signs: ["Oil seeping around the top of the engine", "A burning oil smell", "Oil in the spark plug wells"],
    life: "Often 100,000 miles or more; rubber hardens with heat.", diff: "Intermediate", diffNote: "Parts on top of the engine may need to come off.",
    tip: "Buy the gasket with new spark plug tube seals and bolt grommets if your engine uses them. Tighten bolts to the specified torque." }),
  P("Head Gasket", {
    what: "The head gasket seals the cylinder head to the engine block, keeping coolant, oil and combustion pressure apart.",
    signs: ["White smoke from the exhaust, or coolant loss with no visible leak", "Milky oil, or bubbles in the coolant", "Overheating"],
    life: "Often lasts the life of the engine unless the engine overheats.", diff: "Advanced", diffNote: "A major engine repair that needs careful measuring and torque steps.",
    tip: "Have the cylinder head checked for flatness. Use new head bolts if your engine uses one-use bolts, and fix the cause of the overheating first." }),
];

const BY_PART = new Map(CORE_PARTS.map((p) => [p.slug, p]));
export const partFromSlug = (s) => BY_PART.get(String(s || "")) || null;

// Where each core part lives in the catalog (group and subcategory names).
export function locate(part) {
  for (const g of CATALOG) for (const s of g.subs) for (const it of s.items) {
    if (it.label === part.label) return { group: g.label, sub: s.label, terms: it.terms };
  }
  return null;
}

export function groupedParts() {
  const map = new Map();
  for (const p of CORE_PARTS) {
    const loc = locate(p);
    const g = loc ? loc.group : "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(p);
  }
  return [...map.entries()];
}
