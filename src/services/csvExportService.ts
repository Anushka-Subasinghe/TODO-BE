import { PrismaClient } from "@prisma/client";
import { sseEmitter } from "../sse/emitter";
import { createObjectCsvStringifier } from "csv-writer";

const prisma = new PrismaClient();

interface ExportJob {
  id: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  csvData?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const exportJobs = new Map<string, ExportJob>();

export const createExportJob = (userId: string): string => {
  const jobId = `export_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const job: ExportJob = {
    id: jobId,
    userId,
    status: "pending",
    createdAt: new Date(),
  };

  exportJobs.set(jobId, job);

  return jobId;
};

export const getExportJob = (jobId: string): ExportJob | undefined => {
  return exportJobs.get(jobId);
};

export const processExport = async (jobId: string, status: "open" | "done") => {
  const job = exportJobs.get(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  try {
    job.status = "processing";
    exportJobs.set(jobId, job);

    sseEmitter.emit("export_update", {
      jobId: job.id,
      status: job.status,
    });

    const tasks = await prisma.task.findMany({
      where: {
        userId: job.userId,
        done: status === "done",
      },
      orderBy: {
        orderIndex: "asc",
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: "title", title: "Title" },
        { id: "description", title: "Description" },
        { id: "priority", title: "Priority" },
        { id: "dueDate", title: "Due Date" },
        { id: "done", title: "Status" },
        { id: "orderIndex", title: "Order" },
      ],
    });

    const records = tasks.map((task) => ({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.toISOString().split("T")[0] : "",
      done: task.done ? "Completed" : "Open",
      orderIndex: task.orderIndex,
    }));

    const csvData =
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(records);

    job.status = "completed";
    job.csvData = csvData;
    job.completedAt = new Date();
    exportJobs.set(jobId, job);

    sseEmitter.emit("export_update", {
      jobId: job.id,
      status: job.status,
    });

    return csvData;
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Unknown error";
    job.completedAt = new Date();
    exportJobs.set(jobId, job);

    sseEmitter.emit("export_update", {
      jobId: job.id,
      status: job.status,
      error: job.error,
    });

    throw error;
  }
};

setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  for (const [jobId, job] of exportJobs.entries()) {
    if (job.createdAt.getTime() < oneHourAgo) {
      exportJobs.delete(jobId);
    }
  }
}, 5 * 60 * 1000);
