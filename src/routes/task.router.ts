import { Router } from "express";
import { validateData } from "../middleware/zodValidation";
import { createTaskSchema } from "../schemas/taskSchemas";
import {
  getTasksByStatus,
  createTask,
  reorderTasks,
  updateTask,
} from "../controllers/task.controller";

const taskRouter = Router();

taskRouter.get("/", getTasksByStatus);
taskRouter.post("/", validateData(createTaskSchema), createTask);
taskRouter.patch("/reorder", reorderTasks);
taskRouter.patch("/:id", updateTask);

export default taskRouter;
