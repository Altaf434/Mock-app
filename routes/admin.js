const express = require("express");
const router = express.Router();
const store = require("../lib/store");

// Very lightweight protection - fine for an MVP, not a real auth system.
// Set ADMIN_KEY in your environment; requests must pass ?key=... matching it.
function checkKey(req, res, next) {
  const configured = process.env.ADMIN_KEY;
  if (!configured) {
    return res.status(503).json({ error: "ADMIN_KEY not configured on server" });
  }
  if (req.query.key !== configured) {
    return res.status(401).json({ error: "invalid or missing key" });
  }
  next();
}

router.get("/visitors", checkKey, (req, res) => {
  res.json(store.listVisitors());
});

router.get("/attempts", checkKey, (req, res) => {
  res.json(store.listAllAttempts());
});

module.exports = router;
