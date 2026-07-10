import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Helper to read database
async function readDb(): Promise<any> {
  const fs = await import("fs");
  const path = await import("path");
  const dbPath = path.resolve(process.cwd(), "local-db.json");
  try {
    if (!fs.existsSync(dbPath)) {
      return {
        products: [],
        categories: [],
        coupons: [],
        user_roles: [],
        profiles: [],
        orders: [],
        addresses: [],
        reviews: [],
        contact_queries: [],
        users: []
      };
    }
    const data = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read local database:", error);
    throw new Error("Local database read failure");
  }
}

// Helper to write database
async function writeDb(data: any): Promise<void> {
  const fs = await import("fs");
  const path = await import("path");
  const dbPath = path.resolve(process.cwd(), "local-db.json");
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write local database:", error);
    throw new Error("Local database write failure");
  }
}

// Helper to notify subscribers when a product is created
// Helper to send real emails via SMTP
async function sendSmtpEmail(to: string, subject: string, text: string): Promise<void> {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: `"Draupadi Atelier" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
      });
    } catch (err) {
      console.error(`Failed to send real email to ${to}:`, err);
    }
  }
}

// Database Triggers and Email Hooks
async function triggerDatabaseHooks(table: string, action: string, records: any[], db: any): Promise<void> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const logPath = path.resolve(process.cwd(), "email-logs.txt");
    const crypto = await import("crypto");

    if (table === "products" && action === "insert") {
      const subscribers = db.newsletter_subscribers || [];
      const subject = `New Launch: Heritage draping reimagined`;
      for (const prod of records) {
        const body = `We are thrilled to announce the launch of our newest creation: "${prod.name}".\n\nDiscover the fine weave here: http://localhost:8080/#new-arrivals\n\nWarm regards,\nDraupadi Atelier`;
        for (const sub of subscribers) {
          if (!sub.email) continue;
          const logLine = `[${new Date().toISOString()}] To: ${sub.email} | Subject: ${subject} | Body: ${body.replace(/\n/g, "  ")}\n`;
          fs.appendFileSync(logPath, logLine, "utf8");
          await sendSmtpEmail(sub.email, subject, body);
        }
      }
    }

    if (table === "returns" && action === "insert") {
      if (!db.notifications) db.notifications = [];
      for (const ret of records) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: "admin",
          title: "New Return Request",
          message: `Customer requested a return for Order #${ret.order_id.slice(0, 8)}: "${ret.product_name}". Reason: ${ret.reason}.`,
          type: "return_requested",
          read: false,
          created_at: new Date().toISOString()
        });

        const adminEmail = "draupadisaree.admin@gmail.com";
        const subject = `[Admin] New Return Request: Order #${ret.order_id.slice(0, 8)}`;
        const body = `Hello Admin,\n\nA new return request has been submitted for Order #${ret.order_id.slice(0, 8)}.\n\nProduct: ${ret.product_name}\nReason: ${ret.reason}\nComments: ${ret.comments || "None"}\n\nPlease review it in the Admin Dashboard: http://localhost:8080/admin/returns\n\nBest regards,\nDraupadi System`;
        
        const logLine = `[${new Date().toISOString()}] To: ${adminEmail} | Subject: ${subject} | Body: ${body.replace(/\n/g, "  ")}\n`;
        fs.appendFileSync(logPath, logLine, "utf8");
        await sendSmtpEmail(adminEmail, subject, body);
      }
      await writeDb(db);
    }

    if (table === "orders" && action === "insert") {
      if (!db.notifications) db.notifications = [];
      for (const order of records) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: "admin",
          title: "New Order Placed",
          message: `Customer placed order #${order.id.slice(0, 8)} for ₹${Number(order.total).toLocaleString("en-IN")}.`,
          type: "order_placed",
          read: false,
          created_at: new Date().toISOString()
        });
      }
      await writeDb(db);
    }

    if (table === "contact_queries" && action === "insert") {
      if (!db.notifications) db.notifications = [];
      for (const q of records) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: "admin",
          title: "New Query Received",
          message: `Message from ${q.name || q.email}: "${q.message.slice(0, 50)}..."`,
          type: "query_received",
          read: false,
          created_at: new Date().toISOString()
        });
      }
      await writeDb(db);
    }

    if (table === "reviews" && action === "insert") {
      if (!db.notifications) db.notifications = [];
      for (const r of records) {
        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: "admin",
          title: "New Review Added",
          message: `Rating: ${r.rating} stars for saree product.`,
          type: "review_added",
          read: false,
          created_at: new Date().toISOString()
        });
      }
      await writeDb(db);
    }

    if (table === "returns" && action === "update") {
      if (!db.notifications) db.notifications = [];
      for (const ret of records) {
        const order = (db.orders || []).find((o: any) => o.id === ret.order_id);
        const userId = ret.user_id || order?.user_id;
        if (!userId) continue;

        const user = (db.users || []).find((u: any) => u.id === userId);
        const email = user?.email;

        let title = "Return Status Updated";
        let message = `Your return request for "${ret.product_name}" (Order #${ret.order_id.slice(0, 8)}) is now ${ret.status.replace(/_/g, " ")}.`;
        let emailBody = `Dear Customer,\n\nThe status of your return request for "${ret.product_name}" (Order #${ret.order_id.slice(0, 8)}) has been updated to: ${ret.status.replace(/_/g, " ").toUpperCase()}.\n\n`;

        if (ret.status === "approved") {
          title = "Return Approved";
          message = `Good news! Your return request for "${ret.product_name}" has been approved.`;
          emailBody += `We have approved your request. We will schedule a courier pickup shortly.`;
        } else if (ret.status === "rejected") {
          title = "Return Declined";
          message = `Your return request for "${ret.product_name}" was declined. Reason: ${ret.rejection_reason || "Not specified"}`;
          emailBody += `Your request was declined.\nReason: ${ret.rejection_reason || "Not specified"}\n\nIf you have questions, please contact our support team.`;
        } else if (ret.status === "pickup_scheduled") {
          title = "Pickup Scheduled";
          message = `Pickup for your return has been scheduled. Courier details: ${ret.pickup_details || "Arriving soon"}.`;
          emailBody += `A courier pickup has been scheduled for your return.\nPickup Details: ${ret.pickup_details || "Arriving soon"}`;
        } else if (ret.status === "refund_completed") {
          title = "Refund Completed";
          message = `Refund completed for your returned saree "${ret.product_name}".`;
          emailBody += `Your refund has been successfully completed. The amount should reflect in your account shortly.`;
        }

        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: userId,
          title,
          message,
          type: "return_status_changed",
          read: false,
          created_at: new Date().toISOString()
        });

        if (email) {
          const subject = `Update: Return Request for Order #${ret.order_id.slice(0, 8)}`;
          const logLine = `[${new Date().toISOString()}] To: ${email} | Subject: ${subject} | Body: ${emailBody.replace(/\n/g, "  ")}\n`;
          fs.appendFileSync(logPath, logLine, "utf8");
          await sendSmtpEmail(email, subject, emailBody);
        }
      }
      await writeDb(db);
    }

    if (table === "orders" && action === "update") {
      if (!db.notifications) db.notifications = [];
      for (const order of records) {
        const userId = order.user_id;
        if (!userId) continue;
        const user = (db.users || []).find((u: any) => u.id === userId);
        const email = user?.email;

        const title = `Order Status: ${order.status.replace(/_/g, " ")}`;
        const message = `Your order #${order.id.slice(0, 8)} status is now ${order.status.replace(/_/g, " ")}.`;

        db.notifications.push({
          id: crypto.randomUUID(),
          user_id: userId,
          title,
          message,
          type: "order_status_changed",
          read: false,
          created_at: new Date().toISOString()
        });

        if (email) {
          const subject = `Order #${order.id.slice(0, 8)} Status Update`;
          const body = `Dear Customer,\n\nYour order #${order.id.slice(0, 8)} has been updated to: ${order.status.toUpperCase()}.\n\nEstimated Delivery: ${new Date(order.estimated_delivery).toLocaleDateString("en-IN")}\nTracking Number: ${order.tracking_number}\n\nThank you for shopping with us!`;
          const logLine = `[${new Date().toISOString()}] To: ${email} | Subject: ${subject} | Body: ${body.replace(/\n/g, "  ")}\n`;
          fs.appendFileSync(logPath, logLine, "utf8");
          await sendSmtpEmail(email, subject, body);
        }
      }
      await writeDb(db);
    }
  } catch (err) {
    console.error("Failed executing database triggers:", err);
  }
}


// Filter evaluation helper
function matchesFilters(row: any, filters: any[]): boolean {
  for (const filter of filters) {
    const { field, operator, value } = filter;
    let rowVal = row[field];
    if (typeof value === "boolean" && rowVal == null) {
      rowVal = false;
    }
    if (operator === 'eq') {
      if (rowVal !== value) return false;
    } else if (operator === 'neq') {
      if (rowVal === value) return false;
    } else if (operator === 'gt') {
      if (!(rowVal > value)) return false;
    } else if (operator === 'gte') {
      if (!(rowVal >= value)) return false;
    } else if (operator === 'lt') {
      if (!(rowVal < value)) return false;
    } else if (operator === 'lte') {
      if (!(rowVal <= value)) return false;
    } else if (operator === 'like' || operator === 'ilike') {
      const matchStr = String(value).replace(/%/g, '').toLowerCase();
      if (!String(rowVal ?? '').toLowerCase().includes(matchStr)) return false;
    } else if (operator === 'in') {
      if (!Array.isArray(value) || !value.includes(rowVal)) return false;
    } else if (operator === 'or') {
      const conditions = String(value).split(",");
      let matchedAny = false;
      for (const cond of conditions) {
        const parts = cond.split(".");
        const condField = parts[0];
        const condOp = parts[1];
        const condVal = parts[2];
        const rowVal = row[condField];
        if (condOp === 'eq') {
          if (String(rowVal) === String(condVal)) matchedAny = true;
        }
      }
      if (!matchedAny) return false;
    }
  }
  return true;
}

const QuerySchema = z.object({
  table: z.string(),
  action: z.enum(['select', 'insert', 'update', 'delete']),
  selectFields: z.string().optional(),
  selectOptions: z.any().optional(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any()
  })).optional(),
  orderConfig: z.object({
    field: z.string(),
    ascending: z.boolean()
  }).nullable().optional(),
  limitVal: z.number().nullable().optional(),
  singleVal: z.boolean().optional(),
  maybeSingleVal: z.boolean().optional(),
  insertData: z.any().optional(),
  updateData: z.any().optional()
});

export const executeLocalQuery = createServerFn({ method: "POST" })
  .validator(QuerySchema)
  .handler(async ({ data }) => {
    const db = await readDb();
    const table = data.table;
    if (!db[table]) {
      db[table] = [];
    }

    const collection = db[table];
    const filters = data.filters || [];

    if (data.action === "select") {
      if (table === "return_settings" && collection.length === 0) {
        const defaultSettings = {
          id: "default-settings",
          enable_returns: true,
          return_window: 3,
          reasons: ["Wrong Product", "Damaged Product", "Defective Product", "Quality Issue", "Wrong Size", "Other"],
          refund_method: "original_payment",
          auto_approval: false,
          eligible_categories: ["Silk", "Wedding", "Designer", "Cotton", "Festive"],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        collection.push(defaultSettings);
        await writeDb(db);
      }

      let results = collection.filter((row: any) => matchesFilters(row, filters));

      // Order
      if (data.orderConfig) {
        const { field, ascending } = data.orderConfig;
        results.sort((a: any, b: any) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === valB) return 0;
          if (valA == null) return 1;
          if (valB == null) return -1;
          const comparison = valA < valB ? -1 : 1;
          return ascending ? comparison : -comparison;
        });
      }

      // Limit
      if (data.limitVal !== undefined && data.limitVal !== null) {
        results = results.slice(0, data.limitVal);
      }

      const count = results.length;

      // Handle head: true option
      const selectOpts = data.selectOptions || {};
      if (selectOpts.head) {
        return { data: null, count, error: null };
      }

      if (data.singleVal) {
        if (results.length === 0) {
          return { data: null, error: { message: "No rows found" } };
        }
        return { data: results[0], count, error: null };
      }

      if (data.maybeSingleVal) {
        return { data: results.length > 0 ? results[0] : null, count, error: null };
      }

      return { data: results, count, error: null };
    }

    if (data.action === "insert") {
      const recordsToInsert = Array.isArray(data.insertData) ? data.insertData : [data.insertData];
      const inserted: any[] = [];
      const crypto = await import("crypto");

      for (const record of recordsToInsert) {
        const defaults: any = {};
        if (table === "products") {
          defaults.is_archived = false;
          defaults.is_featured = false;
          defaults.is_trending = false;
          defaults.is_new_arrival = false;
          defaults.is_bestseller = false;
          defaults.stock = 0;
          defaults.low_stock_threshold = 5;
          defaults.status = "active";
        }
        if (table === "orders") {
          defaults.status = "placed";
          defaults.invoice_no = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
          defaults.estimated_delivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
          defaults.delivery_partner = "Delhivery Luxe";
          defaults.tracking_number = `TRK${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        }
        if (table === "returns") {
          defaults.status = "requested";
          defaults.rejection_reason = null;
          defaults.pickup_details = null;
        }
        const newRecord = {
          id: record.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...defaults,
          ...record
        };
        collection.push(newRecord);
        inserted.push(newRecord);
      }

      await writeDb(db);
      await triggerDatabaseHooks(table, "insert", inserted, db);

      return { data: Array.isArray(data.insertData) ? inserted : inserted[0], error: null };
    }

    if (data.action === "update") {
      const updated: any[] = [];
      const updatePayload = data.updateData || {};

      for (let i = 0; i < collection.length; i++) {
        if (matchesFilters(collection[i], filters)) {
          collection[i] = {
            ...collection[i],
            ...updatePayload,
            updated_at: new Date().toISOString()
          };
          updated.push(collection[i]);
        }
      }

      await writeDb(db);
      await triggerDatabaseHooks(table, "update", updated, db);
      return { data: data.singleVal || data.maybeSingleVal ? (updated[0] || null) : updated, error: null };
    }

    if (data.action === "delete") {
      const remaining: any[] = [];
      const deleted: any[] = [];

      for (const row of collection) {
        if (matchesFilters(row, filters)) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      }

      db[table] = remaining;
      await writeDb(db);
      return { data: deleted, error: null };
    }

    return { data: null, error: { message: "Unsupported local DB action" } };
  });

export const localDbAuthSignIn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDb();
    const user = (db.users || []).find((u: any) => u.email === data.email && u.password === data.password);
    if (!user) {
      return { data: { user: null, session: null }, error: { message: "Invalid email or password" } };
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.raw_user_meta_data || {}
    };

    const tokenPayload = { sub: user.id, email: user.email };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    return {
      data: {
        user: sessionUser,
        session: {
          access_token: token,
          user: sessionUser,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
      },
      error: null
    };
  });

export const localDbAuthSignUp = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string(),
    password: z.string(),
    fullName: z.string(),
    phone: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const db = await readDb();
    if (!db.users) db.users = [];
    if (!db.profiles) db.profiles = [];
    if (!db.user_roles) db.user_roles = [];

    const exists = db.users.some((u: any) => u.email === data.email);
    if (exists) {
      return { data: { user: null, session: null }, error: { message: "User already exists" } };
    }

    const crypto = await import("crypto");
    const userId = crypto.randomUUID();
    const newUser = {
      id: userId,
      email: data.email,
      password: data.password,
      email_confirmed_at: new Date().toISOString(),
      raw_user_meta_data: {
        full_name: data.fullName,
        phone: data.phone || null
      }
    };
    db.users.push(newUser);

    const newProfile = {
      id: userId,
      full_name: data.fullName,
      phone: data.phone || null,
      email: data.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.profiles.push(newProfile);

    const newRole = {
      id: crypto.randomUUID(),
      user_id: userId,
      role: "customer",
      created_at: new Date().toISOString()
    };
    db.user_roles.push(newRole);

    await writeDb(db);

    const sessionUser = {
      id: userId,
      email: data.email,
      user_metadata: newUser.raw_user_meta_data
    };

    const tokenPayload = { sub: userId, email: data.email };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

    return {
      data: {
        user: sessionUser,
        session: {
          access_token: token,
          user: sessionUser,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        }
      },
      error: null
    };
  });

export const localDbAuthUpdateUser = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const db = await readDb();
    const userIndex = (db.users || []).findIndex((u: any) => u.id === data.userId);
    if (userIndex === -1) {
      return { data: null, error: { message: "User not found" } };
    }

    db.users[userIndex].password = data.password;
    await writeDb(db);

    return { data: { user: { id: data.userId } }, error: null };
  });

export const localDbAuthDeleteUser = createServerFn({ method: "POST" })
  .validator(z.string())
  .handler(async ({ data: userId }) => {
    const db = await readDb();
    
    db.users = (db.users || []).filter((u: any) => u.id !== userId);
    db.profiles = (db.profiles || []).filter((p: any) => p.id !== userId);
    db.user_roles = (db.user_roles || []).filter((r: any) => r.user_id !== userId);

    await writeDb(db);
    return { success: true };
  });

export const uploadLocalFile = createServerFn({ method: "POST" })
  .validator(z.object({ filename: z.string(), base64: z.string() }))
  .handler(async ({ data }) => {
    const fs = await import("fs");
    const path = await import("path");
    const publicDir = path.resolve(process.cwd(), "public");
    const uploadsDir = path.resolve(publicDir, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const buffer = Buffer.from(data.base64.split(",")[1] || data.base64, "base64");
    const filePath = path.resolve(uploadsDir, data.filename);
    fs.writeFileSync(filePath, buffer);
    return { data: { success: true }, error: null };
  });
