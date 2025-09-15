import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * For REVIEWER/ADMIN: return ALL submissions (with student, latest first).
 * - Adds files[] so the dashboard’s staff table can show attachments.
 */
export const getAllSubmissionsForModeration = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        student: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        files: true,
        reviews: {
          select: {
            id: true,
            approved: true,
            reviewerId: true,
            reviewedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(submissions);
  } catch (err) {
    console.error("Load submissions error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};
