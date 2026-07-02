const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const STORAGE_MODE = DATABASE_URL ? "postgres" : "file";
let pool = null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function normalizeText(value) {
  return String(value || "").trim();
}

function createBookingPayload(body) {
  return {
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name: normalizeText(body.name),
    phone: normalizeText(body.phone),
    email: normalizeText(body.email),
    eventType: normalizeText(body.eventType),
    eventDate: normalizeText(body.eventDate),
    location: normalizeText(body.location),
    budget: normalizeText(body.budget),
    message: normalizeText(body.message),
    source: "website"
  };
}

function validateBooking(booking) {
  const requiredFields = ["name", "phone", "eventType", "eventDate", "location"];
  const missingFields = requiredFields.filter((field) => !booking[field]);

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(", ")}`;
  }

  return null;
}

async function ensureBookingsFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(BOOKINGS_FILE);
  } catch {
    await fs.writeFile(BOOKINGS_FILE, "[]\n", "utf8");
  }
}

function createPool() {
  if (!DATABASE_URL) {
    return null;
  }

  return new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
  });
}

async function ensureBookingsTable() {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      location TEXT NOT NULL,
      budget TEXT,
      message TEXT,
      source TEXT NOT NULL
    )
  `);
}

function mapRowToBooking(row) {
  return {
    id: row.id,
    createdAt: new Date(row.created_at).toISOString(),
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    eventType: row.event_type,
    eventDate: row.event_date,
    location: row.location,
    budget: row.budget || "",
    message: row.message || "",
    source: row.source
  };
}

async function readBookings() {
  if (pool) {
    const result = await pool.query(`
      SELECT
        id,
        created_at,
        name,
        phone,
        email,
        event_type,
        event_date,
        location,
        budget,
        message,
        source
      FROM bookings
      ORDER BY created_at DESC
    `);
    return result.rows.map(mapRowToBooking);
  }

  await ensureBookingsFile();
  const raw = await fs.readFile(BOOKINGS_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeBookings(bookings) {
  await ensureBookingsFile();
  await fs.writeFile(BOOKINGS_FILE, `${JSON.stringify(bookings, null, 2)}\n`, "utf8");
}

async function saveBooking(booking) {
  if (pool) {
    await pool.query(
      `
        INSERT INTO bookings (
          id,
          created_at,
          name,
          phone,
          email,
          event_type,
          event_date,
          location,
          budget,
          message,
          source
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
      [
        booking.id,
        booking.createdAt,
        booking.name,
        booking.phone,
        booking.email || null,
        booking.eventType,
        booking.eventDate,
        booking.location,
        booking.budget || null,
        booking.message || null,
        booking.source
      ]
    );
    return;
  }

  const bookings = await readBookings();
  bookings.unshift(booking);
  await writeBookings(bookings);
}

function buildEmailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendBookingEmail(booking) {
  const bookingToEmail = process.env.BOOKING_TO_EMAIL;
  const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = buildEmailTransport();

  if (!bookingToEmail || !smtpFrom || !transporter) {
    return { sent: false, reason: "Email is not configured." };
  }

  const lines = [
    `New booking inquiry received from the website.`,
    "",
    `Booking ID: ${booking.id}`,
    `Created At: ${booking.createdAt}`,
    `Name: ${booking.name}`,
    `Phone: ${booking.phone}`,
    `Email: ${booking.email || "Not provided"}`,
    `Event Type: ${booking.eventType}`,
    `Event Date: ${booking.eventDate}`,
    `Location: ${booking.location}`,
    `Budget: ${booking.budget || "Not provided"}`,
    "",
    "Message:",
    booking.message || "No extra details"
  ];

  await transporter.sendMail({
    from: smtpFrom,
    to: bookingToEmail,
    replyTo: booking.email || undefined,
    subject: `New Booking Inquiry - ${booking.name} - ${booking.eventType}`,
    text: lines.join("\n")
  });

  return { sent: true };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "roopa-studio-backend",
    storage: STORAGE_MODE,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/bookings", async (req, res) => {
  try {
    const booking = createBookingPayload(req.body);
    const validationError = validateBooking(booking);

    if (validationError) {
      return res.status(400).json({
        ok: false,
        message: validationError
      });
    }

    await saveBooking(booking);

    let emailStatus = { sent: false, reason: "Email not attempted." };

    try {
      emailStatus = await sendBookingEmail(booking);
    } catch (emailError) {
      emailStatus = {
        sent: false,
        reason: emailError.message
      };
    }

    res.status(201).json({
      ok: true,
      message: "Booking inquiry saved successfully.",
      booking,
      emailStatus
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to save booking inquiry.",
      error: error.message
    });
  }
});

app.get("/api/bookings", async (req, res) => {
  try {
    if (!ADMIN_API_KEY || req.query.key !== ADMIN_API_KEY) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized."
      });
    }

    const bookings = await readBookings();
    res.json({
      ok: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to read bookings.",
      error: error.message
    });
  }
});

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("*", (req, res, next) => {
  if (path.extname(req.path)) {
    return next();
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

Promise.resolve()
  .then(() => {
    pool = createPool();
    return pool ? ensureBookingsTable() : ensureBookingsFile();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Roopa Studio app running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize bookings storage:", error);
    process.exit(1);
  });
