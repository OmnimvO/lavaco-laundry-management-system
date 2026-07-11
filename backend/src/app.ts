import express from "express";
import cors from "cors";

import customerRoutes from "./routes/customer.routes.js";
import orderRoutes from "./routes/order.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    message: "Lavaco Laundry API is running",
  });
});

app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);

export default app;