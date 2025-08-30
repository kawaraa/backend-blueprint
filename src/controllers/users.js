import Controller from "./default.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { checkPermission } from "../config/rbac-check.js";
import User from "../models/user.js";

export default class UserController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.selectQuery = `SELECT id, name, username, type, status, created_at FROM ${this.entity} role_id WHERE id = ?`;
    //  COUNT(*) AS total
  }

  getLoggedInUser = async ({ user }, res, next) => {
    try {
      res.json({ data: await this.db.get(this.selectQuery, [user.id]) });
    } catch (error) {
      next(error);
    }
  };

  update = async ({ user, body, params }, res, next) => {
    try {
      body.role_assignor = user.id;
      const data = new User(body);
      delete data.id;

      const result = await checkPermission(user, "edit", this.entity, [{ ...data, id: params.id }]);
      if (!result.permitted) return next("FORBIDDEN");

      if (body.password) data.password_hash = await bcrypt.hash(body.password, 10);

      if (data.type != "ADMIN") {
        const user = (await this.db.getByField(this.entity, "id", body.id, "type"))[0];
        if (user?.type == "APPLICANT") {
          return next("403-user type 'APPLICANT' can not have admin role");
        }
      }

      await this.db.updateById(this.entity, data, params.id);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
