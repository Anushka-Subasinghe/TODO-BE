import { PrismaClient } from "@prisma/client";
import { sseEmitter } from "../sse/emitter";

const prisma = new PrismaClient();
const taskClient = prisma.task;

//get Tasks by Status
export const getTasksByStatus = async (req, res) => {
  try {
    const status = req.query.status as string;

    const doneParam =
      status === "open" ? false : status === "done" ? true : undefined;

    if (doneParam === undefined)
      return res.status(400).json({ error: "Invalid status parameter" });

    const allTasks = await taskClient.findMany({
      where: {
        done: doneParam,
      },
    });
    res.status(200).json({ data: allTasks });
  } catch (e) {
    res.status(400).json({ error: e });
  }
};

//Create Task
export const createTask = async (req, res) => {
  const { userId, title, priority, description, dueDate, orderIndex } =
    req.body;

  const taskData = {
    userId,
    title,
    priority,
    description,
    dueDate: dueDate ? new Date(dueDate) : null,
    orderIndex: orderIndex ?? 0,
  };

  try {
    const task = await taskClient.create({
      data: {
        userId,
        title,
        priority,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        orderIndex: orderIndex ?? 0,
      },
    });
    sseEmitter.emit("task_created", task);
    res.status(201).json({ data: taskData });
  } catch (e) {
    res.status(400).json({ error: e, data: taskData });
  }
};

//reorder multiple tasks
export const reorderTasks = async (req, res) => {
  try {
    const items = req.body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid items array" });
    }

    const taskIds = items.map((item) => item.id);

    const latestTasks = await taskClient.findMany({
      where: { id: { in: taskIds } },
    });

    const latestById = Object.fromEntries(latestTasks.map((t) => [t.id, t]));

    const versionMismatch = items.some(
      (item) => latestById[item.id]?.version !== item.version
    );

    if (versionMismatch) {
      return res.status(409).json({ error: "Version conflict" });
    }

    const updateOperations = items.map((item) =>
      taskClient.update({
        where: { id: item.id },
        data: {
          orderIndex: item.orderIndex,
          version: { increment: 1 },
        },
      })
    );

    const updatedTasks = await prisma.$transaction(updateOperations);

    sseEmitter.emit("task_reordered", updatedTasks);

    res.status(200).json({ data: updatedTasks });
  } catch (e) {
    console.error("Error reordering tasks:", e);
    res.status(500).json({ error: "Failed to reorder tasks" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { done, title, priority, description, dueDate } = req.body;
    const id = req.params.id;
    const data: any = { done, title, priority, description, dueDate };
    const updatedTask = await taskClient.update({
      where: { id: id },
      data,
    });

    sseEmitter.emit("task_updated", updatedTask);

    res.status(200).json({ data: updatedTask });
  } catch (e) {
    res.status(500).json({ error: "Failed to update task" });
  }
};
