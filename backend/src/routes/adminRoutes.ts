import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";
import {
  listUsers,
  updateUserRole,
  resetUserPassword,
  addUser,
  deleteUser,
} from "../controllers/adminController";

const router = Router();

router.use(authenticate, authorizeRole(["ADMIN"]));

router.get("/users", listUsers);
router.post("/users", addUser);
router.patch("/users/:id/role", updateUserRole);
router.post("/users/:id/reset-password", resetUserPassword);
router.delete("/users/:id", deleteUser);

export default router;
