import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getMyPreferences(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      notifyOnNewSubmission: true,
      notifyOnReviewDecision: true,
      role: true,
      email: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(user);
}

export async function updateMyPreferences(
  req: Request,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { notifyOnNewSubmission, notifyOnReviewDecision } = req.body ?? {};

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      notifyOnNewSubmission:
        typeof notifyOnNewSubmission === "boolean"
          ? notifyOnNewSubmission
          : undefined,
      notifyOnReviewDecision:
        typeof notifyOnReviewDecision === "boolean"
          ? notifyOnReviewDecision
          : undefined,
    },
    select: {
      notifyOnNewSubmission: true,
      notifyOnReviewDecision: true,
      role: true,
      email: true,
    },
  });

  res.json(updated);
}
