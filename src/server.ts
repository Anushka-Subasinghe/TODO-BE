import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import bodyParser from "body-parser";
var hpp = require("hpp");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

import taskRouter from "./routes/task.router";
import sseRouter from "./routes/sse.router";
import authRouter from "./routes/auth.router";

const app = express();

const PORT = process.env.PORT || 3000;

const FE_URL = process.env.FE_URL;

app.use(helmet());

app.use(
  cors({
    origin: FE_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(limiter);

app.use(bodyParser.urlencoded());

app.use(hpp());

app.use("/auth", authRouter);

app.use("/tasks", taskRouter);

app.use("/stream", sseRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
