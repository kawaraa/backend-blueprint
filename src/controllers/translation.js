import Controller from "./default.js";

export default class TranslationController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.newSelect = `SELECT id, text_a, text_b FROM ${this.entity} WHERE text_a = IN (?)`;
  }

  filter = async ({ user, body }, res, next) => {
    try {
      const p = await this.checkPermission(user, "view", this.entity);
      if (!p.permitted) throw "FORBIDDEN";
      const data = await this.db.getAll(this.newSelect, [body.text_a]);
      res.json({ data, total: +data.length });
    } catch (error) {
      next(error);
    }
  };
}
