import sqlite3 from "sqlite3";
import path from "path";
import { readFileSync } from "fs";
import { promisify } from "node:util";
import { columns, validateData, validateFields } from "../utils/validators/sql-query-validator.js";

class SqliteDB {
  constructor(filename) {
    // Connect to database (or create if it doesn't exist)
    // filename = ":memory:" create the database in RAM disappears when the process ends or the connection is closed

    this.db = new sqlite3.Database(filename, (err) => {
      if (err) console.error("Failed to connect to the SQLite database", err.message);
      else console.log("Connected to SQLite:");
    });

    // Promisify common functions
    this.exec = promisify(this.db.exec.bind(this.db));
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
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

      if (!(await this.get("SELECT id FROM users"))) {
        const script = readFileSync(path.resolve(process.cwd(), "scripts/database/query.sql"), "utf-8");
        await this.exec(script);
      }

      // await this.run(`INSERT INTO users (name, email) VALUES (?,?)`, ["Alice", "alice@example.com"]);

      console.log("Initialized database and tables.");
    } catch (error) {
      console.error("Failed to initialize database and tables", error.message);
    }
  }

  async create(entity, data, fields) {
    let { sql, values } = this.prepareInsertQuery(entity, data);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }
  async getById(entity, id, fields = "*") {
    const invalidColumns = validateFields([...(fields == "*" ? [] : fields.split(","))]);
    if (invalidColumns.length > 0) throw `400-Invalid fields names (${invalidColumns.join(", ")})`;
    return this.get(`SELECT ${fields} FROM ${entity} WHERE id = ?`, id);
  }
  async getByField(entity, field, value, fields = "*") {
    const invalidColumns = validateFields([field, ...(fields == "*" ? [] : fields.split(","))]);
    if (invalidColumns.length > 0) throw `400-Invalid fields names (${invalidColumns.join(", ")})`;
    return this.getAll(`SELECT ${fields} FROM ${entity} WHERE ${field} = ?`, [value]);
  }
  async updateById(entity, data, id, fields) {
    let { sql, values } = this.prepareUpdateQuery(entity, data, id);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }
  async softDelete(entity, id) {
    return this.run(entity, { deleted_at: new Date().toISOString() }, id);
  }
  async deleteByField(entity, field, value) {
    return this.run(`DELETE FROM ${entity} WHERE ${field} = ?`, [value]);
  }

  prepareInsertQuery(entity, data) {
    if (!(data?.length > 0)) throw "400-'data' should be an array of items";
    const error = validateData(data);
    if (error) throw error;

    const fields = Array.from(new Set(data.map((item) => Object.keys(item)).flat()));
    const values = [];

    const placeholders = data
      .map((item) => {
        values.push(...fields.map((f) => item[f] || null));
        return `(${fields.map(() => `?`).join(",")})`;
      })
      .join(",");

    const sql = `INSERT INTO ${entity} (${fields.join(",")}) VALUES ${placeholders}`;

    return { sql, values };
  }

  prepareUpdateQuery(entity, data, id) {
    const fields = Object.keys(data || {});
    if (!(fields.length > 0)) throw "400-'data' should not be empty";
    const error = validateData(data);
    if (error) throw error;

    const values = [];
    const placeholders = fields
      .map((f) => {
        values.push(data[f]);
        return `${f} = ?`;
      })
      .join(",");

    let sql = `UPDATE ${entity} SET ${placeholders}`;

    if (id) {
      values.push(id);
      sql += ` WHERE id = $${values.length}`;
    }
    return { sql, values };
  }

  prepareQuery(baseQuery, data, pagination, deleted, prefix = "") {
    const error = validateData(data);
    if (error) throw error;

    const values = [];
    const placeholders = Object.keys(data)
      .map((k, i) => {
        let v = data[k].value || data[k];
        let op = data[k].operator;

        if (k.includes("id") || columns[k] == "enum") {
          values.push(v.split(","));
          return `${prefix}${k} = IN (?)`;
        }
        const comparisonOperator = op ? op : `LIKE`;
        values.push(v);
        return `${prefix}${k} ${comparisonOperator} ?`;
      })
      .join(" AND ");

    let sql = `${baseQuery} ${placeholders}`;

    if (pagination) {
      if (pagination.orderby) sql += ` ORDER BY ${prefix}${pagination.orderby}`;

      values.push(pagination.limit || 0, pagination.offset || 0);
      sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    return { sql, values };
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
