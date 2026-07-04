import { Router } from "express";
import { customerController } from "../controllers/customer.controller.js";

const router = Router();

router.post("/", customerController.createCustomer);

router.get("/", customerController.getAllCustomers);

export default router;