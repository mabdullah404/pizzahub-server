import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URL || process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URL is missing in pizzahub-server/.env!');
}

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let dbInstance = null;

export async function connectDB() {
  if (dbInstance) return dbInstance;
  try {
    await client.connect();
    const dbName = process.env.DB_NAME || 'pizzaHubDB';
    dbInstance = client.db(dbName);
    console.log(`✅ MongoDB connected successfully to database: [${dbName}]`);
    return dbInstance;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB Atlas:', err);
    throw err;
  }
}

export function getDB() {
  if (!dbInstance) {
    const dbName = process.env.DB_NAME || 'pizzaHubDB';
    return client.db(dbName);
  }
  return dbInstance;
}

export const collections = {
  get users() {
    return getDB().collection('user');
  },
  get sessions() {
    return getDB().collection('session');
  },
  get accounts() {
    return getDB().collection('account');
  },
  get menuItems() {
    return getDB().collection('menuItems');
  },
  get orders() {
    return getDB().collection('orders');
  },
  get transactions() {
    return getDB().collection('transactions');
  },
  get reviews() {
    return getDB().collection('reviews');
  },
  get favorites() {
    return getDB().collection('favorites');
  },
};

export function toObjectId(id) {
  if (!id || !ObjectId.isValid(String(id))) return null;
  return new ObjectId(String(id));
}
