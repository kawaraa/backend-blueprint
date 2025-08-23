import checkPermission from "../config/rbac-check.js";
import Controller from "./default.js";

export default class TranslationController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.newSelect = `SELECT id, text_a, text_b FROM ${this.entity} WHERE text_a = ANY($1)`;
  }

  filter = async ({ user, body, pagination }, res, next) => {
    try {
      const data = await this.db.getAll(this.newSelect, [body.text_a]);
      const result = await checkPermission(user, "view", this.entity, data);
      // if (!result.permitted) return next("FORBIDDEN");
      res.json({ data: result.data, total: +result.data.length });
    } catch (error) {
      next(error);
    }
  };
}
