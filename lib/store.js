// Postgres-backed storage (Supabase or any Postgres works). Unlike the
// filesystem on most free hosting tiers, this survives redeploys and
// restarts. Every route file only imports from this module, never runs
// SQL directly, so this is the only file that talks to the database.

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set - see README's Persistence section for how to configure it"
  );
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

let initPromise = null;
function init() {
  if (!initPromise) {
    initPromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS visitors (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT NOT NULL,
          ip TEXT,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `)
      .then(() =>
        pool.query(`
          CREATE TABLE IF NOT EXISTS attempts (
            id SERIAL PRIMARY KEY,
            visitor_id INTEGER NOT NULL REFERENCES visitors(id),
            visitor_name TEXT NOT NULL,
            paper_id TEXT NOT NULL,
            paper_title TEXT NOT NULL,
            result JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `)
      );
  }
  return initPromise;
}

function mapVisitor(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
  };
}

function mapAttempt(row) {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    visitorId: row.visitor_id,
    visitorName: row.visitor_name,
    paperId: row.paper_id,
    paperTitle: row.paper_title,
    result: row.result,
  };
}

// ---------- Visitors ----------

async function createVisitor({ name, location, ip, userAgent }) {
  await init();
  const { rows } = await pool.query(
    `INSERT INTO visitors (name, location, ip, user_agent)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [String(name).slice(0, 100), String(location).slice(0, 150), ip, userAgent]
  );
  return mapVisitor(rows[0]);
}

async function touchVisitor(id) {
  await init();
  const { rows } = await pool.query(
    `UPDATE visitors SET last_seen_at = now() WHERE id = $1 RETURNING *`,
    [Number(id)]
  );
  return rows[0] ? mapVisitor(rows[0]) : null;
}

async function getVisitor(id) {
  await init();
  const { rows } = await pool.query(`SELECT * FROM visitors WHERE id = $1`, [Number(id)]);
  return rows[0] ? mapVisitor(rows[0]) : null;
}

async function listVisitors() {
  await init();
  const { rows } = await pool.query(`SELECT * FROM visitors ORDER BY created_at DESC`);
  return rows.map(mapVisitor);
}

// ---------- Attempts ----------

async function createAttempt({ visitorId, visitorName, paperId, paperTitle, result }) {
  await init();
  const { rows } = await pool.query(
    `INSERT INTO attempts (visitor_id, visitor_name, paper_id, paper_title, result)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [visitorId, visitorName, paperId, paperTitle, JSON.stringify(result)]
  );
  return mapAttempt(rows[0]);
}

async function getAttempt(id) {
  await init();
  const { rows } = await pool.query(`SELECT * FROM attempts WHERE id = $1`, [Number(id)]);
  return rows[0] ? mapAttempt(rows[0]) : null;
}

async function listAttemptsForVisitor(visitorId) {
  await init();
  const { rows } = await pool.query(
    `SELECT * FROM attempts WHERE visitor_id = $1 ORDER BY created_at DESC`,
    [Number(visitorId)]
  );
  return rows.map(mapAttempt);
}

async function listAllAttempts() {
  await init();
  const { rows } = await pool.query(`SELECT * FROM attempts ORDER BY created_at DESC`);
  return rows.map(mapAttempt);
}

module.exports = {
  createVisitor,
  touchVisitor,
  getVisitor,
  listVisitors,
  createAttempt,
  getAttempt,
  listAttemptsForVisitor,
  listAllAttempts,
};
