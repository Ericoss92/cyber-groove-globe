import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/user.js";
import { playlistRouter } from "./routes/playlists.js";
import { favoritesRouter } from "./routes/favorites.js";
import { historyRouter } from "./routes/history.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { logger } from "./utils/logger.js";
import { pool } from "./database/connection.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: true,
}));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "up" });
  } catch (e: any) {
    res.status(503).json({ ok: false, db: "down", error: e.message });
  }
});

app.use("/api/auth", authRouter);
app.use("/api", apiLimiter);
app.use("/api/user", userRouter);
app.use("/api/playlists", playlistRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/history", historyRouter);
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => logger.info(`SOUNDWAVE API listening on :${PORT}`));
