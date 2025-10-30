import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: 600,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    sub: string;
    iat: number;
    exp: number;
  };
}
