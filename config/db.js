import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let clientInstance = null;

export function getClient() {
  if (!clientInstance) {
    const uri = process.env.MONGODB_URL || process.env.MONGODB_URI;
    if (!uri) {
      console.warn('⚠️ MONGODB_URL is missing in environment variables!');
      return null;
    }
    clientInstance = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }
  return clientInstance;
}

// Named export for backwards-compatibility
export const client = {
  connect: () => connectDB(),
  db: (name) => {
    const cl = getClient();
    return cl ? cl.db(name || process.env.DB_NAME || 'pizzaHubDB') : null;
  },
};

let dbInstance = null;

export async function connectDB() {
  if (dbInstance) return dbInstance;
  try {
    const cl = getClient();
    if (!cl) {
      console.warn('⚠️ Skipping MongoDB connection: MONGODB_URL not provided');
      return null;
    }
    await cl.connect();
    const dbName = process.env.DB_NAME || 'pizzaHubDB';
    dbInstance = cl.db(dbName);
    console.log(`✅ MongoDB connected successfully to database: [${dbName}]`);
    return dbInstance;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB Atlas:', err);
    throw err;
  }
}

export async function closeDB() {
  if (clientInstance) {
    await clientInstance.close();
    clientInstance = null;
    dbInstance = null;
  }
}

export function getDB() {
  if (dbInstance) return dbInstance;
  const cl = getClient();
  const dbName = process.env.DB_NAME || 'pizzaHubDB';
  if (cl) {
    return cl.db(dbName);
  }
  throw new Error('Database client not initialized. Check MONGODB_URL in environment.');
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
  get profiles() {
    return getDB().collection('profiles');
  },
};

export function toObjectId(id) {
  if (!id || !ObjectId.isValid(String(id))) return null;
  return new ObjectId(String(id));
}
