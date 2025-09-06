// backend/src/routes/dashboardRoutes.ts
import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";
import {
  getDashboardSummary,
  getAllSubmissionsForModeration,
} from "../controllers/dashboardController";

const router = Router();

// All authenticated users get a lightweight summary (role + identity)
router.get("/summary", authenticate, getDashboardSummary);

// Reviewers/Admins can see ALL submissions inside dashboard
router.get(
  "/submissions",
  authenticate,
  authorizeRole(["REVIEWER", "ADMIN"]),
  getAllSubmissionsForModeration
);

export default router;
