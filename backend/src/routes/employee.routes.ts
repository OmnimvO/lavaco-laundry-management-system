import { Router } from "express";
import { employeeController } from "../controllers/employee.controller.js";

const router = Router();

router.get(
  "/",
  employeeController.getAllEmployees
);

router.post(
  "/",
  employeeController.createEmployee
);

router.get(
  "/:id",
  employeeController.getEmployeeById
);

router.put(
  "/:id",
  employeeController.updateEmployee
);

router.delete(
  "/:id",
  employeeController.deleteEmployee
);

export default router;