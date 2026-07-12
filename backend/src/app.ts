import express from "express";
import cors from "cors";

import customerRoutes from "./routes/customer.routes.js";
import orderRoutes from "./routes/order.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";

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

export default app;