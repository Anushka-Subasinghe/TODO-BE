import express from "express";
import {
  startExport,
  getExportStatus,
  downloadCSV,
} from "../controllers/exportController";

const router = express.Router();

router.post("/csv/:userId", startExport);

router.get("/csv/:jobId", getExportStatus);

router.get("/csv/:jobId/:userId/file", downloadCSV);

export default router;
