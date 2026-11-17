import { benchFor, fee as calcFee, shipFor } from './data';
import type { AppState, InspectionReport, Listing, Order } from './types';

const H = 36e5;
const D = 24 * H;

function seedReport(
  cat: string,
  o: {
    id: string;
    at: number;
    grade: string;
    seal: string;
    serial: string;
    notes: string;
  },
  checklistFor: (cat: string, tier?: 'basic' | 'full') => string[]
): InspectionReport {
  return {
    id: o.id,
    at: o.at,
    agent: "Nikhil D'Souza",
    grade: o.grade,
    tier: 'full',
    seal: o.seal,
    serial: o.serial,
    notes: o.notes,
    checks: checklistFor(cat).map((label) => ({ label, result: 'pass' as const })),
  };
}

export function seed(checklistFor: (cat: string, tier?: 'basic' | 'full') => string[]): AppState {
  const now = Date.now();
  const users: AppState['users'] = [
    {
      id: 'u_arjun', name: 'Arjun Menon', email: 'arjun@example.com', city: 'Kochi', role: 'member',
      joined: now - 40 * D, deals: 0, kyc: { status: 'none' },
      address: { name: 'Arjun Menon', phone: '98470 12345', line: '14B, Skyline Meadows, Kakkanad', city: 'Kochi', pin: '682030' },
    },
    {
      id: 'u_meera', name: 'Meera Nair', email: 'meera@example.com', city: 'Chennai', role: 'member',
      joined: now - 90 * D, deals: 0, kyc: { status: 'none' },
      address: { name: 'Meera Nair', phone: '98840 55210', line: '7, Third Seaward Road, Valmiki Nagar', city: 'Chennai', pin: '600041' },
    },
    {
      id: 'u_rhea', name: 'Rhea Kapoor', email: 'rhea@example.com', city: 'Bengaluru', role: 'member',
      joined: now - 210 * D, deals: 14,
      kyc: { status: 'verified', pan: 'XXXXX4821K', bank: 'HDFC Bank', acct: '7716', at: now - 205 * D },
    },
    {
      id: 'u_karthik', name: 'Karthik Iyer', email: 'karthik@example.com', city: 'Bengaluru', role: 'member',
      joined: now - 400 * D, deals: 31,
      kyc: { status: 'verified', pan: 'XXXXX9034P', bank: 'ICICI Bank', acct: '0092', at: now - 398 * D },
    },
    {
      id: 'u_sana', name: 'Sana Sheikh', email: 'sana@example.com', city: 'Mumbai', role: 'member',
      joined: now - 150 * D, deals: 9,
      kyc: { status: 'verified', pan: 'XXXXX1177M', bank: 'Axis Bank', acct: '4408', at: now - 149 * D },
    },
    {
      id: 'u_dev', name: 'Dev Malhotra', email: 'dev@example.com', city: 'Pune', role: 'member',
      joined: now - 120 * D, deals: 6,
      kyc: { status: 'verified', pan: 'XXXXX6650D', bank: 'Kotak Mahindra Bank', acct: '3051', at: now - 118 * D },
    },
    {
      id: 'u_tanvi', name: 'Tanvi Rao', email: 'tanvi@example.com', city: 'Hyderabad', role: 'member',
      joined: now - 2 * D, deals: 0,
      kyc: { status: 'pending', pan: 'XXXXX2390R', bank: 'State Bank of India', acct: '8814', at: now - 5 * H },
    },
    {
      id: 'u_ops', name: "Nikhil D'Souza", email: 'bench@sellio.example', city: 'Bengaluru', role: 'ops',
      joined: now - 500 * D, deals: 0, kyc: { status: 'none' },
    },
  ];

  const L = (o: Partial<Listing> & Pick<Listing, 'id' | 'sellerId' | 'category' | 'img' | 'title' | 'brand' | 'price' | 'newPrice' | 'condition' | 'ageMonths' | 'warranty' | 'city' | 'serial' | 'specs' | 'description'>): Listing => ({
    status: 'live', mode: 'order', handover: 'ship', invoice: true, box: true, createdAt: now - 3 * D,
    ...o,
  });

  const listings: Listing[] = [
    L({
      id: 'l_gpu', sellerId: 'u_karthik', category: 'gpu', img: '/img/gpu.jpg',
      title: 'NVIDIA GeForce RTX 2080 Ti Founders Edition', brand: 'NVIDIA', price: 24500, newPrice: 105000,
      condition: 'excellent', ageMonths: 58, warranty: 'Out of warranty', city: 'Bengaluru', mode: 'hub',
      serial: '0324819062255', createdAt: now - 6 * D,
      specs: [['Memory', '11 GB GDDR6'], ['Outputs', '3× DisplayPort 1.4, HDMI 2.0b, USB-C'], ['Power', '2× 8-pin, 650 W PSU recommended'], ['Length', '267 mm, dual slot']],
      description: 'Bought on the NVIDIA store in Sept 2019. Gaming only, never mined on. Got it repasted with new thermal pads when I dropped it at the sell.io hub. Original box and bill.',
      report: seedReport('gpu', { id: 'VR-20417', at: now - 5 * D, grade: 'excellent', seal: 'S-7KQ2MD', serial: '0324819062255', notes: 'Peak 78°C after 30 minutes of 3DMark Time Spy stress, 99.4% frame stability. Fans spin true, no bearing noise. Light hairline marks on the backplate, visible only under direct light.' }, checklistFor),
    }),
    L({
      id: 'l_ryzen', sellerId: 'u_rhea', category: 'cpu', img: '/img/ryzen.jpg',
      title: 'AMD Ryzen 7 3700X with ASUS TUF B550M-Plus', brand: 'AMD / ASUS', price: 13500, newPrice: 41000,
      condition: 'excellent', ageMonths: 50, warranty: 'Out of warranty', city: 'Bengaluru',
      serial: '9KQ4471T20338', createdAt: now - 2 * D,
      specs: [['Cores / threads', '8 / 16'], ['Socket', 'AM4'], ['Board', 'ASUS TUF Gaming B550M-Plus, micro-ATX'], ['Cooler', 'Wraith Prism included']],
      description: 'Upgraded to AM5, so selling the old CPU and board together. Always ran at stock, never overclocked. CPU stays in the socket for shipping. Wraith Prism cooler included. Bill from PrimeABGB, Aug 2022.',
    }),
    L({
      id: 'l_intel', sellerId: 'u_karthik', category: 'cpu', img: '/img/intel.jpg',
      title: 'Intel Core i9-9900K with MSI Z390 Gaming Plus', brand: 'Intel / MSI', price: 18900, newPrice: 52000,
      condition: 'good', ageMonths: 61, warranty: 'Out of warranty', city: 'Bengaluru', box: false,
      serial: 'X938C442-601', createdAt: now - 8 * D,
      specs: [['Cores / threads', '8 / 16'], ['Board', 'MSI MPG Z390 Gaming Plus, ATX'], ['Memory support', 'DDR4, 4 slots'], ['Includes', 'CPU, board, I/O shield']],
      description: 'Selling as a combo, the CPU is already seated in the board. One scuff on the VRM heatsink, otherwise clean. BIOS updated to the last version. No box for the board.',
    }),
    L({
      id: 'l_keychron', sellerId: 'u_rhea', category: 'keyboard', img: '/img/keychron.jpg',
      title: 'Keychron Q1 Pro, carbon black, Gateron Jupiter Red', brand: 'Keychron', price: 11800, newPrice: 19500,
      condition: 'likenew', ageMonths: 7, warranty: '5 months manufacturer warranty', city: 'Bengaluru',
      serial: 'Q1P-M1-2403-11872', createdAt: now - 1 * D,
      specs: [['Layout', '75%, ANSI, knob'], ['Case', 'CNC aluminium, gasket mount'], ['Connectivity', 'Bluetooth 5.1, USB-C'], ['Keycaps', 'KSA double-shot PBT']],
      description: 'Used it for about 4 months, then moved to a split keyboard. Everything from the box is there: both cables, keycap puller, spare gaskets and the Mac and Windows keycaps.',
    }),
    L({
      id: 'l_varmilo', sellerId: 'u_rhea', category: 'keyboard', img: '/img/varmilo.jpg',
      title: 'Varmilo VA87M, Cherry MX Red', brand: 'Varmilo', price: 8900, newPrice: 13500,
      condition: 'good', ageMonths: 30, warranty: 'Out of warranty', city: 'Bengaluru', status: 'reserved',
      serial: 'VA87M-190822-0457', createdAt: now - 9 * D,
      specs: [['Layout', 'Tenkeyless, ANSI'], ['Switches', 'Cherry MX Red'], ['Keycaps', 'Dye-sub PBT'], ['Connectivity', 'USB-C, detachable']],
      description: 'My daily keyboard for around two and a half years. Spacebar has some shine, the rest of the keycaps are fine. No chatter on any key.',
    }),
    L({
      id: 'l_xm5', sellerId: 'u_sana', category: 'audio', img: '/img/headphones.jpg',
      title: 'Sony WH-1000XM5, black', brand: 'Sony', price: 16900, newPrice: 29990,
      condition: 'likenew', ageMonths: 9, warranty: '3 months manufacturer warranty', city: 'Mumbai', mode: 'hub',
      serial: 'S01-4471902-B', createdAt: now - 4 * D,
      specs: [['Type', 'Over-ear, wireless, noise cancelling'], ['Battery', 'Up to 30 hours'], ['Codecs', 'LDAC, AAC, SBC'], ['Includes', 'Case, USB-C cable, 3.5 mm cable']],
      description: 'Bought for travel last year, used on maybe 10 to 12 flights. Earpads are original, no cracks or peeling. Comes with the case and both cables.',
      report: seedReport('audio', { id: 'VR-20422', at: now - 3 * D, grade: 'likenew', seal: 'S-3HV8TA', serial: 'S01-4471902-B', notes: 'Channel balance within 0.5 dB. Battery reported 97% health in the Sony app. Serial confirmed genuine with Sony India; warranty runs a further three months.' }, checklistFor),
    }),
    L({
      id: 'l_gpx', sellerId: 'u_dev', category: 'mouse', img: '/img/mouse-black.jpg',
      title: 'Logitech G Pro X Superlight 2, black', brand: 'Logitech', price: 9400, newPrice: 15495,
      condition: 'excellent', ageMonths: 11, warranty: '13 months manufacturer warranty', city: 'Pune',
      serial: '2331LZ05K8X9', createdAt: now - 5 * D,
      specs: [['Weight', '60 g'], ['Sensor', 'HERO 2, 32,000 DPI'], ['Polling', 'Up to 2,000 Hz'], ['Battery', 'Up to 95 hours']],
      description: 'Was my backup mouse, barely used. Stock feet, never put grip tape on it. Box, receiver and cable included.',
    }),
    L({
      id: 'l_a7', sellerId: 'u_sana', category: 'camera', img: '/img/camera.jpg',
      title: 'Sony A7 III body with Canon EF 50mm f/1.4 and adapter', brand: 'Sony', price: 92000, newPrice: 165000,
      condition: 'good', ageMonths: 44, warranty: 'Out of warranty', city: 'Mumbai',
      serial: '4718830', createdAt: now - 7 * D,
      specs: [['Sensor', '24.2 MP full-frame'], ['Shutter count', 'Approx. 38,000 (verified on the bench)'], ['Includes', 'Body, 50mm f/1.4, Sigma MC-11, 2 batteries'], ['Mount', 'Sony E']],
      description: 'Used as my second body for weddings for three seasons. Some paint wear near the strap lugs. Sensor professionally cleaned in August. Comes with 2 batteries, the Sigma MC-11 and the Canon 50mm f/1.4.',
    }),
    L({
      id: 'l_xps', sellerId: 'u_dev', category: 'laptop', img: '/img/xps.jpg',
      title: 'Dell XPS 13 9310, i7, 16 GB, 512 GB, frost white', brand: 'Dell', price: 58000, newPrice: 139990,
      condition: 'excellent', ageMonths: 34, warranty: 'Out of warranty', city: 'Pune', status: 'reserved',
      serial: 'DXPS-7QK29F3', createdAt: now - 10 * D,
      specs: [['Processor', 'Intel Core i7-1185G7'], ['Display', '13.4" UHD+ touch'], ['Memory / storage', '16 GB / 512 GB NVMe'], ['Battery', '52 Wh']],
      description: 'My old work laptop, bought it out when I left the company. Fully reset, no company login or MDM on it. Charger and box included.',
    }),
    L({
      id: 'l_aw', sellerId: 'u_karthik', category: 'monitor', img: '/img/monitor.jpg',
      title: 'Alienware AW2721D, 27" QHD 240 Hz', brand: 'Dell Alienware', price: 34500, newPrice: 79990,
      condition: 'excellent', ageMonths: 29, warranty: '7 months manufacturer warranty', city: 'Bengaluru',
      serial: 'CN-0J7K2-AW27-1D4', createdAt: now - 4 * D,
      specs: [['Panel', '27" Nano IPS, 2560 × 1440'], ['Refresh', '240 Hz, G-Sync Ultimate'], ['Inputs', 'DisplayPort 1.4, 2× HDMI 2.0'], ['Stand', 'Height, tilt, swivel, pivot']],
      description: 'No dead pixels that I can see. Selling only the monitor, nothing else in the photo is included.',
    }),
    L({
      id: 'l_build', sellerId: 'u_karthik', category: 'desktop', img: '/img/build.jpg',
      title: 'Custom build: Ryzen 7 5800X3D, RTX 3080 12 GB, 32 GB', brand: 'Custom', price: 135000, newPrice: 245000,
      condition: 'excellent', ageMonths: 22, warranty: 'Component warranties vary; listed in the report', city: 'Bengaluru', handover: 'onsite',
      serial: 'BUILD-KI-0611', createdAt: now - 2 * D,
      specs: [['Processor', 'AMD Ryzen 7 5800X3D'], ['Graphics', 'RTX 3080 12 GB'], ['Memory / storage', '32 GB DDR4 3600 / 2 TB NVMe'], ['Case and cooling', 'Lian Li O11 Dynamic, 360 mm AIO, 9 fans']],
      description: 'Built in Jan 2025, used for gaming and some Blender work. I have bills for every part. It is too heavy to courier safely, so I chose on-site inspection at my place in Indiranagar.',
    }),
    L({
      id: 'l_mbp', sellerId: 'u_sana', category: 'laptop', img: '/img/macbook.jpg',
      title: 'MacBook Pro 13", M1, 16 GB, 512 GB, silver', brand: 'Apple', price: 62000, newPrice: 142900,
      condition: 'excellent', ageMonths: 38, warranty: 'Out of warranty', city: 'Mumbai', status: 'reserved',
      serial: 'C02FX1Q7Q05D', createdAt: now - 12 * D,
      specs: [['Chip', 'Apple M1'], ['Memory / storage', '16 GB / 512 GB'], ['Battery', '91% health, 214 cycles'], ['Includes', '61 W charger, box']],
      description: 'Office laptop, light use. Activation Lock is off and macOS has been reinstalled. Battery health 91%.',
    }),
    L({
      id: 'l_g305', sellerId: 'u_rhea', category: 'mouse', img: '/img/mouse-white.jpg',
      title: 'Logitech G Pro X Superlight, white', brand: 'Logitech', price: 6200, newPrice: 12995,
      condition: 'good', ageMonths: 27, warranty: 'Out of warranty', city: 'Bengaluru', status: 'pending',
      serial: '2209LZ51A3B7', createdAt: now - 3 * H,
      specs: [['Weight', '63 g'], ['Sensor', 'HERO 25K'], ['Battery', 'Up to 70 hours'], ['Includes', 'Receiver, cable, box']],
      description: 'Left side has gone slightly yellow from sunlight. Clicks are fine, no double clicking.',
    }),
    L({
      id: 'l_aio', sellerId: 'u_rhea', category: 'component', img: '/img/aio.jpg',
      title: 'Corsair H100i RGB Platinum SE, 240 mm', brand: 'Corsair', price: 6500, newPrice: 14500,
      condition: 'good', ageMonths: 40, warranty: 'Out of warranty', city: 'Bengaluru', status: 'sold',
      serial: 'CW-9060042-2041', createdAt: now - 30 * D,
      specs: [['Radiator', '240 mm'], ['Sockets', 'AM4, AM5, LGA 1700 (bracket included)']],
      description: 'Pulled from a working build. Pump is quiet.',
    }),
  ];

  const addrArjun = users[0].address!;
  const addrMeera = users[1].address!;

  function mkOrder(o: Partial<Order> & Pick<Order, 'id' | 'listingId' | 'buyerId' | 'address' | 'status' | 'createdAt' | 'timeline'>): Order {
    const l = listings.find((x) => x.id === o.listingId)!;
    const shipping = shipFor(l.category);
    const feeAmt = calcFee(l.price);
    const tier = o.tier || 'full';
    const inspectionFee = tier === 'full' ? benchFor(l.category) : 0;
    const visitFee = l.handover === 'onsite' ? 799 : 0;
    return {
      sellerId: l.sellerId, price: l.price, shipping, tier, inspectionFee, handover: l.handover, visitFee,
      total: l.price + shipping + inspectionFee, fee: feeAmt, payout: l.price - feeAmt - visitFee,
      payMethod: 'UPI', handoverCode: 'H-' + (1000 + Math.floor(Math.random() * 9000)),
      ...o,
    } as Order;
  }

  const orders: Order[] = [
    mkOrder({ id: 'PK-1041', tier: 'basic', listingId: 'l_varmilo', buyerId: 'u_meera', address: addrMeera, status: 'paid', createdAt: now - 7 * H, timeline: [{ status: 'paid', at: now - 7 * H }] }),
    mkOrder({ id: 'PK-1039', listingId: 'l_xps', buyerId: 'u_arjun', address: addrArjun, status: 'at_hub', createdAt: now - 3 * D, timeline: [{ status: 'paid', at: now - 3 * D }, { status: 'in_transit', at: now - 2 * D }, { status: 'at_hub', at: now - 4 * H }] }),
    mkOrder({
      id: 'PK-1036', listingId: 'l_mbp', buyerId: 'u_arjun', address: addrArjun, status: 'shipped', createdAt: now - 6 * D,
      tracking: { courier: 'Blue Dart', awb: '75120448213' },
      report: seedReport('laptop', { id: 'VR-20409', at: now - 2 * D, grade: 'excellent', seal: 'S-9RW4XE', serial: 'C02FX1Q7Q05D', notes: 'Battery at 91% health, 214 cycles. No Activation Lock or MDM profile. Display clean on all five test colours. One faint mark on the underside near the rear foot.' }, checklistFor),
      timeline: [{ status: 'paid', at: now - 6 * D }, { status: 'in_transit', at: now - 5 * D }, { status: 'at_hub', at: now - 3 * D }, { status: 'verified', at: now - 2 * D }, { status: 'shipped', at: now - 1 * D }],
    }),
    mkOrder({
      id: 'PK-1031', listingId: 'l_aio', buyerId: 'u_meera', address: addrMeera, status: 'completed', createdAt: now - 26 * D,
      tracking: { courier: 'Delhivery', awb: '20417733905' },
      report: seedReport('component', { id: 'VR-20388', at: now - 23 * D, grade: 'good', seal: 'S-2MN6QP', serial: 'CW-9060042-2041', notes: 'Pump quiet at full speed. Held a 5800X at 74°C under load. Minor fin bending on one corner of the radiator.' }, checklistFor),
      timeline: [{ status: 'paid', at: now - 26 * D }, { status: 'in_transit', at: now - 25 * D }, { status: 'at_hub', at: now - 24 * D }, { status: 'verified', at: now - 23 * D }, { status: 'shipped', at: now - 22 * D }, { status: 'delivered', at: now - 20 * D }, { status: 'completed', at: now - 18 * D }],
    }),
  ];

  return { v: 1, users, listings, orders, seq: { order: 1042, report: 20430, listing: 1 } };
}
