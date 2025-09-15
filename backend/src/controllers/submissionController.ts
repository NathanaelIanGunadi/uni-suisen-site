import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { sendMail } from "../services/mailer";

const prisma = new PrismaClient();

/**
 * Students/Admins create a submission (enforces one PENDING at a time).
 * - Supports single file field "document" (legacy) OR multiple files field "documents".
 * - Keeps legacy submission.filename as the first uploaded file for compatibility.
 * - Stores all uploaded files in SubmissionFile records (requires SubmissionFile model in Prisma).
 */
export const createSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title } = req.body;

  // Support both single and multi-file upload shapes:
  const singleFile = req.file as Express.Multer.File | undefined;
  const multiFiles = (req.files as Express.Multer.File[]) || [];
  const allFiles: Express.Multer.File[] = singleFile
    ? [singleFile]
    : Array.isArray(multiFiles)
    ? multiFiles
    : [];

  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "Title is required." });
    return;
  }
  if (!allFiles.length) {
    res.status(400).json({ error: "Please attach at least one document." });
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

  // Create submission (keep legacy filename = first file)
  const submission = await prisma.submission.create({
    data: {
      title,
      filename: allFiles[0].filename, // legacy compatibility
      studentId: req.user.id,
    },
    include: { student: true },
  });

  // Create file records for all uploaded files (new)
  try {
    await prisma.submissionFile.createMany({
      data: allFiles.map((f) => ({
        submissionId: submission.id,
        filename: f.filename,
        originalName: f.originalname,
      })),
    });
  } catch (e) {
    // If file record creation fails, you may wish to log but not fail the submission itself
    console.error("[createSubmission] createMany(submissionFile) error:", e);
  }

  // Fetch with files to return a richer response (keeps your previous shape + adds files[])
  const full = await prisma.submission.findUnique({
    where: { id: submission.id },
    include: { student: true, files: true },
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

      if (recipients.length && full) {
        const subject = `[New Submission] ${full.title}`;
        const fileListHtml =
          full.files && full.files.length
            ? `<ul>${full.files
                .map(
                  (f) =>
                    `<li>${escapeHtml(
                      f.originalName || f.filename
                    )} (${escapeHtml(f.filename)})</li>`
                )
                .join("")}</ul>`
            : `<p>(no files)</p>`;
        const html = `
          <p>A new submission was created.</p>
          <ul>
            <li><b>Title:</b> ${escapeHtml(full.title)}</li>
            <li><b>Student:</b> ${escapeHtml(full.student?.email || "")}</li>
            <li><b>Created:</b> ${new Date(
              full.createdAt
            ).toLocaleString()}</li>
          </ul>
          <p><b>Files:</b></p>
          ${fileListHtml}
          <p><a href="${process.env.APP_BASE_URL || ""}/submission.html?id=${
          full.id
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

  res.status(201).json(full ?? submission);
};

/**
 * Current user's submissions (student/admin sees their own history).
 * - Adds files[] to each submission; keeps legacy filename as-is.
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
    include: { reviews: true, files: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(submissions);
};

/**
 * Staff view: all submissions (admins/reviewers).
 * - Adds files[] so staff can see all attachments.
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
      files: true,
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
 * - Adds files[] to details response.
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
      files: true,
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
