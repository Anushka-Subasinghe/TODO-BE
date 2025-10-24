var app = require("express");
var { PrismaClient } = require("@prisma/client");

var supertest = require("supertest");

var request = supertest.request;

const prisma = new PrismaClient();

describe("Task Reorder API", () => {
  let user, taskA, taskB;

  beforeAll(async () => {
    user = await prisma.user.create({
      data: { email: "test@example.com", passwordHash: "hashed" },
    });

    taskA = await prisma.task.create({
      data: {
        title: "Task A",
        priority: "low",
        description: "Test A",
        dueDate: new Date(),
        done: false,
        orderIndex: 0,
        userId: user.id,
      },
    });

    taskB = await prisma.task.create({
      data: {
        title: "Task B",
        priority: "med",
        description: "Test B",
        dueDate: new Date(),
        done: false,
        orderIndex: 1,
        userId: user.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("reorders two tasks successfully", async () => {
    const res = await request(app)
      .put("/tasks/reorder")
      .send({
        items: [
          { id: taskA.id, orderIndex: 1, version: taskA.version },
          { id: taskB.id, orderIndex: 0, version: taskB.version },
        ],
      })
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("returns 409 for version conflict", async () => {
    const res = await request(app)
      .put("/tasks/reorder")
      .send({
        items: [
          { id: taskA.id, orderIndex: 1, version: 999 },
          { id: taskB.id, orderIndex: 0, version: 999 },
        ],
      })
      .expect(409);

    expect(res.body.error).toMatch(/Version conflict/i);
  });
});
