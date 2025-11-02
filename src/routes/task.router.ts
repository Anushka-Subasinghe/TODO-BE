import { Router } from "express";
import { validateData } from "../middleware/zodValidation";
import { createTaskSchema } from "../schemas/taskSchemas";
import {
  getTasksByStatus,
  createTask,
  reorderTasks,
  updateTask,
} from "../controllers/task.controller";
import { requireAuth } from "../middleware/auth";

const taskRouter = Router();

taskRouter.get("/", requireAuth, getTasksByStatus);
taskRouter.post("/", requireAuth, validateData(createTaskSchema), createTask);
taskRouter.patch("/reorder", requireAuth, reorderTasks);
taskRouter.patch("/:id", requireAuth, updateTask);

export default taskRouter;
