import Controller from "./default.js";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import User from "../models/user.js";

export default class UserController extends Controller {
  constructor(entity, softDelete) {
    super(entity, softDelete);
    this.selectRoleQuery = `SELECT id,group_ids FROM role WHERE id = ?`;
  }

  getLoggedInUser = async ({ user }, res, next) => {
    try {
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  get = async ({ user, query, pagination }, res, next) => {
    try {
      const p = await this.checkPermission(user, "view", this.entity, [], query);
      if (!p.permitted) throw "FORBIDDEN";

      const data = await this.db.query(this.db.generateQuery(this.entity, p.params, pagination, p.fields));
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  create = async ({ user, body }, res, next) => {
    try {
      const p = await this.checkPermission(user, "add", this.entity, body);
      if (!p.permitted) throw "FORBIDDEN";
      await this.#checkUserAndRoleGroup(body.role_id, body.group_ids);

      body.type = "ADMIN";
      body.role_assignor = user.id;
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
      delete body.id;
      body.role_assignor = user.id;
      const userData = new User(body);

      const p = await this.checkPermission(user, "edit", this.entity, userData);
      if (!p.permitted) throw "FORBIDDEN";
      await this.#checkUserAndRoleGroup(userData.role_id, userData.group_ids);

      if (body.password) userData.password_hash = await bcrypt.hash(body.password, 10);

      await this.db.update(this.entity, userData, params);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getDeleted = async ({ user, query, pagination }, res, next) => {
    try {
      const p = await this.checkPermission(user, "view", this.entity, [], query);
      if (!p.permitted) throw "FORBIDDEN";

      const data = await this.db.query(
        this.db.generateQuery(this.entity, p.params, pagination, p.fields, true, true)
      );
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  // This will check whether the user and the role assigned to him are in the same group
  async #checkUserAndRoleGroup(userRoleId, userGroupIds = []) {
    if (!userRoleId) return;
    const role = await this.db.getOne(this.selectRoleQuery, userRoleId);
    if (!role) throw "BAS_REQUEST";
    const roleGroupIds = role.group_ids.split(",");
    if (!userGroupIds.some((id) => roleGroupIds.includes(id))) throw "FORBIDDEN";
  }
}
