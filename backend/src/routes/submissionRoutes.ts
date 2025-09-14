import { Router } from "express";
import {
  createSubmission,
  getStudentSubmissions,
  getAllSubmissionsForStaff,
  getSubmissionById,
} from "../controllers/submissionController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";
import { upload } from "../utils/fileUpload";

const router = Router();
router.use(authenticate);

// Create (Student/Admin)
router.post(
  "/",
  authorizeRole(["STUDENT", "ADMIN"]),
  upload.single("document"),
  createSubmission
);

// My submissions (Student/Admin)
router.get(
  "/my-submissions",
  authorizeRole(["STUDENT", "ADMIN"]),
  getStudentSubmissions
);

// Staff: all submissions (Reviewer/Admin)
router.get(
  "/all",
  authorizeRole(["REVIEWER", "ADMIN"]),
  getAllSubmissionsForStaff
);

// Mixed access: staff = any, student = only own (controller checks)
router.get("/:id", getSubmissionById);

export default router;
