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

  async get(entity, conditions, fields = "*") {
    this.validator.validateData(entity, conditions);
    const invalidColumns = this.validator.validateFields(fields == "*" ? [] : fields.split(","));
    if (invalidColumns.length > 0) throw `BAD_REQUEST-Invalid fields names (${invalidColumns.join(", ")})`;
    const { placeholders, values } = this.prepareConditions(conditions, " AND ");
    return this.getAll(`SELECT ${fields} FROM ${entity} WHERE ${placeholders}`, values);
  }

  async update(entity, data, conditions, fields) {
    let { sql, values } = this.prepareUpdateQuery(entity, data, conditions);
    return this.run(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }

  async softDelete(entity, conditions) {
    return this.update(entity, { deleted_at: new Date().toISOString() }, conditions);
  }

  async delete(entity, conditions) {
    const { placeholders, values } = this.prepareConditions(conditions, " AND ");
    return this.run(`DELETE FROM ${entity} WHERE ${placeholders}`, values);
  }

  prepareInsertQuery(entity, data) {
    if (!(data?.length > 0)) throw "BAD_REQUEST-'data' should be an array of items";
    if (data.length > 100) throw "BAD_REQUEST-Bulk operation can not be more than 100 items";

    if (!(data?.length > 0)) throw "BAD_REQUEST-'data' should be an array of items";
    if (data.length > 100) throw "BAD_REQUEST-Bulk operation can not be more than 100 items";
    const error = this.validator.validateData(entity, data);
    if (error) throw error;

    // Prepare data e.g.: placeholders: `(?,?),(?,?)`, values: [[v,v],[v,v]]
    const values = [];
    const fields = Array.from(new Set(data.flatMap((item) => Object.keys(item))));
    const placeholders = data
      .map((item) => {
        values.push(fields.map((f) => item[f] || null));
        return `(${fields.map(() => `?`).join(",")})`;
      })
      .join(",");

    const sql = `INSERT INTO ${entity} (${fields.join(",")}) VALUES ${placeholders}`;
    return { sql, values };
  }

  prepareUpdateQuery(entity, item, conditions) {
    const fields = Object.keys(item || {});
    if (!(fields.length > 0)) throw "BAD_REQUEST-'item' should not be empty";
    const error = this.validator.validateData(entity, item);
    if (error) throw error;

    // Prepare item: placeholders: `field1 = ?, field2 = ?`, values: [v, v]
    const values = [];
    const placeholders = fields.map((key) => values.push(item[key]) && `${key} = ?`).join(",");
    let sql = `UPDATE ${entity} SET ${placeholders}`;
    if (conditions) {
      const sqlCondition = this.prepareConditions(conditions, " AND ", null, values.length);
      values.push(...sqlCondition.values);
      sql += ` WHERE ${sqlCondition.placeholders}`;
    }
    return { sql, values };
  }

  generateQuery(entities, conditions, pagination, fieldNames, leftJoin, deleted) {
    if (typeof entities == "string") {
      const parent = this.validator.schema[entities].parent;
      const parentParent = this.validator.schema[parent]?.parent;
      if (!parent) return this.generateSingleQuery(entities, conditions, pagination, fieldNames, deleted);

      entities = [parentParent, parent, entities];
    }

    return this.generateJoinQuery(entities, conditions, pagination, fieldNames, leftJoin, deleted);
  }

  generateSingleQuery(entity, conditions, pagination, fieldNames, deleted) {
    const schema = this.validator.schema[entity].fields;
    const selectedFields = fieldNames?.join(",") || "*";

    let sql = `SELECT ${selectedFields}, COUNT(*) AS total FROM ${entity} WHERE`;
    const { placeholders, values } = this.prepareConditions(entity, conditions);

    if (!schema.deleted_at) sql += ` ${placeholders}`;
    else {
      sql += ` ${entity}.deleted_at IS ${deleted ? "NOT" : ""} NULL`;
      if (placeholders) sql += " AND " + placeholders;
    }

    if (pagination) {
      if (pagination.orderby) sql += ` ORDER BY ${entity}.${pagination.orderby}`;
      values.push(pagination.limit, pagination.offset);
      sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    return { sql, values };
  }

  generateJoinQuery(entities, conditions, pagination, fieldNames, leftJoin, deleted) {
    const [parentParent, parent, child] = entities;
    const join = leftJoin ? "LEFT" : "RIGHT";
    const selectParts = [];

    const newConditions = {};
    const linKey = `${parent}_id`;
    let sql = "";

    // Iterate over all other tables (children)
    for (const entity of entities) {
      let entityFields = Object.keys(this.validator.schema[entity]?.fields);
      newConditions[entity] = {};

      Object.keys(conditions).forEach(
        (f) => entityFields.includes(f) && (newConditions[entity][f] = conditions[f])
      );

      if (fieldNames) entityFields = entityFields.filter((f) => fieldNames.includes(f));

      const sameName =
        entity != parentParent && ((leftJoin && entity == parent) || (!leftJoin && entity == child));

      selectParts.push(
        entityFields.map((f) => `${entity}.${f}${sameName ? "" : ` AS ${entity}_${f}`}`).join(",")
      );
    }

    let joinClauses = `${parent} ${join} JOIN ${entity} ON ${parent}.id = ${entity}.${linKey}`;

    if (parentParent) {
      joinClauses += ` LEFT JOIN ${parentParent} ON ${parentParent}.id = ${parent}.${parentParent}_id`;
    }

    sql = `SELECT ${selectParts.join(",")}, COUNT(*) OVER() AS total FROM ${joinClauses}`;
    sql += ` WHERE ${entities[1]}.deleted_at IS ${deleted ? "NOT" : ""} NULL`;

    const parentFields = Object.keys(newConditions[parent]);
    const childFields = Object.keys(newConditions[child]);
    if (leftJoin) {
      if (!!childFields.length) parentFields.forEach((f) => delete newConditions[child][f]);
    } else {
      if (!!parentFields.length) childFields.forEach((f) => delete newConditions[parent][f]);
    }

    const { placeholders, values } = this.prepareConditionsForJoinQuery(newConditions);
    if (values.length) sql += " AND " + placeholders;

    if (pagination) {
      if (pagination.orderby) sql += ` ORDER BY ${leftJoin ? parent : child}.${pagination.orderby}`;
      values.push(pagination.limit, pagination.offset);
      sql += ` LIMIT ? OFFSET ?`;
    }

    return { sql, values };

    // Usage: const join = this.db.generateJoinQuery(["identity", "hiring_process"], params);
    // Return: { sql: `SELECT t JOIN t2 ON t.id = t2.t_id WHERE t.id = ? ...`, values:[v, ...] }
  }

  prepareConditions(entity, conditions) {
    const error = this.validator.validateData(entity, conditions);
    if (error) throw error;

    const fields = this.validator.schema[entity]?.fields;
    const values = [];

    let placeholders = Object.keys(conditions)
      .map((k) => {
        const value = (conditions[k].value || conditions[k]).split(",");
        const operator = conditions[k].operator;
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

    // Example: placeholders: `field1 = ? AND field2 = ?`, values: [v, v]
    return { placeholders, values };
  }

  prepareConditionsForJoinQuery(entitiesConditions) {
    const placeholders = [];
    const values = [];
    Object.keys(entitiesConditions).forEach((entity) => {
      const q = this.prepareConditions(entity, entitiesConditions[entity]);
      if (q.values.length) {
        values.push(...q.values);
        placeholders.push(`${q.placeholders}`);
      }
    });

    return { placeholders: placeholders.join(" AND "), values };
  }

  // convertFieldsToQuery(fields, prefix = "") {
  //   if (fields.length < 1) return prefix + "*";
  //   return prefix + fields.join(`,${prefix}`).trim();
  // }

  // #getEntityFromQuery(query) {
  //   return query
  //     .slice(query.indexOf("FROM") + 5)
  //     .split(" ")[0]
  //     .trim();
  // }
}

const sqliteDB = new SqliteDB(path.resolve(process.cwd(), process.env.DB_SQLITE_FILE));

export default sqliteDB;

// Usage:
// db.all("SELECT * FROM users");
// db.get("SELECT * FROM users WHERE id = ?", [id]);
// db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
// db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, id]);
// db.run("DELETE FROM users WHERE id = ?", [id]);
