import express from "express";
import { sse } from "../controllers/sse.controller";

const sseRouter = express.Router();

sseRouter.get("/", sse);

export default sseRouter;
