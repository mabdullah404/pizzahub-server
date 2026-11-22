import { connectDB, collections } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function initIndexes() {
  await connectDB();
  console.log('Ensuring MongoDB indexes for menuItems...');

  const col = collections.menuItems;

  // Single field indexes
  await col.createIndex({ status: 1 });
  await col.createIndex({ category: 1 });
  await col.createIndex({ location: 1 });
  await col.createIndex({ price: 1 });
  await col.createIndex({ isFeatured: 1 });

  // Compound indexes for high-speed public queries
  await col.createIndex({ status: 1, isFeatured: 1, createdAt: -1 });
  await col.createIndex({ status: 1, category: 1, location: 1, price: 1 });

  console.log('✅ Indexes created successfully on menuItems collection:');
  const indexes = await col.indexes();
  indexes.forEach((idx) => {
    console.log(`- ${idx.name}:`, JSON.stringify(idx.key));
  });

  process.exit(0);
}

initIndexes().catch((err) => {
  console.error('Failed to create indexes:', err);
  process.exit(1);
});
