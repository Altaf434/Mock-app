// Grades a submitted attempt against the answer key held server-side,
// and builds the analytics breakdown shown on the results page.

// Marking scheme: +1 for a correct answer, -0.5 for an incorrect answer,
// 0 for a skipped question.
const MARKS_PER_CORRECT = 1;
const NEGATIVE_MARKING = 0.5;

function emptyBucket() {
  return { correct: 0, wrong: 0, skipped: 0, total: 0 };
}

function bump(bucketMap, key, outcome) {
  if (!bucketMap[key]) bucketMap[key] = emptyBucket();
  bucketMap[key].total += 1;
  bucketMap[key][outcome] += 1;
}

function gradeAttempt(paper, answers, timeTakenSeconds) {
  // answers: [{ question_number, selected_option }]  selected_option can be null/undefined if skipped
  const answerMap = new Map(
    answers.map((a) => [Number(a.question_number), a.selected_option])
  );

  const bySection = {};
  const byTopic = {};
  const byDifficulty = {};

  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const review = paper.questions.map((q) => {
    const selected = answerMap.has(q.question_number)
      ? answerMap.get(q.question_number)
      : null;

    let outcome;
    if (selected === null || selected === undefined) {
      outcome = "skipped";
      skippedCount += 1;
    } else if (Number(selected) === q.correct_option) {
      outcome = "correct";
      correctCount += 1;
    } else {
      outcome = "wrong";
      wrongCount += 1;
    }

    bump(bySection, q.section, outcome);
    bump(byTopic, q.topic, outcome);
    bump(byDifficulty, q.difficulty, outcome);

    return {
      question_number: q.question_number,
      question_text: q.question_text,
      options: q.options,
      selected_option: selected === undefined ? null : selected,
      correct_option: q.correct_option,
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty,
      section: q.section,
      outcome,
    };
  });

  const total = paper.questions.length;
  const scorePercent = total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0;

  const maxMarks = Math.round(total * MARKS_PER_CORRECT * 100) / 100;
  const rawMarks = correctCount * MARKS_PER_CORRECT - wrongCount * NEGATIVE_MARKING;
  const marksGained = Math.round(rawMarks * 100) / 100;

  return {
    total,
    correctCount,
    wrongCount,
    skippedCount,
    scorePercent,
    marksGained,
    maxMarks,
    marksPerCorrect: MARKS_PER_CORRECT,
    negativeMarking: NEGATIVE_MARKING,
    timeTakenSeconds,
    bySection,
    byTopic,
    byDifficulty,
    review,
  };
}

module.exports = { gradeAttempt };
