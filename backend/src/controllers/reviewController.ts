import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendMail } from "../services/mailer";

const prisma = new PrismaClient();

export const getPendingSubmissions = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const submissions = await prisma.submission.findMany({
    where: { status: "PENDING" as any },
    include: {
      student: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(submissions);
};

export const reviewSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  const submissionId = Number(req.params.id);
  const { approved, comments } = req.body;

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (Number.isNaN(submissionId)) {
    res.status(400).json({ error: "Invalid submission id" });
    return;
  }

  // Block more reviews after approved
  const sub0 = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { status: true },
  });
  if (!sub0) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  if (sub0.status === "APPROVED") {
    res.status(409).json({
      error: "Submission already approved. No further reviews allowed.",
    });
    return;
  }

  // Create review + update status
  await prisma.review.create({
    data: {
      submissionId,
      reviewerId: req.user.id,
      approved: Boolean(approved),
      comments: comments || null,
    },
  });

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: (approved ? "APPROVED" : "REJECTED") as any },
    include: { student: true },
  });

  // Notify student (if opted in)
  (async () => {
    try {
      const stu = updated.student;
      if (stu?.notifyOnReviewDecision && stu.email) {
        const subject = `[Submission ${approved ? "Approved" : "Rejected"}] ${
          updated.title
        }`;
        const html = `
          <p>Your submission has been <b>${
            approved ? "APPROVED" : "REJECTED"
          }</b>.</p>
          ${
            comments
              ? `<p><b>Reviewer comments:</b> ${escapeHtml(comments)}</p>`
              : ""
          }
          <ul>
            <li><b>Title:</b> ${escapeHtml(updated.title)}</li>
            <li><b>Status:</b> ${updated.status}</li>
          </ul>
          <p><a href="${process.env.APP_BASE_URL || ""}/submission.html?id=${
          updated.id
        }">View details</a></p>
        `;
        await sendMail({ to: stu.email, subject, html, text: stripHtml(html) });
      }
    } catch (e) {
      console.error("[notify student] error:", e);
    }
  })();

  res.json({ message: "Review submitted successfully" });
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
