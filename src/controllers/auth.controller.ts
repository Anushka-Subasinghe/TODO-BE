import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signAccessToken } from "../auth/jwt";
import { randomUUID } from "crypto";
import { hashToken, compareHash } from "../utils/hash";

const prisma = new PrismaClient();
const refreshTokenClient = prisma.refreshToken;

export async function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken(user.id);
  const refreshToken = randomUUID();
  const familyId = randomUUID();

  await refreshTokenClient.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), familyId },
  });

  res.cookie("refresh", `${familyId}:${refreshToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ accessToken, id: user.id });
}

export async function refresh(req: Request, res: Response) {
  const cookie = req.cookies?.refresh;
  if (!cookie) return res.status(401).json({ error: "No refresh token" });

  const [familyId, token] = cookie.split(":");
  const record = await prisma.refreshToken.findFirst({
    where: { familyId, revoked: false },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return res.status(401).json({ error: "Invalid refresh token" });

  const valid = compareHash(token, record.tokenHash);
  if (!valid) return res.status(401).json({ error: "Invalid refresh token" });

  const accessToken = signAccessToken(record.userId);
  return res.json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  const cookie = req.cookies?.refresh as string | undefined;
  if (cookie) {
    const [familyId] = cookie.split(":");
    await refreshTokenClient.updateMany({
      where: { familyId },
      data: { revoked: true },
    });
  }
  res.clearCookie("refresh", { path: "/" });
  res.json({ ok: true });
}
