import Controller from "./default.js";
import checkPermission from "../config/rbac-check.js";
import Permission from "../models/permission.js";
const permissions = jsonRequire("src/config/permissions.json");

export default class PermissionController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
  }

  getPermissionList = async ({ user }, res, next) => {
    try {
      const result = await checkPermission(user, "add", this.entity);
      if (!result.permitted) return next("FORBIDDEN");
      res.json({ data: permissions });
    } catch (error) {
      next(error);
    }
  };

  getMy = async ({ user }, res, next) => {
    try {
      const fields = "role_id,code,description,created_at";
      const permissions = await this.db.get("permission", "role_id", user.role_id, fields);
      res.json({ data: permissions, total: permissions.length });
    } catch (error) {
      next(error);
    }
  };

  create = async ({ user, body }, res, next) => {
    try {
      const result = await checkPermission(user, "add", this.entity);
      if (!result.permitted) return next("FORBIDDEN");
      let data = Array.isArray(body) ? body : [body];
      data = data.map((item) => new Permission({ ...item, created_by: user.id }));
      res.json({ data: await this.db.create(this.entity, data, "*") });
    } catch (error) {
      next(error);
    }
  };

  deleteByCode = async ({ user, params }, res, next) => {
    try {
      const result = await checkPermission(user, "delete", this.entity);
      if (!result.permitted) return next("FORBIDDEN");
      const { sql, values } = this.db.prepareQuery(this.deleteQuery, params);
      await this.db.query(sql, values);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
