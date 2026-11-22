import { connectDB, collections } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const DHAKA_LOCATIONS = [
  "Banani",
  "Gulshan",
  "Dhanmondi",
  "Uttara",
  "Mirpur",
  "Motijheel",
];

const JUNK_NAMES = [
  /naga/i,
  /chbcvfnh/i,
  /cf gnh/i,
  /facilis/i,
  /id beatae/i,
  /test/i,
  /asdf/i,
  /sample/i,
  /foo/i,
  /bar/i,
];

async function main() {
  await connectDB();
  console.log('Connected to MongoDB for data cleanup...');

  const allItems = await collections.menuItems.find({}).toArray();
  console.log(`Found ${allItems.length} total menu items.`);

  let deletedCount = 0;
  let updatedCount = 0;

  for (const item of allItems) {
    const isJunk = JUNK_NAMES.some((pattern) => pattern.test(item.itemName) || pattern.test(item.description));
    if (isJunk) {
      console.log(`Deleting junk test item: "${item.itemName}" (${item._id})`);
      await collections.menuItems.deleteOne({ _id: item._id });
      deletedCount++;
      continue;
    }

    // Check if location is Italian or invalid
    let newLocation = item.location;
    if (
      !newLocation ||
      /rome/i.test(newLocation) ||
      /naples/i.test(newLocation) ||
      /milan/i.test(newLocation) ||
      /florence/i.test(newLocation) ||
      /turin/i.test(newLocation) ||
      /venice/i.test(newLocation) ||
      /italy/i.test(newLocation)
    ) {
      // Assign a Dhaka location
      const randomLoc = DHAKA_LOCATIONS[Math.floor(Math.random() * DHAKA_LOCATIONS.length)];
      newLocation = randomLoc;
    }

    const updates = {};
    if (newLocation !== item.location) {
      updates.location = newLocation;
    }

    // Ensure status is approved for remaining valid items
    if (item.status === 'pending' || !item.status) {
      updates.status = 'approved';
    }

    if (Object.keys(updates).length > 0) {
      await collections.menuItems.updateOne({ _id: item._id }, { $set: updates });
      console.log(`Updated item: "${item.itemName}" ->`, updates);
      updatedCount++;
    }
  }

  console.log(`\nCleanup finished: Deleted ${deletedCount} test items, updated ${updatedCount} items.`);
  const remaining = await collections.menuItems.find({}).toArray();
  console.log(`Remaining valid menu items: ${remaining.length}`);
  remaining.forEach((i, idx) => {
    console.log(`[${idx + 1}] "${i.itemName}" | Category: ${i.category} | Location: ${i.location} | Price: $${i.price}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
