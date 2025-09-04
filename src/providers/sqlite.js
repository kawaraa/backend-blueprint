import sqlite3 from "sqlite3";
import path from "path";
import { readFileSync } from "fs";
import { promisify } from "node:util";
import DBValidator from "../utils/db-validator.js";

class SqliteDB {
  constructor(filename) {
    // Connect to database (or create if it doesn't exist)
    // filename = ":memory:" create the database in RAM disappears when the process ends or the connection is closed

    this.validator = DBValidator;
    this.db = new sqlite3.Database(filename, (err) => {
      if (err) console.error("Failed to connect to the SQLite database", err.message);
      else console.log("Connected to SQLite:");
    });

    // Promisify common functions
    this.exec = promisify(this.db.exec.bind(this.db));
    this.run = promisify(this.db.run.bind(this.db));
    this.getOne = promisify(this.db.get.bind(this.db));
    this.getAll = promisify(this.db.all.bind(this.db));
    this.close = promisify(this.db.close.bind(this.db));

    this.#initializeDatabase();
  }

  async #initializeDatabase() {
    try {
      await this.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA cache_size = -20000;
        PRAGMA mmap_size = 200000;
        PRAGMA busy_timeout = 3000;
        PRAGMA synchronous = FULL;
      `);
      // ❌ synchronous = NORMAL means Balance safety and performance
      // ❌ synchronous = FULL; if it's financial, medical transactions

      const script = readFileSync(path.resolve(process.cwd(), "scripts/database/schema.sql"), "utf-8");
      await this.exec(script);

      if (!(await this.getOne("SELECT id FROM users"))) {
        const script = readFileSync(path.resolve(process.cwd(), "scripts/database/query.sql"), "utf-8");
        await this.exec(script);
      }

      // await this.run(`INSERT INTO users (name, email) VALUES (?,?)`, ["Alice", "alice@example.com"]);

      console.log("Initialized database and tables.");
    } catch (error) {
      console.error("Failed to initialize database and tables", error.message);
    }
  }

  async getBranchId(parentId, parentEntity, childEntity, childId) {
    if (parentId) {
      return (await this.getOne(parentEntity, "id", parentId, "branch_id"))[0]?.branch_id;
    } else {
      const q = `SELECT t1.branch_id FROM ${parentEntity} t1 JOIN ${childEntity} t2 ON t1.id = t2.parent_id WHERE t2.id = ?`;
      return (await this.query(q, [childId]))[0]?.branch_id;
    }
  }

  async create(entity, data, fields) {
    let { sql, values } = this.prepareInsertQuery(entity, data);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }
  async getById(entity, id, fields = "*") {
    const invalidColumns = this.validator.validateFields([...(fields == "*" ? [] : fields.split(","))]);
    if (invalidColumns.length > 0) throw `BAD_REQUEST-Invalid fields names (${invalidColumns.join(", ")})`;
    return this.getOne(`SELECT ${fields} FROM ${entity} WHERE id = ?`, id);
  }
  async getByField(entity, field, value, fields = "*") {
    const theFields = [field, ...(fields == "*" ? [] : fields.split(","))];
    const invalidColumns = this.validator.validateFields(theFields);
    if (invalidColumns.length > 0) throw `BAD_REQUEST-Invalid fields names (${invalidColumns.join(", ")})`;
    return this.getAll(`SELECT ${fields} FROM ${entity} WHERE ${field} = ?`, [value]);
  }
  async get(entity, params, fields = "*") {
    this.validator.validateData(params);
    const invalidColumns = this.validator.validateFields(fields == "*" ? [] : fields.split(","));
    if (invalidColumns.length > 0) throw `BAD_REQUEST-Invalid fields names (${invalidColumns.join(", ")})`;
    const { placeholders, values } = this.#convertObjectToQuery(params);
    return this.getAll(`SELECT ${fields} FROM ${entity} WHERE ${placeholders}`, values);
  }
  async update(entity, data, params, fields) {
    let { sql, values } = this.prepareUpdateQuery(entity, data, params);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }
  async softDelete(entity, params) {
    return this.updateByField(entity, { deleted_at: new Date().toISOString() }, params);
  }
  async deleteByField(entity, params) {
    const { placeholders, values } = this.#convertObjectToQuery(params);
    return this.run(`DELETE FROM ${entity} WHERE ${placeholders}`, values);
  }

  prepareInsertQuery(entity, data) {
    if (!(data?.length > 0)) throw "400-'data' should be an array of items";
    if (data.length > 100) throw "400-Bulk operation can not be more than 100 items";

    const error = validateData(data);
    if (error) throw error;

    const { placeholders, values, fields } = this.#convertObjectToQuery(data, ",", "insert");

    const sql = `INSERT INTO ${entity} (${fields.join(",")}) VALUES ${placeholders}`;

    return { sql, values };
  }

  prepareUpdateQuery(entity, data, params) {
    const fields = Object.keys(data || {});
    if (!(fields.length > 0)) throw "400-'data' should not be empty";
    const error = validateData(data);
    if (error) throw error;

    const { placeholders, values } = this.#convertObjectToQuery(data, ",");

    let sql = `UPDATE ${entity} SET ${placeholders}`;

    if (params) {
      const p = this.#convertObjectToQuery(params, ",");
      values.push(...p.values);
      sql += ` WHERE ${p.placeholders}`;
    }
    return { sql, values };
  }

  prepareSelectQuery(baseQuery, params, pagination, deleted, prefix = "") {
    const error = validateData(params);
    const fields = this.validator.schema[entity].fields;
    if (error) throw error;

    fields = Object.keys(params);
    placeholders = fields
      .map((k, i) => {
        let v = params[k].value || params[k];
        let op = params[k].operator;

        if (k.includes("id") || k.includes("created_by") || columns[k] == "enum") {
          values.push(v.split(","));
          return `${prefix}${k} = IN (?)`;
        }
        const comparisonOperator = op ? op : `LIKE`;
        values.push(v);
        return `${prefix}${k} ${comparisonOperator} ?`;
      })
      .join(separator);
    //

    if (!fields.deleted_at) baseQuery += ` ${placeholders}`;
    else {
      if (placeholders) placeholders = "AND " + placeholders;
      baseQuery += ` ${prefix}deleted_at IS ${deleted ? "NOT" : ""} NULL ${placeholders}`;
    }

    if (pagination) {
      if (pagination.orderby) baseQuery += ` ORDER BY ${prefix}${pagination.orderby}`;

      values.push(pagination.limit || 0, pagination.offset || 0);
      baseQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    return { sql: baseQuery, values };
  }

  convertFieldsToQuery(fields, prefix = "") {
    if (fields.length < 1) return prefix + "*";
    return prefix + fields.join(`,${prefix}`).trim();
  }

  #convertObjectToQuery(object, separator = ",", type) {
    const values = [];
    let placeholders = [];
    let fields = [];

    if (type == "insert") {
      fields = Array.from(new Set(object.flatMap((item) => Object.keys(item))));
      placeholders = object
        .map((item) => {
          values.push(...fields.map((f) => item[f] || null));
          return `(${fields.map(() => `?`).join(",")})`;
        })
        .join(separator);
      //
    } else {
      fields = Object.keys(object);
      placeholders = fields
        .map((key) => {
          values.push(object[key]);
          return `${key} = ?`;
        })
        .join(separator);
    }

    return { placeholders, values };
  }
}

const sqliteDB = new SqliteDB(path.resolve(process.cwd(), process.env.DB_SQLITE_FILE));

export default sqliteDB;

// Usage:
// const result = await db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
// const users = await db.all("SELECT * FROM users");
// db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, id]);
// db.get("SELECT * FROM users WHERE id = ?", [id]);
// db.run("DELETE FROM users WHERE id = ?", [id]);
