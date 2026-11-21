# 🍕 PizzaHub — Express.js REST API Server

PizzaHub Server is the high-performance backend REST API powering the PizzaHub pizza ordering, vendor management, and subscription platform.

- **Live Server API**: [https://pizzahub-server-mu.vercel.app](https://pizzahub-server-mu.vercel.app)
- **Live Client URL**: [https://pizzahub-client-tan.vercel.app](https://pizzahub-client-tan.vercel.app)
- **Server GitHub**: [https://github.com/mabdullah404/pizzahub-server](https://github.com/mabdullah404/pizzahub-server)
- **Client GitHub**: [https://github.com/mabdullah404/pizzahub-client](https://github.com/mabdullah404/pizzahub-client)

---

## 🛠️ Technology Stack & npm Packages

- **Runtime**: Node.js (ES Modules, `"type": "module"`)
- **Framework**: Express.js (`express`)
- **Database**: MongoDB Native Driver (`mongodb`) on MongoDB Atlas
- **Security & Auth**: `jsonwebtoken`, Better Auth Session verification, CORS (`cors`), Dotenv (`dotenv`)
- **Payments**: Stripe Node SDK (`stripe`)
- **File Uploads**: Multer memory storage (`multer`) & ImgBB API integration
- **Development Tooling**: Nodemon (`nodemon`)

---

## 📁 Server Folder Structure

```text
PizzaHub-Server/
│
├── config/
│   └── db.js                 # MongoDB connection & collection helpers
│
├── middleware/
│   ├── verifyToken.js        # Dual JWT & Better Auth session token verification
│   ├── verifyRole.js         # Role-based guards (Admin, Vendor, Customer)
│   └── verifyOwnership.js    # Resource ownership guards (Items & Orders)
│
├── routes/
│   ├── menuRoutes.js         # Public menu, search/filter, and vendor CRUD
│   ├── orderRoutes.js        # Pizza orders dispatch & customer cancellations
│   ├── userRoutes.js         # Profile management & admin user blocking
│   ├── dashboardRoutes.js    # Statistics & performance analytics
│   ├── paymentRoutes.js      # Stripe checkout session & webhook
│   └── uploadRoutes.js       # ImgBB image upload proxy
│
├── controllers/
│   ├── menuController.js     # Menu logic, query filters, and Free tier limit
│   ├── orderController.js    # Duplicate order prevention & decision states
│   ├── userController.js     # Safe profile updates & block/unblock
│   ├── dashboardController.js# Aggregate stats for each role
│   └── paymentController.js  # Stripe sessions, webhooks & transaction ledger
│
├── services/
│   └── imgbbService.js       # Server-side ImgBB multipart upload
│
├── utils/
│   └── seedData.js           # Idempotent demo pizza records seeder
│
├── index.js                  # Express main entrypoint & webhook mounting
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables (`.env`)

Create a `.env` file inside `pizzahub-server/`:

```env
PORT=5000
DB_NAME=pizzaHubDB
MONGODB_URL=your_mongodb_atlas_connection_string
CLIENT_URL=http://localhost:3000

# Better Auth Secret (shared with Next.js client for JWT cryptographic verification)
BETTER_AUTH_SECRET=your_better_auth_secret_here

# Stripe Integration (for Vendor Premium Subscription)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# ImgBB API Key (for Vendor Menu Item Image Hosting)
IMGBB_API_KEY=your_imgbb_api_key_here
```

---

## 🔐 Challenge Requirement 2: JWT & Token Verification Flow

The Express backend implements robust authentication verification:

1. **Header Parsing**: Reads incoming `Authorization: Bearer <token>` from the client request.
2. **Dual Verification**:
   - **Approach A (Signed JWT)**: Cryptographically verifies the token using `jwt.verify(token, process.env.BETTER_AUTH_SECRET)`. Validates expiration, signature, and user claims (`sub`, `id`, `email`).
   - **Approach B (Session Database Lookup)**: Looks up active sessions in MongoDB's `session` collection where `session.token === token`. Verifies `session.expiresAt > Date.now()`.
3. **Database User Hydration**: Loads the matching user document from MongoDB's `user` collection.
4. **Suspended Account Enforcement**: If `user.isBlocked === true` or `user.banned === true`, the request is immediately rejected with HTTP `403 Forbidden`.
5. **Role-Based Guards**: Protected routes enforce strict roles via `verifyAdmin`, `verifyVendor`, or `verifyCustomer`. Untrusted frontend roles are never accepted.

---

## 🔍 Challenge Requirement 1: Advanced Search, Filtering & Sorting

The `GET /api/menu` endpoint processes multi-criteria query parameters:

- `search`: Case-insensitive regex match against `itemName` and `description`.
- `category`: Exact case-insensitive match against allowed categories (`Classic Pizzas`, `Vegetarian Pizzas`, `Meat Lovers`, `Specialty / Gourmet Pizzas`, `Sides & Appetizers`, `Beverages & Desserts`).
- `location`: Case-insensitive regex filter for restaurant locations (e.g., `Banani`, `Gulshan`, `Dhanmondi`).
- `sort`: 
  - `price_asc`: Sorts by price ascending (`{ price: 1 }`).
  - `price_desc`: Sorts by price descending (`{ price: -1 }`).
  - `newest`: Sorts newest recipes first (`{ createdAt: -1 }`).
- **Security & Privacy**: Automatically filters `{ status: "approved" }` so rejected, pending, or inactive items are never exposed publicly.

---

## 💳 Stripe Webhook & Subscription Architecture

1. **Vendor Checkout**: Authenticated vendor initiates upgrade via `POST /api/payments/create-checkout-session`.
2. **Session Creation**: Backend invokes `stripe.checkout.sessions.create()` with `metadata: { vendorId, plan: 'premium' }`.
3. **Raw Body Webhook Handling**: Express mounts `POST /api/payments/webhook` with `express.raw({ type: 'application/json' })` before JSON body parsing.
4. **Cryptographic Verification**: Validates `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` using `stripe.webhooks.constructEvent()`.
5. **Idempotency**: Checks if `stripeSessionId` was already recorded in the `transactions` collection to prevent duplicate subscription activations.
6. **Activation**: Records transaction in `transactions` and upgrades vendor record in `user` with `{ subscriptionPlan: 'premium', subscriptionExpiresAt: Date.now() + 30 days }`.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Server health status |
| `GET` | `/api/menu` | Public | Browse approved pizzas with search, category, location, and sort |
| `GET` | `/api/menu/:id` | Public / Auth | View item details |
| `POST` | `/api/menu` | Vendor | Create pizza (enforces Free tier max 3 active items) |
| `GET` | `/api/menu/vendor/my-items` | Vendor | View vendor's own menu catalog |
| `PUT` | `/api/menu/:id` | Vendor / Admin | Update pizza item details |
| `DELETE` | `/api/menu/:id` | Vendor / Admin | Delete pizza item |
| `PATCH` | `/api/menu/:id/status` | Admin | Approve or reject submitted menu item |
| `POST` | `/api/orders` | Customer | Place order (prevents duplicate active orders) |
| `GET` | `/api/orders/customer/my-orders` | Customer | View customer order history |
| `PATCH` | `/api/orders/:id/cancel` | Customer | Cancel pending order |
| `GET` | `/api/orders/vendor/my-orders` | Vendor | View incoming customer orders |
| `PATCH` | `/api/orders/:id/status` | Vendor | Accept or reject order (only once) |
| `GET` | `/api/users/me` | Auth | Current user profile |
| `PUT` | `/api/users/profile` | Auth | Update name, image, business name, phone |
| `GET` | `/api/users` | Admin | List all registered users with search/filter |
| `PATCH` | `/api/users/:id/block` | Admin | Suspend / block user |
| `PATCH` | `/api/users/:id/unblock` | Admin | Unblock user |
| `GET` | `/api/dashboard/vendor` | Vendor | Vendor statistics and order counts |
| `GET` | `/api/dashboard/customer` | Customer | Customer orders statistics |
| `GET` | `/api/dashboard/admin` | Admin | Platform statistics, totals, and revenue |
| `POST` | `/api/payments/create-checkout-session` | Vendor | Create Stripe checkout session |
| `POST` | `/api/payments/webhook` | Stripe | Webhook handler with signature check |
| `GET` | `/api/payments/transactions` | Admin | Immutable read-only transaction ledger |
| `POST` | `/api/upload` | Auth | ImgBB image upload proxy |

---

## 🚀 Running Locally

```bash
cd pizzahub-server
npm install
npm run dev
```

Server runs on: `http://localhost:5000`
