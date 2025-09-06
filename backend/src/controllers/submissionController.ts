// backend/src/controllers/submissionController.ts
import { Request, Response } from "express";
import { PrismaClient, Status } from "@prisma/client";

const prisma = new PrismaClient();

export const createSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title } = req.body;
  const file = req.file;

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "Title is required." });
    return;
  }
  if (!file) {
    res.status(400).json({ error: "Please attach a document." });
    return;
  }

  // Enforce: only one PENDING submission at a time for this user
  const pending = await prisma.submission.findFirst({
    where: { studentId: req.user.id, status: "PENDING" as Status },
  });
  if (pending) {
    res
      .status(409)
      .json({ error: "You already have a submission under review." });
    return;
  }

  const submission = await prisma.submission.create({
    data: {
      title,
      filename: file.filename,
      studentId: req.user.id,
    },
  });

  res.status(201).json(submission);
};

export const getStudentSubmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const submissions = await prisma.submission.findMany({
    where: { studentId: req.user.id },
    include: { reviews: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(submissions);
};
