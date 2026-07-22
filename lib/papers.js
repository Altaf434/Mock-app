// Loads exam paper JSON files from the /papers directory and normalizes
// them into a consistent shape, regardless of whether a given file is:
//   (a) a bare array of question objects, or
//   (b) an object like { title, blueprint, questions: [...] }
//
// This is intentionally tolerant of small schema differences since these
// files are LLM-generated and may vary slightly run to run.

const fs = require("fs");
const path = require("path");

const PAPERS_DIR = path.join(__dirname, "..", "papers");

function humanize(fileBaseName) {
  return fileBaseName
    .replace(/[_-]+/g, " ")
    .replace(/\.json$/i, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function normalizeQuestion(q, idx) {
  return {
    question_number: q.question_number ?? idx + 1,
    question_text: q.question_text ?? q.question ?? "",
    options: Array.isArray(q.options) ? q.options : [],
    correct_option: typeof q.correct_option === "number" ? q.correct_option : 0,
    explanation: q.explanation ?? "",
    topic: q.topic ?? "General",
    difficulty: q.difficulty ?? "Medium",
    section: q.section ?? "General",
  };
}

function loadPaperFile(filePath) {
  const fileBase = path.basename(filePath, ".json");
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    console.error(`Failed to parse paper file ${filePath}:`, e.message);
    return null;
  }

  let questionsRaw;
  let meta = {};

  if (Array.isArray(raw)) {
    questionsRaw = raw;
  } else if (raw && typeof raw === "object") {
    questionsRaw = raw.questions || raw.paper || raw.data || [];
    meta = raw;
  } else {
    return null;
  }

  const questions = questionsRaw.map(normalizeQuestion);
  if (questions.length === 0) return null;

  const sections = [...new Set(questions.map((q) => q.section))];
  const difficulties = [...new Set(questions.map((q) => q.difficulty))];
  const topics = [...new Set(questions.map((q) => q.topic))];

  return {
    id: fileBase,
    title: meta.title || meta.exam_name || meta.name || humanize(fileBase),
    blueprint: meta.blueprint || null,
    totalQuestions: questions.length,
    sections,
    difficulties,
    topics,
    questions,
  };
}

function listPapers() {
  if (!fs.existsSync(PAPERS_DIR)) return [];
  return fs
    .readdirSync(PAPERS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => loadPaperFile(path.join(PAPERS_DIR, f)))
    .filter(Boolean)
    .sort((a, b) => a.title.localeCompare(b.title));
}

function getPaperById(id) {
  const filePath = path.join(PAPERS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return loadPaperFile(filePath);
}

// Strip correct answers/explanations before sending to a client that is
// about to attempt the exam - never leak the answer key over the wire.
function toAttemptSafe(paper) {
  return {
    id: paper.id,
    title: paper.title,
    totalQuestions: paper.totalQuestions,
    sections: paper.sections,
    difficulties: paper.difficulties,
    topics: paper.topics,
    questions: paper.questions.map((q) => ({
      question_number: q.question_number,
      question_text: q.question_text,
      options: q.options,
      topic: q.topic,
      difficulty: q.difficulty,
      section: q.section,
    })),
  };
}

module.exports = { listPapers, getPaperById, toAttemptSafe };
