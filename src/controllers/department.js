import postgresqlDB from "../providers/postgresql.js";
import checkPermission from "../config/rbac-check.js";
import Controller from "./default.js";

export default class DepartmentController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.selectPositionQuery = `SELECT *, COUNT(*) OVER() AS total FROM position WHERE department = $1`;
  }

  get = async ({ user, query, pagination }, res, next) => {
    try {
      const { sql, values } = postgresqlDB.prepareQuery(this.selectQuery, query, pagination);
      const data = await postgresqlDB.query(sql, values);
      await Promise.all(
        data.map(async (item) => {
          item.employees = +(await postgresqlDB.query(this.selectPositionQuery, [item.id]))[0]?.total || 0;
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
