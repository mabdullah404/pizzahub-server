# 🍕 PizzaHub — Backend REST API Server

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21.2-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Native_Driver-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=json-web-tokens)](https://jwt.io/)
[![Stripe](https://img.shields.io/badge/Stripe_SDK-v17-6772E5?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

**PizzaHub Server** is the high-performance, modular Node.js & Express REST API powering the PizzaHub platform. It implements secure role-based access control, real-time pizza catalog filtering, order dispatch workflows, ImgBB media uploads, and automated Stripe billing.

---

## 🌐 Live Endpoints & Repositories

| Service | Target URL |
|---|---|
| **Live REST API Base** | [https://pizzahub-server-mu.vercel.app](https://pizzahub-server-mu.vercel.app) |
| **Health Check Endpoint** | [https://pizzahub-server-mu.vercel.app/api/health](https://pizzahub-server-mu.vercel.app/api/health) |
| **Live Client Frontend** | [https://pizzahub-client-tan.vercel.app](https://pizzahub-client-tan.vercel.app) |
| **Server GitHub Repository** | [https://github.com/mabdullah404/pizzahub-server](https://github.com/mabdullah404/pizzahub-server) |
| **Client GitHub Repository** | [https://github.com/mabdullah404/pizzahub-client](https://github.com/mabdullah404/pizzahub-client) |

---

## 🏗️ Architecture & Security Model

```
       Incoming HTTP Request
                 │
                 ▼
       ┌───────────────────┐
       │   CORS & Helmet   │  <-- Allowed client origin with credentials
       └─────────┬─────────┘
                 │
                 ▼
       ┌───────────────────┐
       │   verifyToken()   │  <-- Validates Bearer JWT / Better Auth Session
       └─────────┬─────────┘
                 │
                 ▼
       ┌───────────────────┐
       │   requireRole()   │  <-- Role Check: 'admin' | 'vendor' | 'customer'
       └─────────┬─────────┘
                 │
                 ▼
       ┌───────────────────┐
       │ verifyOwnership() │  <-- Vendor can only modify own items / orders
       └─────────┬─────────┘
                 │
                 ▼
       ┌───────────────────┐
       │ Route Controller  │  <-- Business logic & MongoDB Atlas operations
       └───────────────────┘
```

### Security Principles Enforced:
1. **Zero Client Trust**: All user identities, emails, and roles are extracted strictly from cryptographically verified tokens, never from request bodies.
2. **Suspended Account Interception**: Blocked accounts (`isBlocked: true` or `banned: true`) are halted immediately with `403 Forbidden`.
3. **Immutable Decisions**: Orders and menu item approvals cannot be mutated once decided.
4. **CORS Isolation**: Secure configuration accepting only whitelisted client origins (`CLIENT_URL` / Vercel domain).

---

## 🗄️ Database Collections (MongoDB Atlas)

The server utilizes four core collections within MongoDB:

| Collection | Key Fields & Constraints | Description |
|---|---|---|
| `users` | `name`, `email`, `role`, `isBlocked`, `businessName`, `subscriptionPlan`, `subscriptionExpiresAt` | User identities, roles, and vendor subscription states. |
| `menuItems` | `vendorId`, `itemName`, `category`, `description`, `price`, `location`, `images[]`, `status` | Pizza catalog entries with status (`pending`, `approved`, `rejected`, `inactive`). |
| `orders` | `itemId`, `vendorId`, `customerId`, `deliveryDate`, `deliveryAddress`, `message`, `status` | Customer food orders with states (`pending`, `accepted`, `rejected`, `cancelled`). |
| `transactions` | `vendorId`, `plan`, `amount`, `currency`, `stripeSessionId`, `status`, `createdAt` | Immutable financial ledger for Stripe subscription events. |

**Allowed Categories:**
- `Classic Pizzas`
- `Vegetarian Pizzas`
- `Meat Lovers`
- `Specialty / Gourmet Pizzas`
- `Sides & Appetizers`
- `Beverages & Desserts`

---

## 💳 Stripe Monetization Architecture

The backend supports subscription upgrades for vendors from **Free Plan** (max 3 active items) to **Premium Pizzeria** ($29/month, unlimited items):

1. **Checkout Initialization (`POST /api/payments/create-checkout-session`)**:
   - Creates a Stripe checkout session dynamically configuring the `clientUrl`.
   - Sets `success_url` directly to `${clientUrl}/dashboard/vendor/subscription?session_id={CHECKOUT_SESSION_ID}&payment=success`.
   - Sets `cancel_url` directly to `${clientUrl}/dashboard/vendor/subscription?payment=cancelled`.
2. **Signature Verified Webhook (`POST /api/payments/webhook`)**:
   - Reads raw request body and verifies cryptographic signature against `STRIPE_WEBHOOK_SECRET`.
   - Prevents replay attacks and double crediting via idempotent transaction checks (`stripeSessionId`).
   - Updates vendor document to `subscriptionPlan: 'premium'` with an expiration date set 30 days ahead.
3. **Session Confirmation Fallback (`POST /api/payments/confirm`)**:
   - Allows instant client verification upon redirect completion.

---

## 📡 REST API Reference

### Public & Health Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Root welcome message |
| `GET` | `/api/health` | Public | Health check endpoint for uptime and monitoring |
| `GET` | `/api/menu` | Public | Browse approved pizzas with `search`, `category`, `location`, `sort` |
| `GET` | `/api/menu/:id` | Public | Retrieve single pizza details by ID |

### Menu Management (Vendor & Admin)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/menu` | Vendor | Create pizza (Enforces Free tier 3-item limit) |
| `GET` | `/api/menu/vendor/my-items` | Vendor | Retrieve vendor's own menu listings |
| `PUT` | `/api/menu/:id` | Vendor / Admin | Update pizza item details (Ownership verified) |
| `DELETE` | `/api/menu/:id` | Vendor / Admin | Delete pizza item (Ownership verified) |
| `GET` | `/api/menu/admin/all-items` | Admin | Retrieve all items including pending and rejected |
| `PATCH` | `/api/menu/:id/status` | Admin | Approve or reject submitted menu item |

### Orders & Dispatch (Customer & Vendor)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer | Place order (Prevents duplicate same-day orders) |
| `GET` | `/api/orders/customer/my-orders` | Customer | Customer order history with status |
| `PATCH` | `/api/orders/:id/cancel` | Customer | Cancel a pending order |
| `GET` | `/api/orders/vendor/my-orders` | Vendor | Incoming customer orders for vendor |
| `PATCH` | `/api/orders/:id/status` | Vendor | Accept or reject order (Irreversible decision) |

### User Management & Profile
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | Authenticated | Retrieve current user profile and role |
| `PUT` | `/api/users/profile` | Authenticated | Update allowed profile fields |
| `GET` | `/api/users` | Admin | Search and list all registered users |
| `PATCH` | `/api/users/:id/block` | Admin | Suspend / block user account |
| `PATCH` | `/api/users/:id/unblock` | Admin | Restore / unblock user account |

### Analytics & Reports
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/vendor` | Vendor | Vendor order counts, active items, and revenue |
| `GET` | `/api/dashboard/customer` | Customer | Customer order metrics |
| `GET` | `/api/dashboard/admin` | Admin | Platform-wide totals and gross subscription volume |

### Payments & Media
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/payments/create-checkout-session` | Vendor | Create Stripe checkout session |
| `POST` | `/api/payments/webhook` | Stripe | Webhook handler with signature verification |
| `POST` | `/api/payments/confirm` | Vendor | Confirm session on return to dashboard |
| `GET` | `/api/payments/transactions` | Admin | Immutable read-only transaction audit log |
| `POST` | `/api/upload` | Authenticated | Proxy image upload to ImgBB CDN |

---

## ⚙️ Environment Configuration

Create a `.env` file in the `pizzahub-server/` directory using `.env.example` as a template:

```bash
cp .env.example .env
```

### Environment Variables Template

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string_here
MONGODB_URL=your_mongodb_atlas_connection_string_here
DB_NAME=pizzaHubDB
CLIENT_URL=http://localhost:3000

# Better Auth Secret (Shared with Next.js client)
BETTER_AUTH_SECRET=your_better_auth_secret_here
BETTER_AUTH_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret_here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# ImgBB API Key for Image Uploads
IMGBB_API_KEY=your_imgbb_api_key_here

# Administrative Seeding (Idempotent)
ADMIN_EMAIL=your_admin_email_here
ADMIN_PASSWORD=your_admin_secure_password_here

# Stripe Integration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here
```

> **Security Assurance:** Never commit actual `.env` files or credentials into the repository. All secrets must be securely configured inside your local environment or host dashboard (e.g., Vercel Environment Variables).

---

## 🚀 Local Installation & Running

### Prerequisites
- Node.js (v18.0.0 or higher)
- MongoDB Atlas cluster or local MongoDB instance

### 1. Install Dependencies
```bash
git clone https://github.com/mabdullah404/pizzahub-server.git
cd pizzahub-server
npm install
```

### 2. Configure Environment
Create `.env` using the template provided above.

### 3. Seed Platform Data (Optional)
```bash
# Seed initial admin account idempotently
node utils/seedAdmin.js
```

### 4. Run Test Suite
```bash
npm test
```
*Executes all 11 unit and integration security tests verifying token decoding, role gating, ownership protection, and tier limits.*

### 5. Start Server
```bash
# Development mode with live reload
npm run dev

# Production mode
npm start
```

Server will start on: `http://localhost:5000`

---

## 📄 License

This project is licensed under the **MIT License**.
