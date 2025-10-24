import { z } from "zod";

export const createTaskSchema = z.object({
  userId: z.string(),
  title: z.string(),
  priority: z.enum(["low", "med", "high"]),
  description: z.string(),
  dueDate: z.preprocess((val) => {
    if (typeof val === "string" || val instanceof Date) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
    return undefined;
  }, z.date()),
  done: z.boolean().optional(),
  orderIndex: z.number(),
  version: z.number().optional(),
});
