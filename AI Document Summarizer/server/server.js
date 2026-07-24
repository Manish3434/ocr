require("dotenv").config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const cors = require("cors");
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo').default;

process.on('uncaughtException', (err) => {
  console.error('⚠️ Process Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Process Unhandled Rejection:', err);
});

const summarizeRoutes = require("./routes/summarizeRoutes");
const historyRoutes = require("./routes/historyRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const pptRoutes = require("./routes/pptRoutes");
const tableRoutes = require("./routes/tableRoutes");
const adminRoutes = require("./routes/adminRoutes");
require('./models/Payment');
const billingRoutes = require("./routes/billingRoutes");

const chatRoutes = require('./routes/chatRoutes');   // adjust path if needed


// ── NEW: Usage dashboard routes ───────────────────────────────────────────────
const usageRoutes = require("./routes/usageRoutes");

require("./config/passport");

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV || "development";

const User = require('./models/User');

// Seed Default User Account
const seedDefaultUser = async () => {
  try {
    const defaultEmail = "maneeskumar3434@gmail.com";
    const existing = await User.findOne({ email: defaultEmail });
    if (!existing) {
      const bcrypt = require('bcryptjs');
      const hashed = await bcrypt.hash("Password123!", 10);
      await User.create({
        name: "Manish",
        email: defaultEmail,
        password: hashed,
        role: "admin",
        plan: "enterprise"
      });
      console.log('✅ Auto-created default admin user: maneeskumar3434@gmail.com / Password123!');
    }
  } catch (err) {
    console.error('User seed notice:', err.message);
  }
};

// Disable query buffering so endpoints fail fast or return 503 instead of hanging for 10,000ms
mongoose.set('bufferCommands', false);

// MongoDB Connection with Auto-Fallback for AWS DocumentDB & Atlas Cloud
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || "";
  const isDocDB  = mongoUri.includes("docdb.amazonaws.com");
  const useTls   = isDocDB ? process.env.MONGO_TLS !== "false" : process.env.MONGO_TLS === "true";

  const primaryOpts = {
    serverSelectionTimeoutMS: 4000,
    connectTimeoutMS: 4000,
    socketTimeoutMS: 45000,
    family: 4,
    tls: useTls,
    tlsAllowInvalidCertificates: true,
  };

  // Attempt 1: Primary URI with configured options
  try {
    await mongoose.connect(mongoUri, primaryOpts);
    console.log('✅ MongoDB connected successfully');
    await seedDefaultUser();
    return;
  } catch (err) {
    console.error('❌ Primary MongoDB connection attempt failed:', err.message);
  }

  // Attempt 2: DocumentDB Direct Connection mode
  try {
    console.log('🔄 Attempting DocumentDB directConnection fallback mode...');
    const fallbackOpts = {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
      socketTimeoutMS: 45000,
      family: 4,
      tls: true,
      tlsAllowInvalidCertificates: true,
      directConnection: true
    };
    await mongoose.connect(mongoUri, fallbackOpts);
    console.log('✅ MongoDB connected successfully (DocumentDB directConnection mode)');
    await seedDefaultUser();
    return;
  } catch (err2) {
    console.error('❌ DocumentDB directConnection mode failed:', err2.message);
  }

  // Attempt 3: Atlas Cloud MongoDB Fallback
  const fallbackUri = process.env.MONGO_URI_FALLBACK;
  if (fallbackUri) {
    try {
      console.log('🔄 Attempting Atlas Cloud MongoDB fallback connection...');
      await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });
      console.log('✅ MongoDB connected successfully (Atlas Cloud fallback mode)');
      await seedDefaultUser();
      return;
    } catch (err3) {
      console.error('❌ Atlas Cloud MongoDB fallback failed:', err3.message);
    }
  }

  console.error('Retrying MongoDB connection in 5 seconds...');
  setTimeout(connectDB, 5000);
};

connectDB();

// ── Guard Middleware: Return 503 if DB is connecting instead of crashing ──
app.use((req, res, next) => {
  if (req.path === '/api/health' || req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is being established. Please retry in a few seconds.'
    });
  }
  next();
});

app.set('trust proxy', 1);

// CORS Configuration
const buildAllowedOrigins = () => {
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://localhost:5174"];
  }
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  }
  return [process.env.FRONTEND_URL].filter(Boolean);
};
const ALLOWED_ORIGINS = buildAllowedOrigins();

const corsOptions = {
  origin: true, // Dynamically reflect request origin for 100% CORS & cookie session compatibility
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Disposition", "X-Presentation-Id", "X-Slide-Count"],
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));   // Express 5-compatible preflight

app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";
  const status   = dbState === 1 ? "ok" : "starting";

  res.status(200).json({
    status,
    db: dbStatus,
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString(),
  });
});

const isSecureCookie = process.env.COOKIE_SECURE === "true";

const sessionMongoUri = process.env.MONGO_URI_FALLBACK || process.env.MONGO_URI || "mongodb://localhost:27017/ai-document-summarizer";

app.use(session({
    secret: process.env.SESSION_SECRET || "a-very-long-random-string",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: sessionMongoUri,
      mongoOptions: {
        family: 4,
        tls: true,
        tlsAllowInvalidCertificates: true,
        serverSelectionTimeoutMS: 5000,
      },
      ttl: 7 * 24 * 60 * 60, // 7 days
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      secure: isSecureCookie,
      httpOnly: true,
      sameSite: isSecureCookie ? "none" : "lax"
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api", summarizeRoutes);
app.use("/api/ppt", pptRoutes);
app.use('/auth', settingsRoutes);
app.use("/api", tableRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/billing", billingRoutes);
app.use('/api/chat', chatRoutes);
// ── NEW: mount usage dashboard ────────────────────────────────────────────────
app.use("/api/usage", usageRoutes);

const { router: progressRoutes } = require("./routes/progressRoutes");
app.use("/api", progressRoutes);

const bankingRoutes = require('./routes/bankingRoutes');
app.use('/api/banking', bankingRoutes);

app.get("/auth/status", (req, res) => {
    if (req.isAuthenticated()) {
        res.status(200).json({ user: req.user });
    } else {
        res.status(401).json({ message: "Unauthorized" });
    }
});

app.get("/", (req, res) => res.send("Backend is Running!"));

app.get("/auth/google", (req, res, next) => {
    if (!passport._strategies || !passport._strategies.google) {
        return res.status(503).json({ message: "Google OAuth is not configured on this server." });
    }
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })(req, res, next);
});

app.get("/auth/google/callback", (req, res, next) => {
    if (!passport._strategies || !passport._strategies.google) {
        return res.redirect(`${FRONTEND_URL}/login?error=oauth_unconfigured`);
    }
    passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/login` })(req, res, (err) => {
        if (err) return next(err);
        res.redirect(`${FRONTEND_URL}/?googleAuth=success`);
    });
});


// NOTE: /auth/logout is handled as POST by authRoutes.js — no GET handler needed here.

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT} (${NODE_ENV} mode)`);

    // ── Keep-alive ping (prevents Render free tier from sleeping) ──────────
    const SERVER_URL = process.env.SERVER_URL || process.env.BACKEND_URL;
    if (SERVER_URL && NODE_ENV === 'production') {
        const https = require('https');
        const http  = require('http');
        setInterval(() => {
            const url = `${SERVER_URL}/api/health`;
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                console.log(`[keepalive] ping → ${url} (${res.statusCode})`);
            }).on('error', (err) => {
                console.warn('[keepalive] ping failed:', err.message);
            });
        }, 14 * 60 * 1000); // every 14 minutes
        console.log(`[keepalive] Self-ping enabled → ${SERVER_URL}/api/health every 14 min`);
    }
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    if (err && err.name === "MulterError") {
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? "File is too large. Maximum allowed size is 10 MB."
                : `Upload error: ${err.message}`;
        return res.status(400).json({ success: false, message });
    }

    if (err) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again.",
        });
    }

    next();
});