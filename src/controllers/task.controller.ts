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

//reorder the two adjacent tasks
export const reorderTasks = async (req, res) => {
  try {
    const swapped = req.body.items;

    const [first, second] = swapped;

    const latestTasks = await taskClient.findMany({
      where: { id: { in: [first.id, second.id] } },
    });

    const latestById = Object.fromEntries(latestTasks.map((t) => [t.id, t]));

    const versionMismatch =
      latestById[first.id]?.version !== first.version ||
      latestById[second.id]?.version !== second.version;

    if (versionMismatch) {
      return res.status(409).json({ error: "Version conflict" });
    }

    const updatedTasks = await prisma.$transaction([
      taskClient.update({
        where: { id: first.id },
        data: {
          orderIndex: first.orderIndex,
          version: { increment: 1 },
        },
      }),
      taskClient.update({
        where: { id: second.id },
        data: {
          orderIndex: second.orderIndex,
          version: { increment: 1 },
        },
      }),
    ]);

    sseEmitter.emit("task_reordered", updatedTasks);

    res.status(200).json({ data: updatedTasks });
  } catch (e) {
    console.error(e);
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
