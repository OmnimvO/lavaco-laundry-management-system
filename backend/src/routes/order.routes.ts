import { Router } from "express";
import { orderController } from "../controllers/order.controller.js";

const router = Router();

router.post("/", orderController.createOrder);

router.get("/", orderController.getAllOrders);

router.get("/:id", orderController.getOrderById);

router.put("/:id", orderController.updateOrder);

router.patch("/:id/status", orderController.updateOrderStatus);

router.delete("/:id", orderController.deleteOrder);

export default router;