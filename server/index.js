const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();
const winston = require("winston");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

function mapSession(row) {
  const rawDate = row?.sessiondate ?? row?.sessionDate;
  const date =
    rawDate instanceof Date
      ? rawDate.toISOString().split("T")[0]
      : String(rawDate ?? "");

  return {
    id: row.id,
    date,
    minutes: row.minutes,
    category: row.category,
    customLabel: row.customlabel ?? row.customLabel ?? "",
    note: row.note ?? "",
    time: row.sessiontime ?? row.sessionTime ?? "",
  };
}

// Log unhandled exceptions
process.on("uncaughtException", (err) => {
  logger.error("Unhandled Exception", { message: err.message, stack: err.stack });
});

// Log unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", { reason });
});

// Replace console.log and console.error with logger
console.log = (...args) => logger.info(args);
console.error = (...args) => logger.error(args);

app.get("/api/health", async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1"); // Verificar conexión
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const client = await pool.connect();
    const from = req.query.from || null;
    const to = req.query.to || null;

    let query =
      'SELECT "id", "sessionDate", "minutes", "category", "customLabel", "note", "sessionTime" FROM "StudySessions"';
    const params = [];

    if (from && to) {
      query += ' WHERE "sessionDate" BETWEEN $1 AND $2';
      params.push(from, to);
    } else if (from) {
      query += ' WHERE "sessionDate" >= $1';
      params.push(from);
    } else if (to) {
      query += ' WHERE "sessionDate" <= $1';
      params.push(to);
    }
    query += ' ORDER BY "sessionDate" DESC, "id" DESC';

    const result = await client.query(query, params);
    client.release();
    res.json(result.rows.map(mapSession));
  } catch (err) {
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.post("/api/sessions", async (req, res) => {
  try {
    const { sessionDate, minutes, category, customLabel, note, sessionTime } = req.body || {};
    if (!sessionDate || !minutes || !category) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO "StudySessions" ("sessionDate", "minutes", "category", "customLabel", "note", "sessionTime") ' +
        'VALUES ($1, $2, $3, $4, $5, $6) ' +
        'RETURNING "id", "sessionDate", "minutes", "category", "customLabel", "note", "sessionTime"',
      [sessionDate, minutes, category, customLabel || "", note || "", sessionTime || ""]
    );
    client.release();
    res.json(mapSession(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.delete("/api/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const client = await pool.connect();
    await client.query('DELETE FROM "StudySessions" WHERE "id" = $1', [id]);
    client.release();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.get("/api/goal", async (req, res) => {
  try {
    const client = await pool.connect();
    const key = String(process.env.GOAL_KEY || "goalMin");
    const result = await client.query('SELECT "value" FROM "AppSettings" WHERE "key" = $1', [key]);
    client.release();
    if (result.rows.length === 0) {
      return res.json({ goalMin: 120 });
    }

    const value = parseInt(result.rows[0].value, 10);
    res.json({ goalMin: Number.isNaN(value) ? 120 : value });
  } catch (err) {
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.put("/api/goal", async (req, res) => {
  try {
    const goalMin = parseInt(req.body?.goalMin, 10);
    if (Number.isNaN(goalMin) || goalMin <= 0) {
      return res.status(400).json({ error: "invalid_goal" });
    }

    const client = await pool.connect();
    const key = String(process.env.GOAL_KEY || "goalMin");
    await client.query(
      'INSERT INTO "AppSettings" ("key", "value") VALUES ($1, $2) ' +
        'ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value"',
      [key, String(goalMin)]
    );
    client.release();
    res.json({ goalMin });
  } catch (err) {
    res.status(500).json({ error: "db_error", details: err.message });
  }
});

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
