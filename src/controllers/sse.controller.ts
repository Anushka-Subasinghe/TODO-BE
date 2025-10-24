import express from "express";
import { sseEmitter } from "../sse/emitter";

const sseRouter = express.Router();

export const sse = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendCreateEvent = (data: any) => {
    res.write(`event: task_created\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const sendReOrderEvent = (data: any) => {
    res.write(`event: task_reordered\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const sendUpdateEvent = (data: any) => {
    res.write(`event: task_updated\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sseEmitter.on("task_created", sendCreateEvent);
  sseEmitter.on("task_reordered", sendReOrderEvent);
  sseEmitter.on("task_updated", sendUpdateEvent);

  req.on("close", () => {
    sseEmitter.removeListener("task_created", sendCreateEvent);
    sseEmitter.removeListener("task_reOrdered", sendReOrderEvent);
    sseEmitter.removeListener("task_updated", sendUpdateEvent);
  });
};
