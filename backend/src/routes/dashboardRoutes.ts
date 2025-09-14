import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";
import {
  getDashboardSummary,
  getAllSubmissionsForModeration,
} from "../controllers/dashboardController";

const router = Router();
router.get("/summary", authenticate, getDashboardSummary);

router.get(
  "/submissions",
  authenticate,
  authorizeRole(["REVIEWER", "ADMIN"]),
  getAllSubmissionsForModeration
);

export default router;
