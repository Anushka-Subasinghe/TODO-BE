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
    secure: true,
    sameSite: "strict",
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ accessToken, id: user.id });
}

export async function refresh(req: Request, res: Response) {
  const cookie = req.cookies?.refresh as string | undefined;
  if (!cookie) return res.status(401).json({ error: "No refresh token" });

  const [familyId, token] = cookie.split(":");
  const family = await prisma.refreshToken.findFirst({
    where: { familyId, revoked: false },
    orderBy: { createdAt: "desc" },
  });
  if (!family) return res.status(401).json({ error: "Invalid refresh" });

  const reused = !compareHash(token, family.tokenHash);
  if (reused) {
    await refreshTokenClient.updateMany({
      where: { familyId },
      data: { revoked: true },
    });
    return res.status(401).json({ error: "Refresh token reuse detected" });
  }

  const refreshToken = randomUUID();
  const accessToken = signAccessToken(family.userId);

  await refreshTokenClient.create({
    data: {
      userId: family.userId,
      tokenHash: hashToken(refreshToken),
      familyId,
    },
  });
  await refreshTokenClient.update({
    where: { id: family.id },
    data: { revoked: true },
  });

  res.cookie("refresh", `${familyId}:${refreshToken}`, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 14 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ accessToken });
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
