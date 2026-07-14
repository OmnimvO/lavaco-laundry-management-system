import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import orderRoutes from "./routes/order.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import userRoutes from "./routes/user.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import tankCycleRoutes from "./routes/tankCycle.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import archiveRoutes from "./routes/archive.routes.js";
import reportRoutes from "./routes/report.routes.js";
import revenueRoutes from "./routes/revenue.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import refundRoutes from "./routes/refund.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get(
  "/",
  (_request, response) => {
    response.json({
      message:
        "Lava Co. Laundry API is running",
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/employees",
  employeeRoutes
);

app.use(
  "/api/audit-logs",
  auditLogRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/settings",
  settingsRoutes
);

app.use(
  "/api/tank-cycles",
  tankCycleRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/archives",
  archiveRoutes
);

app.use(
  "/api/reports",
  reportRoutes
);

app.use(
  "/api/revenue",
  revenueRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/refunds",
  refundRoutes
);

app.use(
  "/api/inventory",
  inventoryRoutes
);

export default app;