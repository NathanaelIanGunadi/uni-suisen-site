import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendMail } from "../services/mailer";

const prisma = new PrismaClient();

/**
 * Students/Admins create a submission (enforces one PENDING at a time).
 */
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

  const pending = await prisma.submission.findFirst({
    where: { studentId: req.user.id, status: "PENDING" as any },
  });
  if (pending) {
    res
      .status(409)
      .json({ error: "You already have a submission under review." });
    return;
  }

  const submission = await prisma.submission.create({
    data: { title, filename: file.filename, studentId: req.user.id },
    include: { student: true },
  });

  // Notify opted-in reviewers/admins (non-blocking)
  (async () => {
    try {
      const recipients = await prisma.user.findMany({
        where: {
          notifyOnNewSubmission: true,
          OR: [{ role: "REVIEWER" }, { role: "ADMIN" }],
        },
        select: { email: true },
      });

      if (recipients.length) {
        const subject = `[New Submission] ${submission.title}`;
        const html = `
          <p>A new submission was created.</p>
          <ul>
            <li><b>Title:</b> ${escapeHtml(submission.title)}</li>
            <li><b>Student:</b> ${escapeHtml(
              submission.student?.email || ""
            )}</li>
            <li><b>Filename:</b> ${escapeHtml(submission.filename)}</li>
            <li><b>Created:</b> ${new Date(
              submission.createdAt
            ).toLocaleString()}</li>
          </ul>
          <p><a href="${process.env.APP_BASE_URL || ""}/submission.html?id=${
          submission.id
        }">Open submission</a></p>
        `;
        await Promise.allSettled(
          recipients.map((r) =>
            sendMail({ to: r.email, subject, html, text: stripHtml(html) })
          )
        );
      }
    } catch (e) {
      console.error("[notify reviewers] error:", e);
    }
  })();

  res.status(201).json(submission);
};

/**
 * Current user's submissions (student/admin sees their own history).
 */
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

/**
 * Staff view: all submissions (admins/reviewers).
 */
export const getAllSubmissionsForStaff = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const subs = await prisma.submission.findMany({
    include: {
      student: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      reviews: {
        orderBy: { reviewedAt: "desc" },
        take: 1,
        select: {
          id: true,
          approved: true,
          comments: true,
          reviewedAt: true,
          reviewer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(subs);
};

/**
 * Mixed access: reviewers/admins can view any; students can view only their own.
 */
export const getSubmissionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid submission id" });
    return;
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: {
      student: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      reviews: {
        orderBy: { reviewedAt: "desc" },
        select: {
          id: true,
          approved: true,
          comments: true,
          reviewedAt: true,
          reviewer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!sub) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }

  const role = req.user?.role;
  const userId = req.user?.id;
  if (role === "STUDENT" && sub.student.id !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(sub);
};

// helpers
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
      ? "&lt;"
      : c === ">"
      ? "&gt;"
      : c === '"'
      ? "&quot;"
      : "&#39;"
  );
}
