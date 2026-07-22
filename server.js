const express = require("express");
const cors = require("cors");
const path = require("path");

const papersRouter = require("./routes/papers");
const visitorsRouter = require("./routes/visitors");
const attemptsRouter = require("./routes/attempts");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use("/api/papers", papersRouter);
app.use("/api/visitors", visitorsRouter);
app.use("/api/attempts", attemptsRouter);
app.use("/api/admin", adminRouter);

app.use(express.static(path.join(__dirname, "public")));

// Any non-API route falls back to index.html (simple SPA-ish routing)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Exam portal running on http://localhost:${PORT}`);
});
