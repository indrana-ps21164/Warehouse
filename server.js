require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcrypt");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const User = require("./models/User");

const app = express();

const PORT = process.env.PORT || 5000;

/**
 * Ensures there is at least one ADMIN account for first-time system setup.
 */
async function ensureInitialAdmin() {
  const adminCount = await User.countDocuments({ role: "ADMIN" });
  if (adminCount > 0) return;

  const adminName = process.env.INIT_ADMIN_NAME || "System Admin";
  const adminEmail = (process.env.INIT_ADMIN_EMAIL || "admin@example.com").toLowerCase().trim();
  const adminPassword = process.env.INIT_ADMIN_PASSWORD || "Admin@123";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await User.create({
    name: adminName,
    email: adminEmail,
    password: hashedPassword,
    role: "ADMIN",
  });

  console.log(`Initial ADMIN created: ${adminEmail}`);
}

// Parses incoming JSON and form payloads.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enables cross-origin requests with cookies for future frontend apps.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Configures session-based authentication (no JWT).
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// Registers API route modules.
app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/transactions", transactionRoutes);

/**
 * Lightweight health endpoint for service checks.
 */
app.get("/api/health", (req, res) => {
  return res.status(200).json({ message: "Warehouse backend is running." });
});

connectDB()
  .then(() => {
    return ensureInitialAdmin();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
