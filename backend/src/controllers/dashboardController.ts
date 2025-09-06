// backend/src/controllers/dashboardController.ts
import { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * A simple summary endpoint. We keep it for parity, but the new UI now
 * focuses on role-based sections. This still returns minimal info.
 */
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

    // Minimal payload (stats removed from here for simplicity in new UI)
    res.json({ user });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * For REVIEWER/ADMIN: return ALL submissions (with student, latest first).
 */
export const getAllSubmissionsForModeration = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        student: { select: { id: true, email: true } },
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
