import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import {
  getMyPreferences,
  updateMyPreferences,
} from "../controllers/userPrefsController";

const router = Router();

router.use(authenticate);
router.get("/preferences", getMyPreferences);
router.patch("/preferences", updateMyPreferences);

export default router;
