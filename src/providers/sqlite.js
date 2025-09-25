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

  #validateError = (err) => {
    console.log("DB: ", err);
    const error = err.message.replace(/for type|"/gim, "").split(" ");
    const invalidField = this.validator.allFields.find((f) => error.includes(f));
    throw `BAD_REQUEST-Invalid input${!invalidField ? "" : ` near '${invalidField}'`}`; // UNPROCESSABLE_ENTITY
  };

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

  async create(entity, data, fields) {
    let { sql, values } = this.prepareInsertQuery(entity, data);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }

  async getById(entity, id, fields = "*") {
    const invalidColumns = this.validator.validateFields([...(fields == "*" ? [] : fields.split(","))]);
    if (invalidColumns.length > 0) throw `BAD_REQUEST-Invalid fields names (${invalidColumns.join(", ")})`;
    return this.getOne(`SELECT ${fields} FROM ${entity} WHERE id = ?`, id);
  }

  async get(entity, params, fields = "*") {
    this.validator.validateData(entity, params);
    const invalidColumns = this.validator.validateFields(fields == "*" ? [] : fields.split(","));
    if (invalidColumns.length > 0) throw `BAD_REQUEST-Invalid fields names (${invalidColumns.join(", ")})`;
    const { placeholders, values } = this.convertObjectToQuery(params, " AND ");
    return this.getAll(`SELECT ${fields} FROM ${entity} WHERE ${placeholders}`, values);
  }

  async update(entity, data, params, fields) {
    let { sql, values } = this.prepareUpdateQuery(entity, data, params);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }

  async softDelete(entity, params) {
    return this.update(entity, { deleted_at: new Date().toISOString() }, params);
  }

  async delete(entity, params) {
    const { placeholders, values } = this.convertObjectToQuery(params, " AND ");
    return this.run(`DELETE FROM ${entity} WHERE ${placeholders}`, values);
  }

  prepareInsertQuery(entity, data) {
    if (!(data?.length > 0)) throw "BAD_REQUEST-'data' should be an array of items";
    if (data.length > 100) throw "BAD_REQUEST-Bulk operation can not be more than 100 items";

    if (!(data?.length > 0)) throw "BAD_REQUEST-'data' should be an array of items";
    if (data.length > 100) throw "BAD_REQUEST-Bulk operation can not be more than 100 items";
    const error = this.validator.validateData(entity, data);
    if (error) throw error;

    const { placeholders, values, fields } = this.convertObjectToQuery(data, ",", "insert");

    const sql = `INSERT INTO ${entity} (${fields.join(",")}) VALUES ${placeholders}`;

    return { sql, values };
  }

  prepareUpdateQuery(entity, data, params) {
    const fields = Object.keys(data || {});
    if (!(fields.length > 0)) throw "BAD_REQUEST-'data' should not be empty";
    const error = this.validator.validateData(entity, data);
    if (error) throw error;

    const { placeholders, values } = this.convertObjectToQuery(data, ",");
    let sql = `UPDATE ${entity} SET ${placeholders}`;
    if (params) {
      const sqlCondition = this.prepareParams(condition, " AND ", null, values.length);
      values.push(...sqlCondition.values);
      sql += ` WHERE ${sqlCondition.placeholders}`;
    }
    return { sql, values };
  }

  prepareSelectQuery(baseQuery, params, pagination, deleted) {
    const entity = this.#getEntityFromQuery(baseQuery);
    const fields = this.validator.schema[entity].fields;

    const { placeholders, values } = this.convertParamsToQuery(entity, params);

    if (!fields.deleted_at) baseQuery += ` ${placeholders}`;
    else {
      baseQuery += ` ${entity}.deleted_at IS ${deleted ? "NOT" : ""} NULL ${placeholders}`;
      if (placeholders) baseQuery += " AND " + placeholders;
    }

    if (pagination) {
      if (pagination.orderby) baseQuery += ` ORDER BY ${entity}.${pagination.orderby}`;
      values.push(pagination.limit, pagination.offset);
      baseQuery += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    return { sql: baseQuery, values };
  }

  prepareParams(entity, params) {
    const error = this.validator.validateData(entity, params);
    if (error) throw error;

    const fields = this.validator.schema[entity]?.fields;
    const values = [];

    let placeholders = Object.keys(params)
      .map((k) => {
        const value = (params[k].value || params[k]).split(",");
        const operator = params[k].operator;
        const type = fields[k]?.type;

        if (k.includes("id") || k.includes("created_by") || type == "enum") {
          values.push(value);
          return `${entity}.${k} = IN (?)`;
        } else if (type == "number" || type == "date") {
          values.push(...value);
          if (!value[1]) return `${entity}.${k} ${operator || "="} ?`;
          else return `${entity}.${k} BETWEEN ? AND ?`;
        } else if (type == "boolean") {
          values.push(value);
          return `${entity}.${k} = ?`;
        } else {
          values.push(value);
          return `${entity}.${k} ${operator ? operator : "LIKE"} ?`;
        }
      })
      .join(" AND ");

    // Example: placeholders: ``, values: []
    return { placeholders, values };
  }

  prepareData(data, separator = ",") {
    const values = [];
    const fields = Array.from(new Set(data.flatMap((item) => Object.keys(item))));
    const placeholders = data
      .map((item) => {
        values.push(...fields.map((f) => item[f] || null));
        return `(${fields.map(() => `?`).join(",")})`;
      })
      .join(separator);

    // Example: placeholders: ``, values: []
    return { placeholders, values };
  }

  prepareParamsForJoinSelect(entityWithParams) {
    let placeholders = [];
    const values = [];
    let index = 0;

    Object.keys(entityWithParams).forEach((entity) => {
      const q = this.convertParamsToQuery(entity, entityWithParams[entity], index);
      if (q.values.length) {
        values.push(...q.values);
        index += values.length;
        placeholders.push(`${q.placeholders}`);
      }
    });

    placeholders = placeholders.join(" AND ");
    return { placeholders, values };
  }

  generateJoinQuery(tables, params, pagination, joinType = "LEFT", linKey = "parent_id", deleted = false) {
    if (tables.length < 2) throw "BAD_REQUEST-Need at least two entities for a join";
    // const paramsFields = Object.keys(params);
    // const invalidFields = [];
    const selectParts = [];
    const joinClauses = [];
    const newParams = {};
    let sql = "";
    let orderbyEntity = tables[0];

    // Iterate over all other tables (children)
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const entity = this.validator.schema[table]?.fields;
      const isParent = i < 1;

      if (!entity) throw "BAD_REQUEST-Invalid entity name";
      if (!newParams[table]) newParams[table] = {};

      selectParts.push(
        Object.keys(entity)
          .map((f) => {
            if (f == pagination.orderby) orderbyEntity = table;
            if (params[f] && (!isParent || f != "type")) newParams[table][f] = params[f];
            const newName = isParent ? "" : ` AS ${table}_${f}`;
            return `${table}.${f}${newName}`;
          })
          .join(",")
      );

      if (i > 0) {
        joinClauses.push(
          `${tables[0]} ${joinType} JOIN ${tables[i]} ON ${tables[0]}.id = ${tables[i]}.${linKey}`
        );
      }
    }
    sql = `SELECT ${selectParts.join(",")}, COUNT(*) AS total FROM ${joinClauses.join(" ")}`;
    sql += ` WHERE ${tables[0]}.deleted_at IS ${deleted ? "NOT" : ""} NULL`;

    if (joinType == "LEFT") Object.keys(newParams).forEach((t, i) => i > 0 && delete newParams[t]);
    else delete newParams[tables[0]];

    const { placeholders, values } = this.prepareParamsForJoinSelect(newParams);
    if (values.length) sql += " AND " + placeholders;

    if (pagination) {
      if (pagination.orderby) sql += ` ORDER BY ${orderbyEntity}.${pagination.orderby}`;
      values.push(pagination.limit, pagination.offset);
      sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    return { sql, values };

    // Usage: const join = this.db.generateJoinQuery(["citizen", "application"], params, null, "LEFT", "parent_id");
  }

  convertFieldsToQuery(fields, prefix = "") {
    if (fields.length < 1) return prefix + "*";
    return prefix + fields.join(`,${prefix}`).trim();
  }

  generateQuery(entity, params, pagination, joinType = "LEFT", deleted = false) {
    const { parent, fields } = this.validator.schema[entity];

    // baseQuery, params, pagination, deleted
    if (!this.validator.schema[parent]) {
      let sql = "";
      const { placeholders, values } = this.convertParamsToQuery(entity, params);

      if (!fields.deleted_at) sql += ` ${placeholders}`;
      else {
        sql += ` ${entity}.deleted_at IS ${deleted ? "NOT" : ""} NULL ${placeholders}`;
        if (placeholders) sql += " AND " + placeholders;
      }

      if (pagination) {
        if (pagination.orderby) sql += ` ORDER BY ${entity}.${pagination.orderby}`;
        values.push(pagination.limit, pagination.offset);
        sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
      }

      return { sql, values };
    } else {
      const tables = [parent, entity];
      const selectParts = [];
      const joinClauses = [];
      const newParams = {};
      let sql = "";
      let orderbyEntity = tables[0];

      // Iterate over all other tables (children)
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        const entity = this.validator.schema[table]?.fields;
        const isParent = i < 1;
        if (!newParams[table]) newParams[table] = {};

        selectParts.push(
          Object.keys(entity)
            .map((f) => {
              if (f == pagination.orderby) orderbyEntity = table;
              // if (params[f] && (!isParent || f != "type")) newParams[table][f] = params[f];
              const newName = isParent ? "" : ` AS ${table}_${f}`;
              return `${table}.${f}${newName}`;
            })
            .join(",")
        );

        if (i > 0) {
          let linKey = `${tables[0]}_id`;
          joinClauses.push(
            `${tables[0]} ${joinType} JOIN ${tables[i]} ON ${tables[0]}.id = ${tables[i]}.${linKey}`
          );
        }
      }
      sql = `SELECT ${selectParts.join(",")}, COUNT(*) OVER() AS total FROM ${joinClauses.join(" ")}`;
      sql += ` WHERE ${tables[0]}.deleted_at IS ${deleted ? "NOT" : ""} NULL`;

      if (joinType == "LEFT") Object.keys(newParams).forEach((t, i) => i > 0 && delete newParams[t]);
      else delete newParams[tables[0]];

      const { placeholders, values } = this.prepareParamsForJoinSelect(newParams);
      if (values.length) sql += " AND " + placeholders;

      if (pagination) {
        if (pagination.orderby) sql += ` ORDER BY ${orderbyEntity}.${pagination.orderby}`;
        values.push(pagination.limit, pagination.offset);
        sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
      }

      return { sql, values };
    }
    // Usage: const join = this.db.generateJoinQuery(["identity", "hiring_process"], params);
  }

  #getEntityFromQuery(query) {
    return query
      .slice(query.indexOf("FROM") + 5)
      .split(" ")[0]
      .trim();
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
