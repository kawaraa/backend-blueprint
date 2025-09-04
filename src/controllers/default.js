import sqliteDB from "../providers/sqlite.js";
import checkPermission from "../services/rbac-check.js";
import { cleanUpOldFiles } from "../services/all.js";
import path from "node:path";

export default class DefaultController {
  constructor(entity) {
    this.db = sqliteDB;
    this.checkPermission = checkPermission;
    this.entity = entity;
    this.insertQuery = `INSERT INTO ${entity} `;
    this.selectQuery = (f = "*") => `SELECT ${f}, COUNT(*) AS total FROM ${this.entity} WHERE`;
    this.selectParentQuery = (f = "*", parent) =>
      `SELECT ${f}, t2.branch_id AS branch_id COUNT(*) OVER() AS total FROM ${this.entity} t1 LEFT JOIN ${parent} t2 on t1.parent_id = t2.id WHERE`;
    this.updateQuery = `UPDATE ${this.entity} SET`;
    this.deleteQuery = `DELETE FROM ${this.entity} WHERE`;
  }

  get = async ({ user, query, pagination }, res, next) => {
    try {
      if (!user?.id) query.public = true;
      else {
        const p = await this.checkPermission(user, "view", this.entity, [], query);
        if (!p.permitted && this.entity != "branch") throw "FORBIDDEN";
        p.params.created_by = user.id;
      }

      const baseQuery = this.selectQuery(this.db.convertFieldsToQuery(p.fields));
      const { sql, values } = this.db.prepareSelectQuery(baseQuery, p.params, pagination);
      const data = await this.db.getAll(sql, values);
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  create = async ({ user, body, file }, res, next) => {
    try {
      const parentId = body.parent_id || body[0]?.parent_id;
      const created_by = user.id;
      let data = (Array.isArray(body) ? body : [body]).map((d) => {
        const item = this.db.validator.removeImmutableFields(this.entity, d);
        if (parentId) item.parent_id = parentId;
        return item;
      });

      const p = await this.checkPermission(user, "add", this.entity, data);
      if (!p.permitted && this.entity != "branch") throw "FORBIDDEN";

      data = await this.db.create(this.entity, file ? [p.data[0]] : p.data, "*");

      if (file) {
        const document = { reference_id: data[0]?.id, type: this.entity, file_path: file.path, created_by };
        if (parentId) document.parent_id = parentId;
        const documentId = (await this.db.create("document", [document], "id"))[0]?.id;
        data[0].documentId = documentId;
        data[0].document = file.path;
      }
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };

  update = async ({ user, params, body }, res, next) => {
    try {
      body = this.db.validator.removeImmutableFields(this.entity, body);
      const p = await this.checkPermission(user, "edit", this.entity, [body], params);
      if (!p.permitted && this.entity != "branch") throw "FORBIDDEN";
      p.params.created_by = user.id;

      const data = await this.db.update(this.entity, p.data[0], p.params, "id");
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  deleteById = async ({ user, params }, res, next) => {
    try {
      const p = await this.checkPermission(user, "delete", this.entity, [], params);

      if (!p.permitted) throw "FORBIDDEN";
      if (!p.superuser) await this.db.softDelete(this.entity, p.params);
      else {
        const doc = (await this.db.get("document", { reference_id: params.id }))[0];
        if (doc) {
          await cleanUpOldFiles(path.resolve(doc.file_path));
          await this.db.delete("document", { reference_id: params.id });
        }
        await this.db.delete(this.entity, { id: params.id });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getDeleted = async ({ user, query, pagination }, res, next) => {
    try {
      const p = await this.checkPermission(user, "view", this.entity, [], query);
      if (!p.superuser) throw "FORBIDDEN";

      const baseQuery = this.selectQuery(this.db.convertFieldsToQuery(p.fields));

      const { sql, values } = this.db.prepareSelectQuery(baseQuery, p.params, pagination, true);
      const data = await this.db.getAll(sql, values);
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  restore = async ({ user, params }, res, next) => {
    try {
      const p = await this.checkPermission(user, "edit", this.entity, [], params);
      if (!p.superuser) throw "FORBIDDEN";
      const data = await this.db.update(this.entity, { deleted_at: null }, p.params, "id");
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };
}
