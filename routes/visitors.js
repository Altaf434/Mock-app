const express = require("express");
const router = express.Router();
const store = require("../lib/store");

function getIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress;
}

// Create a visitor record - called once when someone fills the mandatory
// name + location gate on first visit. This is our "who came and when" log.
router.post("/", async (req, res) => {
  const { name, location } = req.body || {};
  if (!name || !name.trim() || !location || !location.trim()) {
    return res.status(400).json({ error: "name and location are required" });
  }
  const visitor = await store.createVisitor({
    name: name.trim(),
    location: location.trim(),
    ip: getIp(req),
    userAgent: req.headers["user-agent"] || "",
  });
  res.json({ visitorId: visitor.id, name: visitor.name });
});

// Called on subsequent visits (visitor already has an id in localStorage)
// so we can track repeat/return visits, not just first ones.
router.post("/:id/ping", async (req, res) => {
  const visitor = await store.touchVisitor(req.params.id);
  if (!visitor) return res.status(404).json({ error: "visitor not found" });
  res.json({ ok: true });
});

router.get("/:id", (req, res) => {
  const visitor = store.getVisitor(req.params.id);
  if (!visitor) return res.status(404).json({ error: "visitor not found" });
  res.json({ id: visitor.id, name: visitor.name, location: visitor.location });
});

router.get("/:id/attempts", (req, res) => {
  const attempts = store.listAttemptsForVisitor(req.params.id);
  res.json(
    attempts.map((a) => ({
      id: a.id,
      paperId: a.paperId,
      paperTitle: a.paperTitle,
      scorePercent: a.result.scorePercent,
      correctCount: a.result.correctCount,
      total: a.result.total,
      createdAt: a.createdAt,
    }))
  );
});

module.exports = router;
