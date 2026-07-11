import { Router } from "express";
import { customerController } from "../controllers/customer.controller.js";

const router = Router();

router.get("/", customerController.getAllCustomers);
router.post("/", customerController.createCustomer);
router.get("/:id", customerController.getCustomerById);
router.put("/:id", customerController.updateCustomer);
router.delete("/:id", customerController.deleteCustomer);

export default router;