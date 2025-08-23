import express from "express";
import paginationParser from "../middlewares/pagination-parser.js";

const validatePost = (req, res, next) => {
  next();
};

const validatePut = (req, res, next) => {
  next();
};

export default (controller) => {
  const router = express.Router();

  router.get("/me", controller.getLoggedInUser);
  router.get("/", paginationParser, controller.get);
  router.get("/deleted", paginationParser, controller.getDeleted);
  router.post("/", validatePost, controller.create);
  router.put("/:id", validatePut, controller.update);
  router.delete("/:id", controller.deleteById);
  return router;
};
