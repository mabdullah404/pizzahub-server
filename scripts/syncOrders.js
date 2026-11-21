import { MongoClient } from 'mongodb';

const uri =
  'mongodb://pizzaHub:SohLLBqoigGtaAXO@ac-3ww2xt0-shard-00-00.wr4odv4.mongodb.net:27017,ac-3ww2xt0-shard-00-01.wr4odv4.mongodb.net:27017,ac-3ww2xt0-shard-00-02.wr4odv4.mongodb.net:27017/?ssl=true&replicaSet=atlas-11txxf-shard-0&authSource=admin';

async function main() {
  const client = await MongoClient.connect(uri);
  const db = client.db('pizzaHubDB');

  // Find vendor abdullah77
  const vendor = await db.collection('user').findOne({ email: 'abdullah77@gmail.com' });
  if (!vendor) {
    console.log('Vendor not found');
    await client.close();
    return;
  }

  const vendorId = String(vendor._id);
  console.log('Found vendor:', vendor.email, vendorId);

  // Update orders created by customer abdullah777 so they belong to vendor abdullah77
  const result = await db.collection('orders').updateMany(
    { customerEmail: 'abdullah777@gmail.com' },
    {
      $set: {
        vendorId,
        vendorEmail: vendor.email,
        vendorName: vendor.name || 'Abdullah',
      },
    }
  );

  console.log(`Updated ${result.modifiedCount} orders to vendor ${vendor.email}`);

  // Also check all items by abdullah77
  const items = await db.collection('menuItems').find({ vendorEmail: vendor.email }).toArray();
  console.log(`Vendor ${vendor.email} has ${items.length} menu items:`, items.map(i => i.itemName));

  await client.close();
}

main().catch(console.error);
