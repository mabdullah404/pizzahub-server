import dotenv from 'dotenv';
dotenv.config();

import { MongoClient } from 'mongodb';

const MONGODB_URL = process.env.MONGODB_URL || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'pizzaHubDB';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mabdullah539629@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGODB_URL) {
  console.error('❌ MONGODB_URL environment variable is required.');
  process.exit(1);
}

async function seedAdmin() {
  const client = new MongoClient(MONGODB_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const userCol = db.collection('user');

    console.log(`🔍 Checking admin user status for: ${ADMIN_EMAIL}...`);
    const existing = await userCol.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      console.log(`ℹ️ Admin account already exists (ID: ${existing._id}). Ensuring admin role...`);
      await userCol.updateOne(
        { _id: existing._id },
        {
          $set: {
            role: 'admin',
            isBlocked: false,
            banned: false,
            updatedAt: new Date(),
          },
        }
      );
      console.log('✅ Admin account verified and role confirmed as: admin (Idempotent)');
    } else {
      console.log('ℹ️ Admin account does not exist. Creating admin document...');
      const adminDoc = {
        name: 'PizzaHub Administrator',
        email: ADMIN_EMAIL,
        emailVerified: true,
        role: 'admin',
        isBlocked: false,
        banned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await userCol.insertOne(adminDoc);
      console.log(`✅ Admin account created with ID: ${result.insertedId} and role: admin`);
    }
  } catch (err) {
    console.error('❌ Error seeding admin user:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedAdmin();
