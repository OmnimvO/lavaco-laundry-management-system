import { Router } from "express";
import { customerController } from "../controllers/customer.controller.js";

const router = Router();

router.post("/", customerController.createCustomer);

router.get("/", customerController.getAllCustomers);

router.get("/:id", customerController.getCustomerById);

router.put("/:id", customerController.updateCustomer);

router.delete("/:id", customerController.deleteCustomer);

export default router;