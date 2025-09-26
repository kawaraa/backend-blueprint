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
    this.selectParentQuery = (f = "*", parent) =>
      `SELECT ${f}, t2.branch_id AS branch_id COUNT(*) OVER() AS total FROM ${this.entity} t1 LEFT JOIN ${parent} t2 on t1.parent_id = t2.id WHERE`;
    this.updateQuery = `UPDATE ${this.entity} SET`;
    this.deleteQuery = `DELETE FROM ${this.entity} WHERE`;
    // this.queryCount = `SELECT t1.field1, t1.field2, t1.field3, (SELECT COUNT(*) FROM other_table t2 WHERE t2.related_field = t1.id) AS row_count FROM main_table t1;`;
    // this.joinCount = `SELECT t1.field1, t1.field2, t1.field3, COUNT(t2.related_field) AS row_count FROM main_table t1 LEFT JOIN other_table t2 ON t1.id = t2.related_field GROUP BY t1.field1, t1.field2, t1.field3;`;
  }

  create = async ({ user, body, file }, res, next) => {
    try {
      const p = await this.checkPermission(user, "add", this.entity, body);
      if (!p.permitted) throw "FORBIDDEN";

      p.data = p.data.map((d) => this.db.validator.removeImmutableFields(this.entity, d));
      data = await this.db.create(this.entity, file ? [p.data[0]] : p.data, "*");

      if (file) {
        let parent = this.db.validator.schema[this.entity].parent;
        parent = this.db.validator.schema[parent].parent || parent; // if these a parent of it's parent
        const created_by = user.id;
        const document = { reference_id: data[0]?.id, type: this.entity, file_path: file.path, created_by };
        if (parent) document.parent_id = data[0][`${parent}_id`];
        const documents = await this.db.create("document", [document], "id,file_path");
        data[0].documents = documents;
      }
      res.json(data);
    } catch (error) {
      next(error);
    }
  };

  get = async ({ user, query, pagination }, res, next) => {
    try {
      let fields;
      if (!user?.id && this.db.validator.schema[this.entity].fields.public) query.public = true;
      else {
        const p = await this.checkPermission(user, "view", this.entity, [], query);
        if (!p.permitted) throw "FORBIDDEN";
        query = p.params;
        fields = p.fields;
      }

      const { sql, values } = this.db.generateQuery(this.entity, query, pagination, fields);
      const data = await this.db.getAll(sql, values);
      const total = +data[0]?.total || 0;
      data.forEach((d) => delete d.total);

      res.json({ data, total });
    } catch (error) {
      next(error);
    }
  };

  update = async ({ user, params, body }, res, next) => {
    try {
      body = this.db.validator.removeImmutableFields(this.entity, body);
      const p = await this.checkPermission(user, "edit", this.entity, [body], params);
      if (!p.permitted) throw "FORBIDDEN";

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
      // if (!p.superuser) {
      //   await this.db.softDelete(this.entity, p.params);
      //   res.json({ success: true });
      // }
      const doc = (await this.db.get("document", { reference_id: params.id }))[0];
      if (doc) {
        await cleanUpOldFiles(path.resolve(doc.file_path));
        await this.db.delete("document", { reference_id: params.id });
      }
      await this.db.delete(this.entity, { id: params.id });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getDeleted = async ({ user, query, pagination }, res, next) => {
    try {
      const p = await this.checkPermission(user, "view", this.entity, [], query);
      if (!p.superuser) throw "FORBIDDEN";

      const { sql, values } = this.db.generateQuery(this.entity, p.params, pagination, p.fields);
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
      res.json(data);
    } catch (error) {
      next(error);
    }
  };
}
