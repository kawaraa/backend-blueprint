import Controller from "./default.js";

export default class PermissionController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
  }

  getPermissionList = async ({ user }, res, next) => {
    try {
      const p = await this.checkPermission(user, "add", this.entity);
      if (!p.permitted) throw "FORBIDDEN";

      const permissions = {};
      Object.keys(this.db.validator.schema).map((entity) => {
        if (!permissions[entity]) permissions[entity] = {};
        const { fields } = this.db.validator.schema[entity];
        const mutableFieldsPermissions = Object.keys(fields)
          .filter((f) => !fields[f].immutable)
          .map((f) => `*:${f}`);
        permissions[entity].add = [`*:*`];
        permissions[entity].view = [`*:*`].concat(mutableFieldsPermissions);
        permissions[entity].edit = [`*:*`].concat(mutableFieldsPermissions);
        permissions[entity].delete = ["*:*", "self:*"];
      });

      res.json(permissions);
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
      const result = await this.checkPermission(user, "add", this.entity, body);
      if (!result.permitted) throw "FORBIDDEN";
      res.json(await this.db.create(this.entity, p.data, "*"));
    } catch (error) {
      next(error);
    }
  };

  deleteByRoleIdAndCode = async ({ user, params }, res, next) => {
    try {
      const result = await this.checkPermission(user, "delete", this.entity, [], params);
      if (!result.permitted) throw "FORBIDDEN";
      await this.db.delete(this.entity, p.params);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
