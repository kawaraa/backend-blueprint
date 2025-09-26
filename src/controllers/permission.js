import Controller from "./default.js";
import checkPermission from "../services/rbac-check.js";
import Permission from "../models/permission.js";
const permissions = jsonRequire("src/config/permissions.json");

export default class PermissionController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
  }

  getPermissionList = async ({ user }, res, next) => {
    try {
      const result = await checkPermission(user, "add", this.entity);
      if (!result.permitted) throw "FORBIDDEN";
      res.json({ data: permissions });
    } catch (error) {
      next(error);
    }
  };

  getMy = async ({ user }, res, next) => {
    try {
      const q = "SELECT role_id,code,description,created_at FROM  permission WHERE role_id = ?";
      const permissions = await this.db.getAll(q, [user?.role_id]);
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  };

  create = async ({ user, body }, res, next) => {
    try {
      const result = await checkPermission(user, "add", this.entity, body);
      if (!result.permitted) throw "FORBIDDEN";
      res.json(await this.db.create(this.entity, p.data, "*"));
    } catch (error) {
      next(error);
    }
  };

  deleteByRoleIdAndCode = async ({ user, params }, res, next) => {
    try {
      const result = await checkPermission(user, "delete", this.entity, [], params);
      if (!result.permitted) throw "FORBIDDEN";
      await this.db.delete(this.entity, p.params);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
