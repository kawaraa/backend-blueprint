import express from "express";
import fileParser from "../middlewares/file-parser.js";
import paginationParser from "../middlewares/pagination-parser.js";

// const validatePost = (req, res, next) => {
//   next();
// };

const getSubRoutes = (controller) => {
  const router = express.Router();
  router.get("/", paginationParser, controller.get);
  if (controller.filter) router.post("/filter", paginationParser, controller.filter);
  if (controller.report) router.post("/report", fileParser.single("file"), controller.report);
  router.get("/deleted", paginationParser, controller.getDeleted);
  router.post("/", fileParser.single("file"), controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.deleteById);
  router.put("/restore/:id", controller.restore);

  return router;
};

export default getSubRoutes;
