import checkPermission from "../config/rbac-check.js";
import Controller from "./default.js";

export default class BranchController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.selectDepartmentQuery = `SELECT COUNT(*) OVER() AS total FROM department WHERE branch_id = $1`;
    // this.selectDepartmentQuery = `SELECT id, name FROM ${this.entity} WHERE branch_id = $1`;
    // this.selectIdentityQuery = `SELECT t1.id, t1.first_name_ar, t1.last_name_ar FROM ${this.entity} t1 JOIN position t2 ON t1.id = t2.identity_id WHERE department = $1`;
  }

  get = async ({ user, query, pagination }, res, next) => {
    try {
      const { sql, values } = this.db.prepareQuery(this.selectQuery, query, pagination);
      const data = await this.db.getAll(sql, values);
      await Promise.all(
        data.map(async (item) => {
          item.departments = +(await this.db.getAll(this.selectDepartmentQuery, [item.id]))[0]?.total || 0;
          return item;
        })
      );
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      const result = await checkPermission(user, "view", this.entity, data);
      // if (!result.permitted) return next("FORBIDDEN");
      res.json({ data: result.data, total });
    } catch (error) {
      next(error);
    }
  };
}
