import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import rateLimit from 'express-rate-limit';

import { initSchema } from "./backend/schema.js";
import { seedDemoData } from "./backend/utils/seed.js";
import authRoutes from "./backend/routes/authRoutes.js";
import mainRoutes from "./backend/routes/mainRoutes.js";
import adminRoutes from "./backend/routes/adminRoutes.js";
import superAdminRoutes from "./backend/routes/superAdminRoutes.js";
import vendorRoutes from "./backend/routes/vendorRoutes.js";

dotenv.config();

async function startServer() {
  // Initialize DB Schema
  if (process.env.DATABASE_URL) {
    try {
      await initSchema();
      await seedDemoData();
    } catch (e) {
      console.error("Database initialization failed:", e);
    }
  }
  const app = express();
  const PORT = 3000;

  app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, please try again later.' }
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { message: 'Too many OTP requests, please wait before trying again.' }
});

app.use('/api/', limiter);
app.use('/api/v1/auth/request-otp', otpLimiter);

  // API v1 Routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/super-admin", superAdminRoutes);
  app.use("/api/v1/vendor", vendorRoutes);
  app.use("/api/v1", mainRoutes);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "LunchOS API" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
