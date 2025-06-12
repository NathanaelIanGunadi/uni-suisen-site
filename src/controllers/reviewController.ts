import { Request, Response } from 'express';
import { PrismaClient, Status } from '@prisma/client';

const prisma = new PrismaClient();

export const reviewSubmission = async (req: Request, res: Response): Promise<void> => {
  const submissionId = parseInt(req.params.id);
  const { approved, comments } = req.body;

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await prisma.review.create({
    data: {
      submissionId,
      reviewerId: req.user.id,
      approved,
      comments,
    },
  });

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: approved ? Status.APPROVED : Status.REJECTED },
  });

  res.json({ message: 'Review submitted successfully' });
};

export const getPendingSubmissions = async (req: Request, res: Response): Promise<void> => {
  const submissions = await prisma.submission.findMany({
    where: { status: Status.PENDING },
    include: { student: true },
  });

  res.json(submissions);
};
