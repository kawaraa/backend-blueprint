import Controller from "./default.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import checkPermission from "../config/rbac-check.js";
import User from "../models/user.js";

export default class UserController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.selectQuery = `SELECT t1.id, t1.identity_id, t1.name, t1.username, t1.type, t1.role_id, t1.role_assignor, t1.role_assigned_at, t1.status, t1.created_by, t1.created_at, t1.updated_at, t1.deleted_at, t2.title AS position_title, t3.id AS branch_id, t3.name AS branch, t4.name AS role_name, COUNT(*) OVER() AS total FROM ${this.entity} t1 LEFT JOIN position t2 ON t1.identity_id = t2.identity_id LEFT JOIN branch t3 ON t3.id = t1.branch_id LEFT JOIN role t4 ON t4.id = t1.role_id WHERE`;
    // this.selectQuery = `SELECT t1.id, t1.identity_id, t1.name, t1.username, t1.role_id, t1.role_assignor, t1.role_assigned_at, t1.status, t1.created_by, t1.created_at, t1.updated_at, t2.title AS position_title, t3.id AS branch_id, t3.name AS branch, t4.id AS department_id, t4.name AS department, t5.name AS role_name, COUNT(*) OVER() AS total FROM ${this.entity} t1 LEFT JOIN position t2 ON t1.identity_id = t2.identity_id LEFT JOIN branch t3 ON t2.branch_id = t3.id LEFT JOIN department t4 ON t3.id = t4.branch_id LEFT JOIN role t5 ON t5.id = t1.role_id WHERE`;
  }

  getLoggedInUser = async ({ user }, res, next) => {
    try {
      res.json({ data: await this.db.get(this.selectQuery + " t1.id = $1", [user.id]) });
    } catch (error) {
      next(error);
    }
  };

  get = async ({ user, query, pagination }, res, next) => {
    try {
      query = new User(query);
      const { sql, values } = await this.db.prepareQuery(this.selectQuery, query, pagination, false, "t1.");

      const data = await this.db.getAll(sql, values);
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      const result = await checkPermission(user, "view", this.entity, data);
      res.json({ data: result.data, total });
    } catch (error) {
      next(error);
    }
  };

  getDeleted = async ({ user, query, pagination }, res, next) => {
    try {
      const result = await checkPermission(user, "view", this.entity, []);

      const { sql, values } = this.db.prepareQuery(
        this.selectQuery,
        query,
        pagination,
        result.superuser,
        "t1."
      );
      const data = await this.db.getAll(sql, values);
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  create = async ({ user, body }, res, next) => {
    try {
      const result = await checkPermission(user, "add", this.entity);
      if (!result.permitted) return next("FORBIDDEN");
      const data = new User(body);
      delete data.id;
      data.type = "ADMIN";
      data.created_by = user.id;
      data.password_hash = await bcrypt.hash(body.password || crypto.randomBytes(8).toString("hex"), 10);

      const { sql, values } = this.db.prepareInsertQuery(this.entity, [data]);
      res.json({ data: await this.db.run(sql + " RETURNING *", values) });
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
