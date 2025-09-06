// backend/src/index.ts
import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import submissionRoutes from "./routes/submissionRoutes";
import reviewRoutes from "./routes/reviewRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";
import { apiRoutes } from "./routes/apiRoutes";

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

// HTML list of all endpoints at /api
apiRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});
