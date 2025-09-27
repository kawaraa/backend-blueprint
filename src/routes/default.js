import express from "express";
import fileParser from "../middlewares/file-parser.js";
import paginationParser from "../middlewares/pagination-parser.js";
import getAuthMiddleware from "../middlewares/auth.js";

const getSubRoutes = (controller, publicAccess) => {
  const router = express.Router();
  const fileMW = fileParser.single("file");
  const auth = getAuthMiddleware();

  if (controller.get) router.get("/", getAuthMiddleware(publicAccess), paginationParser, controller.get);

  if (controller.filter) router.post("/filter", auth, paginationParser, controller.filter);
  if (controller.report) router.post("/report", auth, fileMW, controller.report);
  if (controller.getDeleted) router.get("/deleted", auth, paginationParser, controller.getDeleted);
  if (controller.create) router.post("/", auth, fileMW, controller.create);
  if (controller.update) router.put("/:id", auth, controller.update);
  if (controller.deleteById) router.delete("/:id", auth, controller.deleteById);
  if (controller.restore) router.put("/restore/:id", auth, controller.restore);

  return router;
};

export default getSubRoutes;
