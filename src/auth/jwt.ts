import jwt from "jsonwebtoken";

const JWT_SECRET =
  "8d09c2592d58e8e9a15b7b93ad6df93a2b4b1caa1c9a75db9d84352f34bca47f827d2f31b21cc914eb4971a146cc1a9ff02b0c2ad1a0d1c5137c36a8b12c341e";

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
