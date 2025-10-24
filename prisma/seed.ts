import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@gmail.com";
  const passwordHash = await bcrypt.hash("password", 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });
  const existing = await prisma.task.findMany({ where: { userId: user.id } });
  if (existing.length === 0) {
    await prisma.task.createMany({
      data: [
        {
          userId: user.id,
          title: "Task 1",
          priority: "low",
          description: "Welcome",
          dueDate: new Date(),
          done: false,
          orderIndex: 0,
        },
        {
          userId: user.id,
          title: "Task 2",
          priority: "med",
          description: "Second",
          dueDate: new Date(),
          done: false,
          orderIndex: 1,
        },
        {
          userId: user.id,
          title: "Task 3",
          priority: "high",
          description: "Third",
          dueDate: null,
          done: false,
          orderIndex: 2,
        },
      ],
    });
  }
}

main().finally(() => prisma.$disconnect());
