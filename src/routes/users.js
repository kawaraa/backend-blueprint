import express from "express";

export default (controller) => {
  const router = express.Router();

  router.get("/me", controller.getLoggedInUser);
  router.get("/", paginationParser, controller.get);
  router.get("/deleted", paginationParser, controller.getDeleted);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.deleteById);
  router.put("/restore/:id", controller.restore);
  return router;
};
