/* ============================================================
   PARTS CATALOG
   group > subcategory > part type.
   Items are written as one string per subcategory: "Label; Label|search terms; ..."
   (search terms default to the label). Flags on a group or subcategory:
     noEv        hide for fully electric vehicles
     noDiesel    hide for diesel vehicles
     diesel      show only for diesel (or when the engine type isn't known)
     awd         show only for AWD / 4WD (or when the drivetrain isn't known)
     electrified show only for electric and hybrid vehicles
   ============================================================ */

const G = (label, icon, flags, subs) => ({ label, icon, flags: flags || {}, subs });
const S = (label, icon, flags, items) => ({ label, icon, flags: flags || {}, items });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const RAW = [
  G("Engine", "engine", { noEv: true }, [
    S("Pistons & Rings", "engine", null, "Pistons; Piston Rings; Piston Pins & Clips|piston pin clips; Connecting Rods; Rod Bearings; Piston & Ring Set|piston ring set"),
    S("Crankshaft & Bearings", "engine", null, "Crankshaft; Main Bearings; Front Main Seal|front crankshaft seal; Rear Main Seal; Harmonic Balancer; Crankshaft Pulley; Flywheel; Flexplate; Thrust Washers|crankshaft thrust washers; Crankshaft Bolt"),
    S("Camshaft & Valvetrain", "engine", null, "Camshaft; Camshaft Bearings; Lifters & Tappets|hydraulic lifters; Pushrods; Rocker Arms; Rocker Arm Shaft; Intake Valves; Exhaust Valves; Valve Springs; Valve Spring Retainers; Valve Guides; Valve Stem Seals; Lash Adjusters; VVT Solenoid|variable valve timing solenoid; VVT Cam Phaser|cam phaser"),
    S("Timing Components", "engine", null, "Timing Chain Kit; Timing Chain; Timing Chain Tensioner; Timing Chain Guides; Timing Cover; Timing Cover Gasket; Timing Belt Kit; Timing Belt; Timing Belt Tensioner; Timing Belt Idler Pulley|timing belt idler; Timing Gears; Timing Belt Cover"),
    S("Cylinder Head & Block", "engine", null, "Cylinder Head; Cylinder Head Bolts; Head Gasket; Head Gasket Set; Engine Block; Freeze Plugs|engine freeze plug; Valve Cover; Valve Cover Gasket; Valve Cover Bolts; Oil Pan; Oil Pan Gasket; Engine Rebuild Kit; Short Block; Long Block; Complete Engine|engine assembly; Remanufactured Engine"),
    S("Gaskets & Seals", "engine", null, "Full Engine Gasket Set; Intake Manifold Gasket; Exhaust Manifold Gasket; Water Pump Gasket; Thermostat Gasket; Camshaft Seal; Crankshaft Seal; Oil Pump Gasket; Throttle Body Gasket; Turbo Gasket Kit; EGR Gasket; Spark Plug Tube Seals; Valve Cover Grommets; Oil Filter Housing Gasket"),
    S("Oil System", "drop", null, "Oil Pump; Oil Pump Pickup Tube; Oil Pan Drain Plug; Oil Drain Plug Gasket; Oil Cooler; Oil Cooler Lines; Oil Filter Housing; Oil Pressure Sensor; Oil Pressure Switch; Oil Dipstick; Dipstick Tube; Oil Filler Cap; PCV Valve; PCV Hose; Oil Separator|oil catch can"),
    S("Engine Mounts", "engine", null, "Engine Mount; Motor Mount Set; Transmission Mount; Torque Strut Mount|dog bone mount; Mount Bushings; Hydraulic Engine Mount"),
  ]),

  G("Ignition & Starting", "spark", { noEv: true }, [
    S("Spark Plugs & Wires", "spark", { noDiesel: true }, "Spark Plugs; Iridium Spark Plugs; Platinum Spark Plugs; Copper Spark Plugs; Spark Plug Wires; Spark Plug Wire Set; Spark Plug Boots; Spark Plug Gap Tool"),
    S("Coils & Modules", "spark", { noDiesel: true }, "Ignition Coils; Ignition Coil Pack; Coil-on-Plug Boots; Ignition Control Module; Ignition Switch; Ignition Lock Cylinder; Ignition Coil Connector"),
    S("Distributor Parts", "spark", { noDiesel: true }, "Distributor; Distributor Cap; Distributor Rotor; Ignition Pickup Coil; Distributor Gasket; Distributor Shaft Bushing; Ignition Condenser"),
    S("Starter & Solenoid", "battery", null, "Starter Motor; Starter Solenoid; Starter Relay; Starter Drive; Starter Bushings; Flywheel Ring Gear; Starter Mounting Bolts; Remanufactured Starter"),
    S("Glow Plugs & Diesel Starting", "spark", { diesel: true }, "Glow Plugs; Glow Plug Controller; Glow Plug Relay; Intake Air Heater"),
  ]),

  G("Fuel System", "fuel", { noEv: true }, [
    S("Fuel Pump & Sender", "fuel", null, "Electric Fuel Pump; Fuel Pump Module Assembly; Fuel Pump Relay; Fuel Level Sending Unit|fuel level sensor; Fuel Pump Strainer|fuel pump sock; Fuel Pump Driver Module; Mechanical Fuel Pump; High Pressure Fuel Pump; Fuel Pump Lock Ring"),
    S("Fuel Lines & Filters", "fuel", null, "Fuel Filter; Fuel Lines; Fuel Line Quick Connectors|fuel line fittings; Fuel Hose; Fuel Pressure Regulator; Fuel Rail; Fuel Pulse Damper; Fuel Line Clamps; Fuel Return Line"),
    S("Fuel Injectors", "fuel", null, "Fuel Injectors; Fuel Injector Set; Fuel Injector O-Rings; Fuel Injector Seals; Direct Injectors; Injector Connector; Cold Start Injector; Fuel Injector Harness"),
    S("Fuel Tank & Filler", "fuel", null, "Fuel Tank; Gas Cap; Fuel Filler Neck; Fuel Tank Straps; Fuel Door; Fuel Door Release; Fuel Tank Pressure Sensor; Fuel Tank Skid Plate"),
    S("Carburetor Parts", "fuel", null, "Carburetor; Carburetor Rebuild Kit; Carburetor Gasket Kit; Choke Thermostat; Carburetor Float; Carburetor Linkage; Fuel Bowl Gasket; Accelerator Pump"),
    S("Diesel Fuel System", "fuel", { diesel: true }, "Diesel Fuel Injectors; Lift Pump; Fuel Water Separator; High Pressure Fuel Pump Diesel|diesel high pressure fuel pump; Injector Return Lines; Fuel Heater; Diesel Fuel Filter"),
  ]),

  G("Air Intake & Turbo", "fan", { noEv: true }, [
    S("Air Filters & Housings", "filter", null, "Engine Air Filter; Air Filter Housing; Air Intake Hose; Air Intake Boot; Cold Air Intake; Air Box; Air Filter Housing Clips; Intake Resonator"),
    S("Intake Manifold & Throttle", "fan", null, "Intake Manifold; Intake Manifold Gasket; Throttle Body; Throttle Body Gasket; Idle Air Control Valve; Intake Runner Control Valve; Vacuum Hoses; Vacuum Line Fittings; Intake Plenum"),
    S("Turbo & Supercharger", "fan", null, "Turbocharger; Turbo Actuator; Turbo Wastegate; Turbo Oil Feed Line; Turbo Oil Return Line; Turbo Gasket Kit; Blow-Off Valve|bov; Turbo Boost Hose; Supercharger; Supercharger Belt; Boost Controller"),
    S("Intercooler & Piping", "radiator", null, "Intercooler; Intercooler Hose; Charge Pipe; Intercooler Clamps; Turbo Inlet Hose; Boost Pipe"),
  ]),

  G("Exhaust & Emissions", "exhaust", { noEv: true }, [
    S("Mufflers & Resonators", "exhaust", null, "Muffler; Resonator; Exhaust Tip; Cat-Back Exhaust System; Axle-Back Exhaust; Exhaust Tailpipe"),
    S("Pipes & Manifolds", "exhaust", null, "Exhaust Pipe; Flex Pipe; Y-Pipe|exhaust y pipe; Downpipe; Exhaust Manifold; Exhaust Header; Exhaust Manifold Studs; Exhaust Gaskets; Exhaust Hangers; Exhaust Clamps; Exhaust Heat Shield; Exhaust Pipe Seal"),
    S("Catalytic Converters", "exhaust", null, "Catalytic Converter; Direct-Fit Catalytic Converter; Universal Catalytic Converter; Catalytic Converter Gasket; Catalytic Converter Heat Shield; Catalytic Converter Shield"),
    S("Emissions Controls", "exhaust", null, "EGR Valve; EGR Cooler; EGR Tube; EGR Valve Gasket; EVAP Canister; EVAP Purge Valve; EVAP Vent Valve; EVAP Hose; Secondary Air Injection Pump; Air Pump Check Valve; Smog Pump"),
    S("Diesel Emissions", "exhaust", { diesel: true }, "Diesel Particulate Filter|dpf; DPF Pressure Sensor; DEF Pump; DEF Heater; DEF Injector|def doser; NOx Sensor; SCR Catalyst; EGT Sensor|exhaust gas temperature sensor"),
  ]),

  G("Cooling", "radiator", null, [
    S("Radiator & Cap", "radiator", null, "Radiator; Radiator Cap; Upper Radiator Hose; Lower Radiator Hose; Radiator Mounts; Radiator Drain Plug; Radiator Overflow Hose; Aluminum Radiator"),
    S("Water Pump & Thermostat", "radiator", null, "Water Pump; Water Pump Gasket; Water Pump Pulley; Thermostat; Thermostat Housing; Thermostat Gasket; Water Outlet|coolant water outlet; Coolant Crossover Pipe; Electric Water Pump"),
    S("Fans & Clutches", "fan", null, "Radiator Fan Assembly; Cooling Fan Motor; Fan Clutch; Fan Shroud; Auxiliary Cooling Fan; Fan Relay; Fan Resistor; Fan Blade"),
    S("Hoses & Reservoir", "radiator", null, "Coolant Hose; Heater Hose; Coolant Reservoir Tank; Coolant Reservoir Cap; Coolant Level Sensor; Hose Clamps; Coolant Temperature Sensor; Coolant Bleeder Valve; Coolant Pipe"),
    S("Heater Core & Valves", "radiator", null, "Heater Core; Heater Control Valve; Heater Hose Fittings; Heater Core Gasket; Auxiliary Water Pump"),
    S("Oil & Transmission Coolers", "radiator", null, "Engine Oil Cooler; Transmission Cooler; Transmission Cooler Lines; Power Steering Cooler; Oil Cooler Adapter"),
  ]),

  G("Belts & Pulleys", "belt", { noEv: true }, [
    S("Belts", "belt", null, "Serpentine Belt; V-Belt; Belt Tensioner; Idler Pulley; Tensioner Pulley; Belt Drive Kit; Serpentine Belt Kit"),
    S("Pulleys & Dampers", "belt", null, "Crankshaft Pulley; Harmonic Damper; Alternator Pulley|alternator decoupler pulley; Power Steering Pulley; Water Pump Pulley; A/C Compressor Clutch Pulley|ac compressor pulley; Idler Pulley Bearing"),
    S("Timing Belts", "belt", null, "Timing Belt; Timing Belt Kit; Timing Belt Tensioner; Water Pump & Timing Belt Kit|timing belt water pump kit; Timing Belt Idler; Timing Belt Cover"),
  ]),

  G("Brakes", "brake", null, [
    S("Pads & Shoes", "brake", null, "Front Brake Pads; Rear Brake Pads; Ceramic Brake Pads; Semi-Metallic Brake Pads; Brake Shoes; Brake Hardware Kit; Brake Pad Wear Sensor; Brake Pad Shims; Brake Pad Set"),
    S("Rotors & Drums", "brake", null, "Front Brake Rotors; Rear Brake Rotors; Slotted & Drilled Rotors|drilled slotted rotors; Brake Drums; Rotor & Pad Kit|brake pad and rotor kit; Rotor Retaining Clips; Brake Dust Shield; Brake Rotor Set"),
    S("Calipers & Hardware", "brake", null, "Front Brake Caliper; Rear Brake Caliper; Caliper Bracket; Caliper Slide Pins; Caliper Rebuild Kit; Caliper Piston; Caliper Bolts; Loaded Calipers|brake caliper with pads"),
    S("Hydraulics & Boosters", "brake", null, "Brake Master Cylinder; Brake Booster; Brake Booster Check Valve; Wheel Cylinder; Brake Proportioning Valve; Brake Line; Front Brake Hose; Rear Brake Hose; Brake Line Kit; Brake Fluid Reservoir; Brake Bleeder Screw"),
    S("Parking Brake", "brake", null, "Parking Brake Cable; Parking Brake Shoes; Parking Brake Actuator|electric parking brake actuator; Parking Brake Lever; Parking Brake Switch; Parking Brake Hardware Kit"),
    S("ABS Components", "brake", null, "ABS Wheel Speed Sensor; ABS Module; ABS Pump; Tone Ring|abs reluctor ring; ABS Hydraulic Unit; ABS Sensor Harness"),
  ]),

  G("Steering", "steering", null, [
    S("Linkage", "steering", null, "Outer Tie Rod End; Inner Tie Rod; Tie Rod Assembly; Tie Rod Sleeve; Drag Link; Center Link; Pitman Arm; Idler Arm; Steering Damper; Relay Rod; Tie Rod Boot"),
    S("Rack & Pinion", "steering", null, "Rack and Pinion; Rack Boots|rack and pinion bellows; Rack Mount Bushings; Power Steering Rack Hoses; Electric Power Steering Rack|eps rack; Rack End"),
    S("Steering Gearbox", "steering", null, "Steering Gearbox; Sector Shaft Seal; Steering Box Mount; Steering Box Rebuild Kit"),
    S("Power Steering", "steering", null, "Power Steering Pump; Power Steering Pressure Hose; Power Steering Return Hose; Power Steering Reservoir; Power Steering Pulley; Power Steering Pump Reservoir Cap; Power Steering Pump Seal Kit"),
    S("Column & Wheel", "steering", null, "Steering Column; Intermediate Steering Shaft; Steering Wheel; Clockspring|steering wheel clock spring; Steering Angle Sensor; Tilt Lever; Steering Column Lock; Steering Coupler|steering rag joint"),
  ]),

  G("Suspension", "strut", null, [
    S("Shocks & Struts", "strut", null, "Struts; Complete Strut Assembly; Shocks; Strut Mounts; Strut Bearings; Strut Boots & Bump Stops|strut bellow bump stop; Coilovers; Shock Mounts; Shock Bushings"),
    S("Springs", "strut", null, "Coil Springs; Leaf Springs; Spring Seats; Helper Springs; Torsion Bars; Leaf Spring Bushings; Spring Shackles; Leaf Spring Hangers; Lowering Springs"),
    S("Control Arms & Joints", "strut", null, "Control Arm; Lower Control Arm; Upper Control Arm; Control Arm Bushings; Upper Ball Joint; Lower Ball Joint; Trailing Arm; Track Bar; Lateral Link; Camber Kit; Alignment Shims; Toe Link; Radius Arm"),
    S("Sway Bars", "strut", null, "Sway Bar; Sway Bar Link; Sway Bar Bushings; Sway Bar End Links; Sway Bar Bracket"),
    S("Wheel Bearings & Hubs", "tire", null, "Wheel Bearing; Wheel Hub Assembly; Wheel Bearing Seal; Hub Bearing Kit; Steering Knuckle; Spindle; Axle Nut; Wheel Hub Dust Cap"),
    S("Air Suspension", "strut", null, "Air Spring|air suspension bag; Air Strut; Air Suspension Compressor; Air Suspension Valve Block; Air Suspension Lines; Ride Height Sensor"),
  ]),

  G("Drivetrain & Axles", "gear", null, [
    S("CV Axles & Joints", "gear", null, "CV Axle Shaft; CV Joint; CV Boot Kit; Axle Seal; Intermediate Shaft; Half Shaft; CV Joint Grease; CV Axle Nut"),
    S("Driveshaft", "gear", null, "Driveshaft; U-Joint|universal joint; Center Support Bearing; Driveshaft Flex Disc; Slip Yoke; Driveshaft Balancer"),
    S("Differential & Rear Axle", "gear", null, "Differential; Ring & Pinion Gear Set; Differential Bearings; Differential Cover Gasket; Rear Axle Shaft; Axle Bearing; Pinion Seal; Differential Cover; Limited Slip Clutch Pack"),
    S("4WD & Transfer Case", "gear", { awd: true }, "Transfer Case; Transfer Case Motor|transfer case shift motor; Transfer Case Chain; Transfer Case Seal; Front Axle Disconnect; Locking Hubs; Hub Actuator; 4WD Selector Switch; 4WD Actuator; Transfer Case Mount"),
  ]),

  G("Transmission & Clutch", "gear", { noEv: true }, [
    S("Clutch", "gear", null, "Clutch Kit; Clutch Disc; Pressure Plate; Throw-Out Bearing|clutch release bearing; Pilot Bearing; Clutch Master Cylinder; Clutch Slave Cylinder; Clutch Line; Clutch Fork; Dual Mass Flywheel; Clutch Pedal"),
    S("Automatic Transmission", "gear", null, "Transmission Filter Kit; Transmission Pan Gasket; Transmission Pan; Torque Converter; Shift Solenoid; Transmission Solenoid Kit; Valve Body; Transmission Speed Sensor; Transmission Range Sensor|neutral safety switch; Transmission Rebuild Kit; Transmission Control Module"),
    S("Manual Transmission", "gear", null, "Shift Linkage; Shift Cable; Shifter Bushings; Synchronizer; Input Shaft Seal; Output Shaft Seal; Manual Transmission; Reverse Light Switch; Shifter Assembly"),
    S("Mounts & Seals", "gear", null, "Transmission Mount; Transmission Crossmember; Axle Seals; Transmission Dipstick Tube; Transmission Fill Plug; Transmission Drain Plug; Transmission Output Seal"),
  ]),

  G("Electrical & Charging", "battery", null, [
    S("Battery & Cables", "battery", null, "Car Battery; AGM Battery; Battery Cable; Battery Terminal; Battery Tray; Battery Hold-Down; Battery Disconnect Switch; Battery Terminal Cleaner"),
    S("Alternator & Charging", "battery", { noEv: true }, "Alternator; Alternator Pulley; Voltage Regulator; Alternator Bearing; Alternator Brushes; Alternator Rectifier; Remanufactured Alternator"),
    S("Fuses, Relays & Switches", "battery", null, "Fuses; Relays; Fuse Box|power distribution center; Flasher Relay; Window Switch; Door Lock Switch; Headlight Switch; Turn Signal Switch; Hazard Switch; Cruise Control Switch; Brake Light Switch; Clutch Switch"),
    S("Motors & Actuators", "battery", null, "Window Motor; Window Regulator; Door Lock Actuator; Blower Motor; Wiper Motor; Power Mirror Motor; Trunk Latch Actuator; Sunroof Motor; Throttle Actuator"),
    S("Wiring & Connectors", "battery", null, "Wiring Harness; Connectors & Pigtails|wiring pigtail connector; Wire Loom; Terminals; Relay Sockets; Ground Strap; Ground Wire; Heat Shrink Connectors"),
    S("Horn & Accessories", "battery", null, "Horn; Cigarette Lighter Socket; USB Charger Port; Backup Camera; Remote Starter; Key Fob; Key Fob Battery; Car Alarm; Keyless Entry Remote"),
  ]),

  G("Sensors & Modules", "sensor", null, [
    S("Oxygen Sensors", "sensor", { noEv: true }, "Upstream Oxygen Sensor; Downstream Oxygen Sensor; Air Fuel Ratio Sensor; O2 Sensor Socket; O2 Sensor Spacer"),
    S("Air & Fuel Sensors", "sensor", { noEv: true }, "Mass Air Flow Sensor; MAP Sensor; Intake Air Temperature Sensor; Fuel Pressure Sensor; Throttle Position Sensor; Accelerator Pedal Position Sensor; Barometric Pressure Sensor"),
    S("Engine Position & Knock", "sensor", { noEv: true }, "Crankshaft Position Sensor; Camshaft Position Sensor; Knock Sensor; Distributor Pickup Sensor; Cam Sensor Connector"),
    S("Temperature & Pressure", "sensor", null, "Coolant Temperature Sensor; Oil Temperature Sensor; Transmission Temperature Sensor; Ambient Air Temperature Sensor; Evaporator Temperature Sensor; A/C Pressure Sensor"),
    S("Chassis & Safety Sensors", "sensor", null, "Wheel Speed Sensor; TPMS Sensor; Steering Angle Sensor; Yaw Rate Sensor; Parking Sensors; Blind Spot Sensor; Rain Sensor; Airbag Sensor; Seat Occupancy Sensor"),
    S("ECU & Control Modules", "sensor", null, "Engine Control Module|ecm pcm; Body Control Module; Transmission Control Module; Airbag Control Module; Instrument Cluster; Fuel Pump Control Module; HVAC Control Module; ABS Control Module"),
  ]),

  G("Heating & A/C", "snow", null, [
    S("Compressor & Clutch", "snow", null, "A/C Compressor; A/C Compressor Clutch; Compressor Clutch Coil; A/C Compressor Relay; Compressor Mounting Bracket; A/C Compressor Seal Kit"),
    S("Condenser & Evaporator", "snow", null, "A/C Condenser; A/C Evaporator Core; A/C Condenser Fan; Evaporator Drain Hose; Condenser Mounting Hardware"),
    S("Lines & Valves", "snow", null, "A/C Hose; A/C Line Assembly; Accumulator|receiver drier; Expansion Valve|txv; Orifice Tube; A/C Pressure Switch; A/C Service Port Caps; A/C O-Ring Kit"),
    S("Blower & Controls", "snow", null, "Blower Motor; Blower Motor Resistor; HVAC Control Panel; Blend Door Actuator; Mode Door Actuator; HVAC Control Knob; Blower Motor Wheel|blower fan"),
    S("Refrigerant & Supplies", "snow", null, "R134a Refrigerant; R1234yf Refrigerant; A/C Compressor Oil|pag oil; UV Leak Detection Dye; A/C Manifold Gauge Set; A/C Recharge Kit; A/C Vacuum Pump"),
  ]),

  G("Lighting", "light", null, [
    S("Headlights", "light", null, "Headlight Assembly; Headlight Bulb; LED Headlight Bulbs; HID Headlight Bulbs; Headlight Ballast; Headlight Restoration Kit; Headlight Housing; Headlight Adjuster; Projector Headlights"),
    S("Tail & Brake Lights", "light", null, "Tail Light Assembly; Tail Light Bulb; Third Brake Light; Brake Light Bulb; Tail Light Gasket; Reverse Light; Tail Light Socket"),
    S("Fog & Driving Lights", "light", null, "Fog Light Assembly; Fog Light Bulb; Fog Light Switch; Driving Lights; LED Light Bar; Work Light; Fog Light Cover"),
    S("Turn Signal & Markers", "light", null, "Turn Signal Bulb; Turn Signal Lens; Side Marker Light; Hazard Flasher; Turn Signal Flasher Relay; Corner Light; Mirror Turn Signal"),
    S("Interior & Plate Lights", "light", null, "Dome Light Bulb; License Plate Light; Map Light; Courtesy Light; Glove Box Light; Dash Illumination Bulb; Trunk Light"),
    S("Bulbs & Sockets", "light", null, "LED Bulb Kit; Halogen Bulb Set; HID Conversion Kit; Bulb Socket; Bulb Pigtail|bulb wiring harness; Bulb Assortment Kit"),
  ]),

  G("Body & Exterior", "door", null, [
    S("Bumpers", "door", null, "Front Bumper Cover; Rear Bumper Cover; Bumper Reinforcement; Bumper Absorber; Bumper Bracket; Bumper Grille; Tow Hook Cover; Bumper Step Pad"),
    S("Hood & Fenders", "door", null, "Hood; Hood Hinge; Hood Strut|hood lift support; Hood Latch; Hood Release Cable; Hood Insulation Pad; Fender; Fender Liner|splash shield; Fender Flares"),
    S("Doors & Handles", "door", null, "Exterior Door Handle; Interior Door Handle; Door Hinge; Door Check Strap; Door Latch; Door Panel; Door Skin; Door Weatherstrip; Door Lock Cylinder"),
    S("Grilles & Trim", "door", null, "Grille; Grille Emblem; Molding & Trim|body molding trim; Window Trim; Body Side Molding; Rocker Panel; Mud Flaps; Rear Spoiler; Emblems & Badges"),
    S("Mirrors & Glass", "mirror", null, "Side Mirror; Mirror Glass; Mirror Cover; Rear View Mirror; Windshield; Door Glass; Rear Window Glass; Quarter Glass; Window Regulator"),
    S("Tailgate & Trunk", "door", null, "Trunk Lid; Tailgate; Liftgate Strut|liftgate lift support; Tailgate Handle; Trunk Latch; Trunk Hinge; Trunk Seal; Tailgate Lock; Tailgate Hinge"),
    S("Weatherstripping & Seals", "door", null, "Door Seal; Window Seal; Window Run Channel; Sunroof Seal; Hood Seal; Windshield Molding"),
    S("Wipers & Washers", "wiper", null, "Wiper Blades; Rear Wiper Blade; Wiper Arm; Wiper Motor; Wiper Linkage; Washer Pump; Washer Reservoir; Washer Nozzles; Washer Hose"),
  ]),

  G("Interior", "seat", null, [
    S("Seats & Belts", "seat", null, "Seat Covers; Seat Cushion; Seat Frame; Seat Heater; Seat Track; Seat Motor; Seat Belt; Seat Belt Buckle; Headrest"),
    S("Floor & Cargo", "seat", null, "Floor Mats; All-Weather Floor Liners; Interior Carpet; Cargo Liner; Cargo Mat; Trunk Mat; Sound Deadening Mat"),
    S("Dash & Console", "seat", null, "Dashboard Cover; Center Console; Console Lid; Cup Holder; Glove Box; Air Vent; Dash Trim; Radio Bezel; Dash Pad"),
    S("Steering Wheel & Pedals", "steering", null, "Steering Wheel Cover; Shift Knob; Shift Boot; Pedal Covers; Gauge Pod; Horn Button; Brake Pedal Pad"),
    S("Door Panels & Trim", "seat", null, "Door Panel; Door Pull Handle; Door Speaker; Door Trim Clips; Window Switch Panel; Door Armrest"),
    S("Headliner & Visors", "seat", null, "Headliner; Sun Visor; Visor Clip; Dome Light; Overhead Console; Grab Handle; Headliner Adhesive"),
    S("Audio & Electronics", "seat", null, "Head Unit|car stereo; Speakers; Subwoofer; Dash Cam; Phone Mount; Antenna; Amplifier; Wiring Harness for Stereo"),
  ]),

  G("Wheels & Tires", "tire", null, [
    S("Tires", "tire", null, "All-Season Tires; Winter Tires; All-Terrain Tires; Summer Tires; Spare Tire; Tire Chains; Tire Sealant"),
    S("Wheels", "tire", null, "Alloy Wheels; Steel Wheels; Wheel Center Caps; Wheel Spacers; Wheel Adapters; Wheel Locks; Wheel Weights"),
    S("Lugs & Hardware", "tire", null, "Lug Nuts; Wheel Studs; Wheel Bolts; Hub Centric Rings; Valve Stems; TPMS Service Kit; Lug Nut Key"),
    S("Tire Tools", "tool", null, "Tire Pressure Gauge; Tire Inflator; Tire Plug Kit; Lug Wrench; Valve Stem Tool; Tire Repair Kit"),
  ]),

  G("Fluids & Chemicals", "drop", null, [
    S("Engine Oil", "drop", null, "Conventional Motor Oil; Full Synthetic Motor Oil; Synthetic Blend Motor Oil; High Mileage Motor Oil; Diesel Engine Oil; Oil Additive; Oil Drain Pan"),
    S("Transmission & Gear Oil", "drop", null, "Automatic Transmission Fluid; CVT Fluid; Dual-Clutch Transmission Fluid; Manual Transmission Fluid; Gear Oil 75W-90|75w90 gear oil; Transfer Case Fluid; Differential Fluid; Limited Slip Additive"),
    S("Coolant & Brake Fluid", "drop", null, "Antifreeze Coolant; Coolant Flush; DOT 3 Brake Fluid; DOT 4 Brake Fluid; Power Steering Fluid; Radiator Stop Leak; Coolant Test Strips"),
    S("Cleaners & Additives", "drop", null, "Fuel Injector Cleaner; Fuel Stabilizer; Octane Booster; Brake Cleaner; Carb Cleaner; Throttle Body Cleaner; Engine Degreaser; MAF Sensor Cleaner; Engine Flush; Stop Leak"),
    S("Lubricants & Sealants", "drop", null, "Multipurpose Grease; Dielectric Grease; Anti-Seize; Silicone Spray; Penetrating Oil; Thread Locker; RTV Gasket Maker; Gasket Sealant; Wheel Bearing Grease; Brake Caliper Grease"),
    S("Washer & Detailing", "drop", null, "Windshield Washer Fluid; Glass Cleaner; Car Wax & Polish; Car Wash Soap; Touch-Up Paint; Rust Converter; Undercoating"),
  ]),

  G("Maintenance", "filter", null, [
    S("Filters", "filter", null, "Oil Filter; Engine Air Filter; Cabin Air Filter; Fuel Filter; Transmission Filter; Hydraulic Filter|power steering filter"),
    S("Tune-Up & Service Kits", "filter", null, "Tune-Up Kit; Oil Change Kit; Brake Service Kit; Cooling System Service Kit; Transmission Service Kit; Timing Belt Service Kit"),
  ]),

  G("Tools & Garage", "tool", null, [
    S("Diagnostic Tools", "tool", null, "OBD2 Code Reader; OBD2 Bluetooth Scanner; Multimeter; Test Light; Compression Tester; Leak-Down Tester; Fuel Pressure Gauge; Vacuum Gauge; Smoke Machine|evap smoke leak detector; Cooling System Pressure Tester; Battery Load Tester; Timing Light"),
    S("Hand Tools", "tool", null, "Socket Set; Wrench Set; Torque Wrench; Breaker Bar; Ratchet; Screwdriver Set; Pliers Set; Pry Bar Set; Trim Removal Tools; Impact Socket Set; Flare Nut Wrench Set; Hammer Set"),
    S("Power & Air Tools", "tool", null, "Cordless Impact Wrench; Air Compressor; Air Impact Wrench; Cordless Drill; Angle Grinder; Heat Gun; LED Work Light; Battery Charger; Battery Maintainer; Jump Starter"),
    S("Lifting & Support", "tool", null, "Floor Jack; Jack Stands; Wheel Chocks; Car Ramps; Creeper; Engine Hoist; Engine Stand; Transmission Jack; Mechanic Stool"),
    S("Specialty Tools", "tool", null, "Ball Joint Press; Brake Caliper Tool; Brake Bleeder Kit; Fuel Line Disconnect Tool; Serpentine Belt Tool; Spark Plug Socket; Oil Filter Wrench; Pulley Puller; Harmonic Balancer Puller; Bearing Puller; Strut Spring Compressor; Tie Rod Tool; Wheel Bearing Tool; Seal Puller; Snap Ring Pliers; Fluid Extractor"),
  ]),

  G("Towing, Truck & Off-Road", "tool", null, [
    S("Towing", "tool", null, "Trailer Hitch; Hitch Receiver; Ball Mount; Hitch Ball; Trailer Wiring Harness; Brake Controller; Safety Chains; Tow Straps; Tow Hooks"),
    S("Truck Bed & Cargo", "door", null, "Bed Liner; Tonneau Cover; Truck Bed Rails; Tool Box|truck tool box; Running Boards; Nerf Bars; Roof Rack; Cargo Carrier; Truck Mud Flaps"),
    S("Off-Road & Armor", "tool", null, "Winch; Recovery Gear Kit; Skid Plates; Bull Bar; Brush Guard; Rock Sliders; Snorkel; Off-Road Light Bar"),
    S("Lift & Level", "strut", null, "Lift Kit; Leveling Kit; Lift Springs; Extended Shocks; Extended Brake Lines; Differential Drop Kit; Lift Blocks"),
  ]),

  G("Performance", "spark", null, [
    S("Engine & Tuning", "spark", { noEv: true }, "Performance Chip|performance tuner chip; ECU Tuner; Performance Camshaft; Performance Pistons; Performance Spark Plugs; High-Flow Fuel Pump; High-Flow Fuel Injectors; Underdrive Pulley; Aluminum Flywheel"),
    S("Intake & Exhaust", "fan", { noEv: true }, "Cold Air Intake Kit; Short Ram Intake; Performance Air Filter; Performance Headers; Performance Downpipe; Performance Cat-Back; Performance Muffler; Exhaust Tips"),
    S("Suspension & Handling", "strut", null, "Coilover Kit; Lowering Springs; Performance Struts; Strut Tower Brace; Sway Bar Upgrade Kit; Polyurethane Bushings; Camber Plates; Adjustable Control Arms"),
    S("Brakes & Drivetrain", "brake", null, "Big Brake Kit; Slotted Rotors; Performance Brake Pads; Stainless Brake Lines; Short Shifter; Performance Clutch Kit; Limited Slip Differential; Racing Brake Fluid"),
  ]),

  G("Hybrid & EV", "plug", { electrified: true }, [
    S("Charging", "plug", null, "Level 2 Charging Cable|j1772 charging cable; Portable EV Charger; Charge Port Assembly; Charge Port Door; NACS to J1772 Adapter; Home Charging Station"),
    S("High-Voltage & Battery", "battery", null, "High Voltage Battery Pack|hybrid battery; Battery Coolant Pump; Battery Coolant Hose; Hybrid Battery Cooling Fan; Inverter; DC-DC Converter; Onboard Charger; High Voltage Cable; 12V Auxiliary Battery"),
    S("Cooling & Drive Unit", "radiator", null, "EV Coolant Pump; EV Coolant; Reduction Gear Fluid; Drive Unit Mount; Cabin Heater PTC|ev cabin heater; Heat Pump Valve"),
  ]),
];

export const CATALOG = RAW.map((g) => ({
  key: slug(g.label),
  label: g.label,
  icon: g.icon,
  flags: g.flags,
  subs: g.subs.map((s) => ({
    key: slug(g.label + "-" + s.label),
    label: s.label,
    icon: s.icon,
    flags: s.flags || {},
    items: s.items.split(";").map((t) => t.trim()).filter(Boolean).map((t) => {
      const [label, terms] = t.split("|");
      return { label: label.trim(), terms: (terms || label).trim().toLowerCase() };
    }),
  })),
}));

/* ---------- filtering for a particular vehicle ---------- */

function traits(vehicle) {
  const fuel = ((vehicle && vehicle.fuel) || "").toLowerCase();
  const drive = (vehicle && vehicle.drive) || "";
  const electrification = (vehicle && vehicle.electrification) || "";
  return {
    fuelKnown: !!fuel,
    driveKnown: !!drive,
    ev: fuel === "electric",
    diesel: fuel.includes("diesel"),
    awd: /awd|4wd|4x4|all-wheel|four-wheel/i.test(drive),
    electrified: fuel === "electric" || /bev|hev|phev|hybrid|electric/i.test(electrification),
  };
}

function allowed(flags, t) {
  if (flags.noEv && t.ev) return false;
  if (flags.noDiesel && t.diesel) return false;
  if (flags.diesel && t.fuelKnown && !t.diesel) return false;
  if (flags.awd && t.driveKnown && !t.awd) return false;
  if (flags.electrified && !t.electrified) return false;
  return true;
}

export function catalogFor(vehicle) {
  const t = traits(vehicle);
  return CATALOG
    .filter((g) => allowed(g.flags, t))
    .map((g) => ({ ...g, subs: g.subs.filter((s) => allowed(s.flags, t)) }))
    .filter((g) => g.subs.length)
    .map((g) => ({ ...g, count: g.subs.reduce((n, s) => n + s.items.length, 0) }));
}

export function countParts(cat) {
  return cat.reduce((n, g) => n + g.count, 0);
}

// Flat list for the search box.
export function searchParts(cat, query, limit = 60) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out = [];
  for (const g of cat) {
    for (const s of g.subs) {
      for (const it of s.items) {
        const hay = (it.label + " " + it.terms + " " + s.label + " " + g.label).toLowerCase();
        if (words.every((w) => hay.includes(w))) {
          const label = it.label.toLowerCase();
          const phrase = words.join(" ");
          // exact name first, then names starting with it, then names containing it, then the rest
          const rank = label === phrase ? 0 : label.startsWith(phrase) ? 1 : label.includes(phrase) ? 2 : 3;
          out.push({ ...it, rank, group: g.label, sub: s.label, icon: s.icon, id: g.key + "|" + s.key + "|" + it.label });
        }
      }
    }
  }
  return out.sort((a, b) => a.rank - b.rank).slice(0, limit);
}
