const express = require("express");
const router = express.Router();
const store = require("../lib/store");
const { getPaperById } = require("../lib/papers");
const { gradeAttempt } = require("../lib/grade");

// Submit a completed (or timed-out) attempt for grading.
router.post("/", async (req, res) => {
  const { visitorId, paperId, answers, timeTakenSeconds } = req.body || {};

  if (!visitorId || !paperId || !Array.isArray(answers)) {
    return res.status(400).json({ error: "visitorId, paperId and answers[] are required" });
  }

  const visitor = store.getVisitor(visitorId);
  if (!visitor) return res.status(404).json({ error: "visitor not found - please refresh" });

  const paper = getPaperById(paperId);
  if (!paper) return res.status(404).json({ error: "paper not found" });

  const result = gradeAttempt(paper, answers, timeTakenSeconds || 0);

  const attempt = await store.createAttempt({
    visitorId: Number(visitorId),
    visitorName: visitor.name,
    paperId: paper.id,
    paperTitle: paper.title,
    result,
  });

  res.json({ attemptId: attempt.id, result });
});

router.get("/:id", (req, res) => {
  const attempt = store.getAttempt(req.params.id);
  if (!attempt) return res.status(404).json({ error: "attempt not found" });
  res.json(attempt);
});

module.exports = router;
