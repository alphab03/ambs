import express from "express";
import cors from "cors";
import morgan from "morgan";
import "dotenv/config";

import { initFirebase } from "./config/firebase.js";
import { startScheduler } from "./services/dareScheduler.js";

import webhooksRouter from "./routes/webhooks.js";
import daresRouter from "./routes/dares.js";
import predictionsRouter from "./routes/predictions.js";
import proofRouter from "./routes/proof.js";
import leaderboardRouter from "./routes/leaderboard.js";
import usersRouter from "./routes/users.js";

initFirebase();

const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio posts form-encoded

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/webhooks", webhooksRouter);
app.use("/api/dares", daresRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/proof", proofRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/users", usersRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`dare-app backend listening on :${PORT}`);
  if (process.env.DEFAULT_GROUP_ID) {
    startScheduler({ groupId: process.env.DEFAULT_GROUP_ID });
    console.log(`Scheduler started for group ${process.env.DEFAULT_GROUP_ID}`);
  } else {
    console.log("DEFAULT_GROUP_ID not set — scheduler not started.");
  }
});
