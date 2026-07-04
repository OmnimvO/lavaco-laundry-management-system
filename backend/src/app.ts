import express from "express";
import cors from "cors";
import customerRoutes from "./routes/customer.routes.js";

const app = express();

app.use(express.json());
app.use(cors());

app.use("/customers", customerRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Lavaco API is running!",
  });
});

export default app;