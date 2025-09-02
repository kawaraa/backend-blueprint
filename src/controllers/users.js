import Controller from "./default.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import checkPermission from "../services/rbac-check.js";
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

  get = async ({ user, query, pagination }, res, next) => {
    try {
      const result = await this.checkPermission(user, "view", this.entity, [], query);
      if (!result.permitted) throw "FORBIDDEN";

      const data = await this.db.query(
        this.db.prepareSelectQuery(this.selectQuery, result.params, pagination, false, "t1.")
      );
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  create = async ({ user, body }, res, next) => {
    try {
      const result = await this.checkPermission(user, "add", this.entity, [body]);
      if (!result.permitted) throw "FORBIDDEN";

      body.role_assignor = user.id;
      body.type = "ADMIN";
      const newUser = new User(body);
      newUser.password_hash = await bcrypt.hash(body.password || crypto.randomBytes(8).toString("hex"), 10);

      const createdUser = await this.db.create("users", [newUser], "id,name,username,type,branch_id");
      res.json({ data: createdUser });
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

  getDeleted = async ({ user, query, pagination }, res, next) => {
    try {
      const result = await this.checkPermission(user, "view", this.entity, [], query);
      if (!result.superuser) throw "FORBIDDEN";

      const data = await this.db.query(
        this.db.prepareSelectQuery(this.selectQuery, result.params, pagination, true, "t1.")
      );
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };
}
