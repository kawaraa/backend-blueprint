import express from "express";
import fileParser from "../middlewares/file-parser.js";
import paginationParser from "../middlewares/pagination-parser.js";
import { authMiddleware, parseTokenMiddleware } from "../middlewares/auth.js";

// const validatePost = (req, res, next) => {
//   next();
// };

const getSubRoutes = (controller, publicAccess) => {
  const router = express.Router();
  const fileMW = fileParser.single("file");
  const middleware = publicAccess ? parseTokenMiddleware : authMiddleware;

  if (controller.get) router.get("/", middleware, paginationParser, controller.get);

  if (controller.filter) router.post("/filter", authMiddleware, paginationParser, controller.filter);
  if (controller.report) router.post("/report", authMiddleware, fileMW, controller.report);
  if (controller.getDeleted) router.get("/deleted", authMiddleware, paginationParser, controller.getDeleted);
  if (controller.create) router.post("/", authMiddleware, fileMW, controller.create);
  if (controller.update) router.put("/:id", authMiddleware, controller.update);
  if (controller.deleteById) router.delete("/:id", authMiddleware, controller.deleteById);
  if (controller.restore) router.put("/restore/:id", authMiddleware, controller.restore);

  return router;
};

export default getSubRoutes;
