import bcrypt from "bcryptjs";

export function hashToken(value: string) {
  return bcrypt.hashSync(value, 10);
}

export function compareHash(value: string, hash: string) {
  return bcrypt.compareSync(value, hash);
}
