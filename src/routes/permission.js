import express from "express";
import paginationParser from "../middlewares/pagination-parser.js";

export default (controller) => {
  const router = express.Router();

  router.get("/list", controller.getPermissionList);
  router.get("/", paginationParser, controller.get);
  router.get("/my", controller.getMy);
  router.post("/", controller.create);
  router.delete("/:role_id/:code", controller.deleteByCode);

  return router;
};
