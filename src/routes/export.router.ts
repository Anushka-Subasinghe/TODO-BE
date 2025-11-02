import express from "express";
import {
  startExport,
  getExportStatus,
  downloadCSV,
} from "../controllers/export.controller";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

router.post("/csv/:userId", requireAuth, startExport);

router.get("/csv/:jobId", requireAuth, getExportStatus);

router.get("/csv/:jobId/:userId/file", requireAuth, downloadCSV);

export default router;
