# DRAUPADI — Heritage Sarees Reimagined

An ultra-premium, full-featured e-commerce platform dedicated to showcasing and selling timeless silk, bridal, and designer sarees. Designed with rich animations, a premium aesthetic, and a robust admin management suite.

---

## 📖 Project Overview

**DRAUPADI** is a modern e-commerce storefront designed for a luxury saree boutique. The application combines visual storytelling (showcasing artisan craftsmanship and heritage weaves) with a seamless, conversion-focused user journey. It features a fully responsive, highly interactive customer portal and a comprehensive administrative command center to manage products, orders, returns, and support.

---

## ⚡ Tech Stack

- **Frontend Core**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Routing & SSR**: [TanStack Start](https://tanstack.com/router/latest/docs/start/overview) (with file-based routing via `TanStack Router` & data fetching via `TanStack Query`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS with tailored design tokens, HSL custom color palettes, and glassmorphic UI elements
- **UI Components**: [Radix UI](https://www.radix-ui.com/) Primitives & [Lucide React](https://lucide.dev/) Icons
- **Backend & Database**: [Supabase](https://supabase.com/) (Authentication, Database, Client-side integration)
- **Local Fallback**: Built-in JSON-based local database fallback (`local-db.json`) for seamless offline or database-free operation

---

## 🌟 Key Features

### 🛍️ Customer Experience
- **Elegant Storefront**: Luxury design featuring high-quality visuals, reveal-on-scroll animations, interactive testimonial carousels, and saree care advice.
- **Product Discovery**: Dynamic product search, taxonomy/category navigation, and wishlist functionality.
- **Unified Cart & Checkout**: Multi-step checkout flow including contact details, coupon codes, address info, mock payment processing, and error handling.
- **Order Tracking**: Detailed purchase history page tracking payment status, dispatch stages, and real-time delivery timelines.
- **Interactive Queries & Reviews**: Customers can submit queries to the boutique atelier and leave detailed product reviews.
- **Notifications Hub**: In-app user notifications showing real-time updates on orders and support tickets.

### 🛡️ Admin Suite (`/admin`)
- **Analytics Dashboard**: Visual charts for sales metrics, conversion rates, customer registration, and top-selling products.
- **Product Catalog Management**: Create, view, edit details (price, offer price, discount percentage, tags), and archive products.
- **Order Fullfillment**: Track order statuses, update shipping steps (processing, dispatched, out for delivery, delivered), and send notifications.
- **Return Request Center**: Process return requests with options to approve or decline with reasons.
- **Customer CRM**: Maintain user directories and detailed client logs.
- **Coupons Manager**: Create and toggle discount coupons.
- **Customer Queries**: Review incoming support tickets and reply directly to customer concerns.
- **Product Reviews Moderation**: Approve or flag product ratings and feedback.

---

## 📂 Project Structure

```bash
├── .tanstack/             # TanStack router config
├── public/                # Static public assets (logos, placeholders)
├── src/
│   ├── assets/            # Local images, banners, and logos
│   ├── components/        # Reusable UI component library (shadcn/radix)
│   ├── hooks/             # Custom React hooks (e.g. auth hooks)
│   ├── integrations/      # API Clients (Supabase connector & Local database adapters)
│   │   └── supabase/      # Supabase client declarations, types, and fallback functions
│   ├── lib/               # Utility functions, helpers, and state storage (cart)
│   ├── routes/            # File-based router configurations (TanStack Router)
│   │   ├── admin/         # Admin sub-routes (analytics, orders, products, etc.)
│   │   ├── index.tsx      # Customer homepage
│   │   ├── auth.tsx       # Auth portal
│   │   ├── checkout.tsx   # Checkout pipeline
│   │   └── orders.tsx     # Order tracing dashboard
│   ├── router.tsx         # Router configuration root
│   ├── server.ts          # Server-side setup & entrypoints
│   ├── start.ts           # App startup logic
│   └── styles.css         # Styling system & Tailwind integrations
├── supabase/              # Local Supabase configurations & DB migrations
├── local-db.json          # Mock local database for offline fallback
├── package.json           # Node configuration and script runners
├── tsconfig.json          # TypeScript workspace configuration
└── vite.config.ts         # Vite bundler options
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js installed. We recommend using **Bun** or **npm**.

### 1. Install Dependencies
```bash
npm install
# or
bun install
```

### 2. Configure Environment Variables
Copy `.env.example` or create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

*Note: If no Supabase environment variables are provided, the application will automatically fallback to the local JSON database storage configuration (`local-db.json`).*

### 3. Run the Development Server
```bash
npm run dev
# or
bun run dev
```
Open `http://localhost:3000` (or the port specified by Vite) in your browser.

### 4. Build for Production
```bash
npm run build
# or
bun run build
```
This compiles the application and outputs optimized assets into the `dist` directory.
