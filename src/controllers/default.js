import sqliteDB from "../providers/sqlite.js";
import checkPermission from "../config/rbac-check.js";
import { removeImmutableFields } from "../utils/validators/sql-query-validator.js";
import { cleanUpOldFiles } from "../services/all.js";
import path from "node:path";

export default class DefaultController {
  constructor(entity) {
    this.db = sqliteDB;
    this.entity = entity;
    this.createQuery = `INSERT INTO ${entity} `;
    this.selectQuery = `SELECT *, COUNT(*) OVER() AS total FROM ${this.entity} WHERE`;
    // this.updateQuery = `UPDATE ${this.entity} SET`;
    this.deleteQuery = `DELETE FROM ${this.entity} WHERE`;
  }

  get = async ({ user, query, pagination }, res, next) => {
    try {
      // Todo: ask AI how to perform the query only of the user linked to a role that has permission xxx
      // SELECT EXISTS(SELECT 1 FROM role WHERE id = 'xxx');
      // SELECT COUNT(\*) FROM permission WHERE role_id = 'xxx';
      const { sql, values } = this.db.prepareQuery(this.selectQuery, query, pagination);
      const data = await this.db.getAll(sql, values);
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      const result = await checkPermission(user, "view", this.entity, data);
      // if (!result.permitted) return next("FORBIDDEN");
      res.json({ data: result.data, total });
    } catch (error) {
      next(error);
    }
  };

  getDeleted = async ({ user, query, pagination }, res, next) => {
    try {
      const result = await checkPermission(user, "view", this.entity, []);

      const { sql, values } = this.db.prepareQuery(this.selectQuery, query, pagination, result.superuser);
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
      const result = await checkPermission(user, "add", this.entity);
      if (!result.permitted) return next("FORBIDDEN");
      const created_by = user.id;

      let data = Array.isArray(body) ? body : [body];
      data = data.map((d) => ({ ...removeImmutableFields(d, this.entity == "old_personnel"), created_by }));
      data = await this.db.create(this.entity, file ? [data[0]] : data, "*");

      if (file) {
        const document = { reference_id: data[0]?.id, type: this.entity, file_path: file.path, created_by };
        if (data[0]?.identity_id) document.identity_id = data[0]?.identity_id;
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
      const data = removeImmutableFields(body, this.entity == "old_personnel");
      delete data.identity_id;
      const result = await checkPermission(user, "edit", this.entity, [{ ...data, id: params.id }]);
      if (!result.permitted) return next("FORBIDDEN");
      await this.db.updateById(this.entity, data, params.id);
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  deleteById = async ({ user, params }, res, next) => {
    try {
      const result = await checkPermission(user, "delete", this.entity);
      if (!result.permitted) return next("FORBIDDEN");
      if (!result.superuser) await this.db.softDeleteById(this.entity, params.id);
      else {
        const doc = (await this.db.get("document", "reference_id", params.id))[0];
        if (doc) {
          await cleanUpOldFiles(path.resolve(doc.file_path));
          await this.db.deleteByField("document", "reference_id", params.id);
        }
        await this.db.deleteByField(this.entity, "id", params.id);
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  restore = async ({ user, params }, res, next) => {
    try {
      const result = await checkPermission(user, "edit", this.entity, [{ deleted_at: null }]);
      if (!result.permitted) return next("FORBIDDEN");
      const data = await this.db.updateById(this.entity, { deleted_at: null }, params.id);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };
}
