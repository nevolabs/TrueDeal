export const sampleSeed = 'truedeal-sample-catalog-v1';
export const sampleUsers = [
  { key: 'asha', name: 'Demo Seller Asha', city: 'Bengaluru', email: 'asha@demo.truedeal.invalid' },
  { key: 'vikram', name: 'Demo Seller Vikram', city: 'Chennai', email: 'vikram@demo.truedeal.invalid' },
  { key: 'neha', name: 'Demo Seller Neha', city: 'Mumbai', email: 'neha@demo.truedeal.invalid' },
  { key: 'kabir', name: 'Demo Seller Kabir', city: 'Pune', email: 'kabir@demo.truedeal.invalid' },
  { key: 'buyer', name: 'Demo Buyer', city: 'Hyderabad', email: 'buyer@demo.truedeal.invalid' },
];

// Catalogue only. Do not import the historical prototype seed: it also contains
// invented verification reports, orders and financial history.
/** @type {Array<[string,string,string,string,string,number,number,string,number,string[][]]>} */
const products = [
  ['gpu', 'asha', 'gpu', 'NVIDIA RTX 2080 Ti Founders Edition', 'NVIDIA', 24500, 105000, 'excellent', 58, [['Memory', '11 GB GDDR6'], ['Cooling', 'Dual fan']]],
  ['ryzen', 'asha', 'cpu', 'AMD Ryzen 7 3700X + ASUS TUF B550M-Plus', 'AMD / ASUS', 13500, 41000, 'excellent', 50, [['Cores / threads', '8 / 16'], ['Socket', 'AM4']]],
  ['intel', 'vikram', 'cpu', 'Intel Core i9-9900K + MSI Z390 Gaming Plus', 'Intel / MSI', 18900, 52000, 'good', 61, [['Cores / threads', '8 / 16'], ['Platform', 'DDR4']]],
  ['keychron', 'asha', 'keyboard', 'Keychron Q1 Pro mechanical keyboard', 'Keychron', 11800, 19500, 'likenew', 7, [['Layout', '75% with knob'], ['Connectivity', 'Bluetooth / USB-C']]],
  ['varmilo', 'vikram', 'keyboard', 'Varmilo VA87M mechanical keyboard', 'Varmilo', 8900, 13500, 'good', 30, [['Layout', 'Tenkeyless'], ['Switches', 'Cherry MX Red']]],
  ['headphones', 'neha', 'audio', 'Sony WH-1000XM5 headphones', 'Sony', 16900, 29990, 'likenew', 9, [['Type', 'Wireless over-ear'], ['Feature', 'Noise cancellation']]],
  ['mouse-black', 'kabir', 'mouse', 'Logitech G Pro X Superlight 2, black', 'Logitech', 9400, 15495, 'excellent', 11, [['Weight', '60 g'], ['Connectivity', 'Wireless']]],
  ['camera', 'neha', 'camera', 'Sony A7 III camera kit', 'Sony', 92000, 165000, 'good', 44, [['Type', 'Full-frame mirrorless'], ['Kit', 'Body, lens and adapter shown']]],
  ['xps', 'kabir', 'laptop', 'Dell XPS 13 9310 laptop', 'Dell', 58000, 139990, 'excellent', 34, [['Processor', 'Intel Core i7'], ['Memory / storage', '16 GB / 512 GB']]],
  ['monitor', 'vikram', 'monitor', 'Alienware AW2721D 27-inch monitor', 'Dell Alienware', 34500, 79990, 'excellent', 29, [['Resolution', '2560 × 1440'], ['Refresh rate', '240 Hz']]],
  ['build', 'asha', 'desktop', 'Custom Ryzen 7 gaming desktop', 'Custom', 135000, 245000, 'excellent', 22, [['Processor', 'Ryzen 7 5800X3D'], ['Graphics', 'RTX 3080 12 GB'], ['Memory', '32 GB DDR4']]],
  ['macbook', 'neha', 'laptop', 'Apple MacBook Pro 13-inch M1', 'Apple', 62000, 142900, 'excellent', 38, [['Chip', 'Apple M1'], ['Memory / storage', '16 GB / 512 GB']]],
  ['mouse-white', 'kabir', 'mouse', 'Logitech G Pro X Superlight, white', 'Logitech', 6200, 12995, 'good', 27, [['Weight', '63 g'], ['Connectivity', 'Wireless']]],
  ['aio', 'asha', 'component', 'Corsair H100i RGB Platinum SE cooler', 'Corsair', 6500, 14500, 'good', 40, [['Radiator', '240 mm'], ['Type', 'All-in-one liquid cooler']]],
];

export const sampleListings = products.map(([image, seller, category, title, brand, price, newPrice, condition, ageMonths, specs], index) => ({
  id: `d3e00000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  seller, category, sourceImage: `${image}.jpg`, pricePaise: price * 100, serial: `DEMO-${image.toUpperCase()}`,
  handover: image === 'build' ? 'onsite' : 'ship',
  attributes: {
    title: `[Demo] ${title}`, brand, newPrice, condition,
    ageMonths, specs, invoice: false, box: false, warranty: 'Sample data; no warranty claim',
    description: 'Sample listing for TrueDeal UI testing. This item is not offered for sale. Prices and specifications are illustrative; no ownership, inspection or seller verification is claimed.',
    sampleSeed,
  },
}));

// Uses a transaction so partial catalogue writes are never published. Auth
// accounts are created separately via the supported Supabase Admin API.
export async function insertSampleListings(db, userIds, media) {
  await db.query('begin');
  try {
    for (const listing of sampleListings) {
      const seller = sampleUsers.find(user => user.key === listing.seller);
      const sellerId = userIds[listing.seller];
      if (!sellerId) throw new Error(`Missing sample seller: ${listing.seller}`);
      const photo = media?.[listing.id];
      if (!photo || !photo.path.startsWith(sellerId + '/') || !/^https?:\/\//.test(photo.url) || !photo.url.endsWith('/storage/v1/object/public/listing-photos/' + photo.path)) throw new Error('Publish the seller-owned photo before creating a listing.');
      const owner = await db.query("select id from auth.users where id=$1 and email=$2 and raw_app_meta_data->>'sampleSeed'=$3 and email_confirmed_at is not null", [sellerId, seller.email, sampleSeed]);
      if (!owner.rows.length) throw new Error(`Sample seller is not a confirmed, seed-owned Auth account: ${listing.seller}`);
      const existing = await db.query('select seller_id,attributes from public.listings where id=$1', [listing.id]);
      if (existing.rows.length) {
        if (existing.rows[0].seller_id !== sellerId || existing.rows[0].attributes.sampleSeed !== sampleSeed) throw new Error('Sample listing ID belongs to unrelated data.');
        const previousImage = existing.rows[0].attributes.img;
        // Migrate only the known old fixture path. Preserve user-selected media
        // and all other fields, prices and lifecycle transitions on reruns.
        if (!previousImage || previousImage === `/img/${listing.sourceImage}`) {
          await db.query("update public.listings set attributes=jsonb_set(attributes,'{img}',to_jsonb($2::text)) where id=$1", [listing.id, photo.url]);
        }
        continue; // Preserve edits and any later lifecycle transitions.
      }
      await db.query(`insert into public.listings(id,seller_id,category,price_paise,status,mode,handover,serial,attributes)
        values($1,$2,$3,$4,'live','order',$5,$6,$7::jsonb)`,
      [listing.id, sellerId, listing.category, listing.pricePaise, listing.handover, listing.serial, JSON.stringify({ ...listing.attributes, city: seller.city, img: photo.url })]);
    }
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }
}
