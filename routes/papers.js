const express = require("express");
const router = express.Router();
const { listPapers, getPaperById, toAttemptSafe } = require("../lib/papers");

// List all available papers (metadata only - fast overview cards)
router.get("/", (req, res) => {
  const papers = listPapers().map((p) => ({
    id: p.id,
    title: p.title,
    totalQuestions: p.totalQuestions,
    sections: p.sections,
    difficulties: p.difficulties,
  }));
  res.json(papers);
});

// Full paper for attempting - answer key stripped out.
router.get("/:id", (req, res) => {
  const paper = getPaperById(req.params.id);
  if (!paper) return res.status(404).json({ error: "paper not found" });
  res.json(toAttemptSafe(paper));
});

module.exports = router;
