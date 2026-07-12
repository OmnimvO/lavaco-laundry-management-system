import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import orderRoutes from "./routes/order.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import userRoutes from "./routes/user.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    message:
      "Lava Co. Laundry API is running",
  });
});

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

export default app;