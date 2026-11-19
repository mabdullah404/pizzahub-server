import { collections } from '../config/db.js';

export const initialMenuItems = [
  {
    itemName: 'Classic Margherita Napoletana',
    category: 'Classic Pizzas',
    description:
      'San Marzano tomato sauce, fresh buffalo mozzarella, hand-picked sweet basil, and a drizzle of extra virgin olive oil on hand-stretched woodfired dough.',
    price: 14.99,
    location: 'Gulshan 2, Dhaka',
    images: [
      '/images/brelyn-bashrum-kpz1Y1tikGM-unsplash.jpg',
      '/images/chad-montano-MqT0asuoIcU-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: true,
    vendorName: "Luigi's Authentic Trattoria",
    vendorEmail: 'luigi@trattoria.com',
    businessName: "Luigi's Authentic Trattoria",
  },
  {
    itemName: 'Artisan Pepperoni Rustica',
    category: 'Meat Lovers',
    description:
      'Generous layers of premium aged Italian pepperoni, house-smoked mozzarella, oregano, and crushed chili flakes with a crisp sourdough crust.',
    price: 18.5,
    location: 'Banani, Dhaka',
    images: [
      '/images/ivan-torres-MQUqbmszGGM-unsplash.jpg',
      '/images/kelvin-t-AcA8moIiD3g-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: true,
    vendorName: 'Bella Vista Ristorante',
    vendorEmail: 'bellavista@pizzeria.com',
    businessName: 'Bella Vista Ristorante',
  },
  {
    itemName: 'Wild Truffle & Porcini Gourmet',
    category: 'Specialty / Gourmet Pizzas',
    description:
      'Earthy porcini and cremini mushrooms, fontina and fior di latte cheeses, finished with aromatic white truffle oil and fresh thyme.',
    price: 22.0,
    location: 'Dhanmondi, Dhaka',
    images: [
      '/images/daniel-T_PbUhfwd0U-unsplash.jpg',
      '/images/brelyn-bashrum-RqciGS0ypi0-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: true,
    vendorName: 'Fire & Stone Pizzeria',
    vendorEmail: 'firestone@pizza.com',
    businessName: 'Fire & Stone Pizzeria',
  },
  {
    itemName: 'Quattro Formaggi Gold Reserve',
    category: 'Classic Pizzas',
    description:
      'A rich four-cheese harmony featuring Gorgonzola Dolce, creamy Taleggio, aged Parmigiano-Reggiano, and rich Fior di Latte with wild clover honey drizzle.',
    price: 19.99,
    location: 'Uttara, Dhaka',
    images: [
      '/images/fatima-akram-uU0Anw-8Vsg-unsplash.jpg',
      '/images/aurelien-lemasson-theobald-x00CzBt4Dfk-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: true,
    vendorName: "Nonna's Hearth Pizza",
    vendorEmail: 'nonna@hearthpizza.com',
    businessName: "Nonna's Hearth Pizza",
  },
  {
    itemName: 'Spicy Calabrian Diavola',
    category: 'Meat Lovers',
    description:
      'Spicy Calabrian sausage, hot soppressata salami, roasted red peppers, mozzarella, and hot honey drizzle for that perfect sweet-heat kick.',
    price: 17.5,
    location: 'Mirpur DOHS, Dhaka',
    images: [
      '/images/kelvin-t-AcA8moIiD3g-unsplash.jpg',
      '/images/ivan-torres-MQUqbmszGGM-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: true,
    vendorName: 'Vesuvio Artisan Pies',
    vendorEmail: 'vesuvio@artisanpies.com',
    businessName: 'Vesuvio Artisan Pies',
  },
  {
    itemName: 'Mediterranean Garden Primavera',
    category: 'Vegetarian Pizzas',
    description:
      'Marinated artichoke hearts, kalamata olives, fire-roasted sweet bell peppers, sun-dried tomatoes, creamy goat cheese, and fresh baby spinach.',
    price: 16.0,
    location: 'Banani, Dhaka',
    images: [
      '/images/mahyar-motebassem-pGA4zHvpo5E-unsplash.jpg',
      '/images/brelyn-bashrum-kpz1Y1tikGM-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: true,
    vendorName: 'Verde Herb Pizzeria',
    vendorEmail: 'verde@pizzeria.com',
    businessName: 'Verde Herb Pizzeria',
  },
  {
    itemName: 'Truffle Garlic Focaccia Bread',
    category: 'Sides & Appetizers',
    description:
      'Warm wood-fired focaccia brushed with roasted garlic butter, rosemary, flaked sea salt, and served with marinara and whipped ricotta dip.',
    price: 8.5,
    location: 'Gulshan 2, Dhaka',
    images: [
      '/images/brenna-huff-22Vt7JIf7ZI-unsplash.jpg',
      '/images/daniel-T_PbUhfwd0U-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: false,
    vendorName: "Luigi's Authentic Trattoria",
    vendorEmail: 'luigi@trattoria.com',
    businessName: "Luigi's Authentic Trattoria",
  },
  {
    itemName: 'Artisan Espresso Tiramisu & San Pellegrino',
    category: 'Beverages & Desserts',
    description:
      'Layers of espresso-soaked ladyfingers, rich mascarpone cream, Dutch cocoa powder, accompanied by a chilled bottle of blood orange San Pellegrino.',
    price: 9.5,
    location: 'Dhanmondi, Dhaka',
    images: [
      '/images/nicolas-perondi-UxRhrU8fPHQ-unsplash.jpg',
      '/images/aurelien-lemasson-theobald-x00CzBt4Dfk-unsplash.jpg',
    ],
    status: 'approved',
    isFeatured: false,
    vendorName: 'Fire & Stone Pizzeria',
    vendorEmail: 'firestone@pizza.com',
    businessName: 'Fire & Stone Pizzeria',
  },
];

/**
 * Repeatable, idempotent seeder.
 * Ensures initial demonstration menu items are populated without duplicates.
 */
export async function seedInitialData() {
  try {
    for (const item of initialMenuItems) {
      const exists = await collections.menuItems.findOne({ itemName: item.itemName });
      if (!exists) {
        await collections.menuItems.insertOne({
          ...item,
          vendorId: 'seed-vendor-001',
          createdAt: new Date(),
        });
      }
    }
    console.log('🌱 Seed database check complete: Initial demo menu items verified.');
  } catch (err) {
    console.error('⚠️ Database seed error:', err);
  }
}
