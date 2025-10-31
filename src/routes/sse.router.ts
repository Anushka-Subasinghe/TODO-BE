import express, { Request, Response } from "express";
import { sse } from "../controllers/sse.controller";
import jwt from "jsonwebtoken";

const sseRouter = express.Router();

sseRouter.get(
  "/",
  (req: Request, res: Response, next) => {
    const token = req.query.token as string | undefined;

    if (!token) {
      res.writeHead(401, { "Content-Type": "text/event-stream" });
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: "Missing token",
        })}\n\n`
      );
      return res.end();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      (req as any).user = decoded;
      next();
    } catch (err) {
      console.error("Invalid SSE token:", err);
      res.writeHead(401, { "Content-Type": "text/event-stream" });
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: "Invalid or expired token",
        })}\n\n`
      );
      return res.end();
    }
  },
  sse
);

export default sseRouter;
