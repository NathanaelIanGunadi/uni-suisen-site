// backend/src/routes/submissionRoutes.ts
import { Router } from "express";
import {
  createSubmission,
  getStudentSubmissions,
} from "../controllers/submissionController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";
import { upload } from "../utils/fileUpload";

const router = Router();

// All routes below require auth
router.use(authenticate);

// Create a submission (Students and Admins only)
router.post(
  "/",
  authorizeRole(["STUDENT", "ADMIN"]),
  upload.single("document"), // form field name must be 'document'
  createSubmission
);

// Get the authenticated user's submissions (students/admins see their own)
router.get("/my-submissions", getStudentSubmissions);

export default router;
