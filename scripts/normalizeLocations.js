import { connectDB, collections } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const LOCATION_MAP = {
  "Gulshan 2, Dhaka": "Gulshan",
  "Banani, Dhaka": "Banani",
  "Dhanmondi, Dhaka": "Dhanmondi",
  "Uttara, Dhaka": "Uttara",
  "Mirpur DOHS, Dhaka": "Mirpur",
  "Mirpur, Dhaka": "Mirpur",
  "Motijheel, Dhaka": "Motijheel",
};

async function normalize() {
  await connectDB();
  const items = await collections.menuItems.find({}).toArray();
  for (const item of items) {
    const loc = LOCATION_MAP[item.location] || item.location;
    await collections.menuItems.updateOne(
      { _id: item._id },
      { $set: { location: loc, status: 'approved' } }
    );
    console.log(`Normalized "${item.itemName}" -> Location: ${loc}`);
  }
  process.exit(0);
}

normalize();
