import { connectDB, collections } from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await connectDB();
  const db = collections.users.s.db;
  const cols = await db.listCollections().toArray();
  console.log('Collections in db:', cols.map((c) => c.name));

  for (const name of ['user', 'users', 'account', 'accounts', 'session', 'sessions']) {
    if (cols.some((c) => c.name === name)) {
      const items = await db.collection(name).find({}).toArray();
      console.log(`--- Collection: "${name}" (${items.length} items) ---`);
      if (name === 'user' || name === 'users') {
        items.forEach((u) => {
          console.log(`Email: ${u.email} | Role: ${u.role} | Name: ${u.name} | isBlocked: ${u.isBlocked} | banned: ${u.banned}`);
        });
      }
      if (name === 'account' || name === 'accounts') {
        items.forEach((a) => {
          console.log(`AccountId: ${a.accountId} | ProviderId: ${a.providerId} | UserId: ${a.userId} | HasPassword: ${!!a.password}`);
        });
      }
    }
  }
  process.exit(0);
}

check();
