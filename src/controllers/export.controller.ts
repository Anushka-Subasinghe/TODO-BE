import { Request, Response } from "express";
import RetryQueue from "@chris.troutner/retry-queue";
import {
  createExportJob,
  getExportJob,
  processExport,
} from "../services/csvExportService";

const retryQueueOptions = {
  concurrency: 3,
  attempts: 5,
  retryPeriod: 2000,
};

const retryQueue = new RetryQueue(retryQueueOptions);

export const startExport = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { scope } = req.body;

    if (!scope || !["open", "done"].includes(scope.status)) {
      return res.status(400).json({ error: "Invalid scope parameter" });
    }

    const jobId = createExportJob(userId);

    retryQueue.addToQueue(
      processExport,
      jobId,
      scope.status as "open" | "done"
    );

    res.status(202).json({
      jobId,
    });
  } catch (error) {
    console.error("Error starting export:", error);
    res.status(500).json({ error: "Failed to start export" });
  }
};

export const getExportStatus = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;

    const job = getExportJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const response: any = {
      status: job.status,
    };

    if (job.status === "completed") {
      response.downloadUrl = `/exports/csv/${jobId}/file`;
    }

    if (job.status === "failed" && job.error) {
      response.error = job.error;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error getting export status:", error);
    res.status(500).json({ error: "Failed to get export status" });
  }
};

export const downloadCSV = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.params.userId;

    const job = getExportJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (job.status !== "completed") {
      return res.status(400).json({
        error: "Export not ready",
        status: job.status,
      });
    }

    if (!job.csvData) {
      return res.status(500).json({ error: "CSV data not available" });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tasks_export_${jobId}.csv"`
    );

    res.status(200).send(job.csvData);
  } catch (error) {
    console.error("Error downloading CSV:", error);
    res.status(500).json({ error: "Failed to download CSV" });
  }
};
