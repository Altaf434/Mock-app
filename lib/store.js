// Simple JSON-file backed storage.
// Good enough for an MVP with low-to-moderate traffic.
// If you outgrow this: swap the read/write functions here for real
// DB calls (Postgres/Mongo) - every route file only talks to this module,
// never to the filesystem directly, so the swap is contained to one file.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const VISITORS_FILE = path.join(DATA_DIR, "visitors.json");
const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");

function ensureFile(file) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "[]", "utf-8");
  }
}

function readJSON(file) {
  ensureFile(file);
  const raw = fs.readFileSync(file, "utf-8");
  try {
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error(`Corrupt data file ${file}, resetting.`, e);
    return [];
  }
}

// naive write queue per file to avoid concurrent-write corruption
const writeQueues = {};
function writeJSON(file, data) {
  const json = JSON.stringify(data, null, 2);
  const prev = writeQueues[file] || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => fs.promises.writeFile(file, json, "utf-8"));
  writeQueues[file] = next;
  return next;
}

function nextId(list) {
  return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
}

// ---------- Visitors ----------

async function createVisitor({ name, location, ip, userAgent }) {
  const visitors = readJSON(VISITORS_FILE);
  const visitor = {
    id: nextId(visitors),
    name: String(name).slice(0, 100),
    location: String(location).slice(0, 150),
    ip,
    userAgent,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
  visitors.push(visitor);
  await writeJSON(VISITORS_FILE, visitors);
  return visitor;
}

async function touchVisitor(id) {
  const visitors = readJSON(VISITORS_FILE);
  const v = visitors.find((x) => x.id === Number(id));
  if (!v) return null;
  v.lastSeenAt = new Date().toISOString();
  await writeJSON(VISITORS_FILE, visitors);
  return v;
}

function getVisitor(id) {
  const visitors = readJSON(VISITORS_FILE);
  return visitors.find((x) => x.id === Number(id)) || null;
}

function listVisitors() {
  return readJSON(VISITORS_FILE).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

// ---------- Attempts ----------

async function createAttempt(attemptData) {
  const attempts = readJSON(ATTEMPTS_FILE);
  const attempt = {
    id: nextId(attempts),
    createdAt: new Date().toISOString(),
    ...attemptData,
  };
  attempts.push(attempt);
  await writeJSON(ATTEMPTS_FILE, attempts);
  return attempt;
}

function getAttempt(id) {
  const attempts = readJSON(ATTEMPTS_FILE);
  return attempts.find((x) => x.id === Number(id)) || null;
}

function listAttemptsForVisitor(visitorId) {
  return readJSON(ATTEMPTS_FILE)
    .filter((a) => a.visitorId === Number(visitorId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function listAllAttempts() {
  return readJSON(ATTEMPTS_FILE).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
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
