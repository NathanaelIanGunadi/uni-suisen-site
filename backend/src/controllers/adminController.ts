// backend/src/controllers/adminController.ts
import { Request, Response } from "express";
import { PrismaClient, Role, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * List all users (id, email, role)
 */
export const listUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
      orderBy: { id: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Update a user's role (ADMIN only)
 * body: { role: 'ADMIN' | 'REVIEWER' | 'STUDENT' }
 */
export const updateUserRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.id);
  const { role } = req.body as { role?: Role };

  if (!role || !["ADMIN", "REVIEWER", "STUDENT"].includes(role)) {
    res
      .status(400)
      .json({ error: "Invalid role. Use ADMIN, REVIEWER, or STUDENT." });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    res.json(user);
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Generate a strong temporary password (no ambiguous chars).
 */
const generateTempPassword = (length = 12): string => {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
};

/**
 * Reset a user's password (ADMIN only)
 * - Generates a temporary password
 * - Hashes & saves it
 * - Returns the temp password for the admin to share securely
 */
export const resetUserPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.id);

  try {
    const temp = generateTempPassword(12);
    const hashed = await bcrypt.hash(temp, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    res.json({ id: userId, tempPassword: temp });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Add a user (ADMIN only)
 * body: { email: string, role?: 'ADMIN' | 'REVIEWER' | 'STUDENT' }
 * - Generates a temp password, hashes it, creates user
 * - Returns user data + tempPassword (for this response only)
 */
export const addUser = async (req: Request, res: Response): Promise<void> => {
  const { email, role } = req.body as { email?: string; role?: Role };

  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const roleToUse: Role =
    role && ["ADMIN", "REVIEWER", "STUDENT"].includes(role)
      ? (role as Role)
      : "STUDENT";

  try {
    const temp = generateTempPassword(12);
    const hashed = await bcrypt.hash(temp, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role: roleToUse,
      },
      select: { id: true, email: true, role: true },
    });

    res.status(201).json({ ...user, tempPassword: temp });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      (err.meta.target as string[]).includes("email")
    ) {
      res.status(400).json({ error: "A user with that email already exists." });
      return;
    }
    console.error("Add user error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Delete a user (ADMIN only)
 * - Also deletes their submissions and related reviews to satisfy FK constraints
 *   (adjust if you configure ON DELETE CASCADE later).
 */
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = Number(req.params.id);

  // prevent accidental self-deletion
  if (req.user?.id === userId) {
    res.status(400).json({ error: "You cannot delete your own account." });
    return;
  }

  try {
    // Find this user's submissions
    const subs = await prisma.submission.findMany({
      where: { studentId: userId },
      select: { id: true },
    });
    const subIds = subs.map((s) => s.id);

    await prisma.$transaction([
      // delete reviews made by this user
      prisma.review.deleteMany({ where: { reviewerId: userId } }),
      // delete reviews on their submissions
      prisma.review.deleteMany({
        where: { submissionId: { in: subIds.length ? subIds : [-1] } },
      }),
      // delete their submissions
      prisma.submission.deleteMany({ where: { studentId: userId } }),
      // finally delete the user
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ id: userId, deleted: true });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
