import { Router } from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import { getGroupPayments, togglePayment } from "../controllers/payment.controller.js";

export const initPaymentRoutes = (app) => {
  const router = Router();
  const admin = [verifyToken, roleMiddleware(["admin"])];

  router.get("/group/:groupId",                               ...admin, getGroupPayments);
  router.patch("/group/:groupId/user/:userId/phase/:phase",  ...admin, togglePayment);

  app.use("/api/payments", router);
};
