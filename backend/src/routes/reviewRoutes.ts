import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";
import {
  getPendingSubmissions,
  reviewSubmission,
} from "../controllers/reviewController";

const router = Router();

router.use(authenticate, authorizeRole(["REVIEWER", "ADMIN"]));

router.get("/pending", getPendingSubmissions);
router.post("/:id", reviewSubmission);

export default router;
