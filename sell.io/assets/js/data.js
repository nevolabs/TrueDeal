/* sell.io prototype — static reference data and seed content.
   Everything here is sample data for the demo. */
window.PK = window.PK || {};

PK.BRAND = 'sell.io';
PK.HUB_CITY = 'Bengaluru';

PK.FEES = {
  commissionRate: 0.05,   // charged to the seller, only on completed deals
  commissionMin: 499,
  minPrice: 5000,
  inspectionHours: 48,
  handoverDays: 3,
  visitFee: 799           // optional on-site inspection, chosen and paid by the seller
};

PK.CATEGORIES = {
  // ship: insured shipping charged to the buyer. bench: price of the optional full bench test.
  gpu:       { label: 'Graphics cards',       ship: 349,  bench: 799 },
  cpu:       { label: 'Processors & boards',  ship: 249,  bench: 499 },
  laptop:    { label: 'Laptops',              ship: 499,  bench: 999 },
  desktop:   { label: 'Desktop builds',       ship: 1499, bench: 1499 },
  monitor:   { label: 'Monitors',             ship: 799,  bench: 599 },
  keyboard:  { label: 'Keyboards',            ship: 199,  bench: 299 },
  mouse:     { label: 'Mice',                 ship: 149,  bench: 199 },
  audio:     { label: 'Audio',                ship: 199,  bench: 299 },
  camera:    { label: 'Cameras',              ship: 399,  bench: 799 },
  component: { label: 'Other components',     ship: 249,  bench: 399 }
};

PK.CONDITIONS = {
  likenew:   { label: 'Like new',  note: 'No visible wear. Indistinguishable from a new unit out of the box.' },
  excellent: { label: 'Excellent', note: 'Faint signs of use on close inspection. Fully functional.' },
  good:      { label: 'Good',      note: 'Visible cosmetic wear. Fully functional, nothing affecting performance.' },
  fair:      { label: 'Fair',      note: 'Heavy cosmetic wear or a minor, disclosed fault. Priced accordingly.' }
};

/* What the bench technician checks. Common checks apply to every item. */
PK.CHECKS_COMMON = [
  'Serial number matches the listing and invoice',
  'Ownership documents checked; not flagged as stolen',
  'Physical condition matches the stated grade',
  'Accessories and box contents as listed'
];

PK.CHECKS = {
  gpu: [
    '30-minute stress test with no artifacts or crashes',
    'Temperatures and fan speeds within spec under load',
    'Every display output tested',
    'Firmware is original, not reflashed',
    'No signs of repair, liquid or burn damage on the board',
    'Warranty status confirmed with the manufacturer'
  ],
  cpu: [
    'No bent pins or damaged contact pads',
    'Identifies correctly on the test bench',
    '20-minute all-core stress test stable',
    'Heat spreader intact; not delidded',
    'Motherboard slots, ports and headers tested (if included)'
  ],
  laptop: [
    'No firmware, BIOS, MDM or account locks',
    'Battery health and cycle count recorded',
    'Display checked for dead pixels, bleed and burn-in',
    'Keyboard, trackpad, speakers, camera and all ports tested',
    'Internal components match the listed configuration',
    'No liquid damage indicators triggered'
  ],
  desktop: [
    'Every component serial recorded against the listing',
    'Combined CPU and GPU stress test for 45 minutes',
    'Storage health (SMART) and capacity verified',
    'Cooling loop inspected for leaks and pump noise',
    'All front and rear ports tested'
  ],
  monitor: [
    'Dead and stuck pixel test on five solid colours',
    'Backlight bleed, uniformity and burn-in check',
    'Rated refresh rate and adaptive sync confirmed',
    'Every input tested',
    'Stand, mount and controls intact'
  ],
  keyboard: [
    'Every key registers; no chatter or double input',
    'Stabilisers, case and plate free of damage',
    'Wired and wireless modes tested',
    'Battery holds charge (wireless boards)'
  ],
  mouse: [
    'Sensor tracks cleanly; no spin-outs',
    'All switches tested for double-clicking',
    'Scroll wheel and feet inspected',
    'Battery and receiver tested'
  ],
  audio: [
    'Both drivers balanced; no rattle or distortion',
    'Noise cancellation and microphones tested',
    'Battery holds charge; charging port intact',
    'Serial verified as genuine with the manufacturer'
  ],
  camera: [
    'Shutter count recorded',
    'Sensor inspected for dust, scratches and hot pixels',
    'Autofocus, stabilisation and all dials tested',
    'Lens elements free of fungus, haze and scratches',
    'Card slots, ports and battery door intact'
  ],
  component: [
    'Functional test on the bench',
    'No signs of repair, liquid or burn damage',
    'Connectors, cables and mounting hardware intact'
  ]
};

/* Verification levels. The buyer picks one at checkout and pays for it.
   The look-and-feel check is in every order, funded by the seller's commission. */
PK.CHECKS_BASIC = [
  'Powers on and is recognised by a test system',
  'Photographed from every side for your report'
];
PK.TIERS = {
  basic: { label: 'Look-and-feel check', short: 'Look and feel',
    note: 'Identity, ownership and condition checked by hand. Powered on, but not stress-tested.' },
  full:  { label: 'Full bench test', short: 'Full bench',
    note: 'The identity and condition checks, plus stress tests, firmware and warranty lookups, and a look inside where it matters.' }
};

PK.checklistFor = function (cat, tier) {
  if (tier === 'basic') return PK.CHECKS_COMMON.concat(PK.CHECKS_BASIC);
  return PK.CHECKS_COMMON.concat(PK.CHECKS[cat] || PK.CHECKS.component);
};

PK.COURIERS = ['Blue Dart', 'Delhivery', 'DTDC Plus'];

PK.DISPUTE_REASONS = [
  'Not as described in the report',
  'Stopped working after delivery',
  'Damaged in transit',
  'Wrong or swapped item'
];

PK.STATUS = {
  paid:       { label: 'Payment held',      tone: 'amber' },
  in_transit: { label: 'Handover',          tone: 'amber' },
  at_hub:     { label: 'Being inspected',   tone: 'amber' },
  verified:   { label: 'Verified',          tone: 'green' },
  shipped:    { label: 'Shipped',           tone: 'green' },
  delivered:  { label: 'Delivered',         tone: 'green' },
  completed:  { label: 'Completed',         tone: 'ink' },
  disputed:   { label: 'Under review',      tone: 'red' },
  refunded:   { label: 'Refunded',          tone: 'muted' },
  cancelled:  { label: 'Cancelled',         tone: 'muted' }
};

PK.STEPS = [
  { key: 'paid',       title: 'Payment held in escrow' },
  { key: 'in_transit', title: 'Seller hands the item to sell.io', onsite: 'Inspection visit booked with the seller' },
  { key: 'at_hub',     title: 'Received at the Bengaluru hub',   onsite: 'Agent on site with the item' },
  { key: 'verified',   title: 'Inspected; report issued',        onsite: 'Inspected on site; report issued' },
  { key: 'shipped',    title: 'Sealed and shipped, insured' },
  { key: 'delivered',  title: 'Delivered; 48-hour inspection window' },
  { key: 'completed',  title: 'Payment released to the seller' }
];
