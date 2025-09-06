import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  const { title } = req.body;
  const file = req.file;

  if (!file || !req.user) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const submission = await prisma.submission.create({
    data: {
      title,
      filename: file.filename,
      studentId: req.user.id,
    },
  });

  res.json(submission);
};
