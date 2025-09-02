import { Pool } from "pg";
import { columns, validateData, validateFields } from "../utils/sql-query-validator.js";

class PostgresqlDB {
  constructor(user, host, database, psw, port) {
    // prepare Postgresql Db Connection
    this.dbPool = new Pool({ user, host, database, password: psw, port: Number(port) });
  }

  async query(sqlQuery, params) {
    return this.dbPool
      .query(sqlQuery, params)
      .then((res) => res.rows)
      .catch((err) => {
        console.log("PostgresqlDB: ", err);
        const error = err.message.replace("for type", "").split(" ");
        const invalidFields = Object.keys(columns).find((c) => error.includes(c));
        throw `400-Invalid input${!invalidFields ? "" : ` near '${invalidFields}'`}`; // UNPROCESSABLE_ENTITY
      });
  }

  exec = async (sqlQuery, params) => this.query(sqlQuery, params);
  run = async (sqlQuery, params) => this.query(sqlQuery, params);
  get = async (sqlQuery, params) => (await this.query(sqlQuery, params))[0];
  getAll = async (sqlQuery, params) => this.query(sqlQuery, params);

  async create(entity, data, fields) {
    // data.forEach((d) => delete d.id);
    let { sql, values } = this.prepareInsertQuery(entity, data);
    return this.query(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }
  async getByField(entity, field, value, fields = "*") {
    const invalidColumns = validateFields([field, ...(fields == "*" ? [] : fields.split(","))]);
    if (invalidColumns.length > 0) throw `400-Invalid fields names (${invalidColumns.join(", ")})`;
    return this.query(`SELECT ${fields} FROM ${entity} WHERE ${field} = $1`, [value]);
  }
  async updateById(entity, data, id, fields) {
    let { sql, values } = this.prepareUpdateQuery(entity, data, id);
    return this.query(sql + (!fields ? "" : ` RETURNING ${fields}`), values);
  }
  async softDelete(entity, id) {
    return this.update(entity, { deleted_at: new Date().toISOString() }, id);
  }
  async deleteByField(entity, field, value) {
    return this.query(`DELETE FROM ${entity} WHERE ${field} = $1`, [value]);
  }

  prepareInsertQuery(entity, data) {
    if (!(data?.length > 0)) throw "400-'data' should be an array of items";
    const error = validateData(data);
    if (error) throw error;

    const fields = Array.from(new Set(data.map((item) => Object.keys(item)).flat()));
    const values = [];
    let idx = 0;

    const placeholders = data
      .map((item) => {
        values.push(...fields.map((f) => item[f] || null));

        return `(${fields.map(() => `$${(idx += 1)}`).join(",")})`;
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
      .map((f, i) => {
        values.push(data[f]);
        return `${f} = $${i + 1}`;
      })
      .join(",");

    let sql = `UPDATE ${entity} SET ${placeholders}`;
    if (id) {
      values.push(id);
      sql += ` WHERE id = $${values.length}`;
    }
    return { sql, values };
  }

  prepareSelectQuery(baseQuery, params, pagination, deleted, prefix = "") {
    const error = validateData(params);
    if (error) throw error;

    const values = [];
    const placeholders = Object.keys(params)
      .map((k, i) => {
        let v = params[k].value || params[k];
        let op = params[k].operator;
        if (k.includes("id") || columns[k] == "enum") {
          values.push(v.split(","));
          return `${prefix}${k} = ANY($${i + 1})`;
        }
        const comparisonOperator = op ? op : `ILIKE`;
        values.push(comparisonOperator == "ILIKE" ? `%${v}%` : v);
        return `${prefix}${k} ${comparisonOperator} $${i + 1}`;
      })
      .join(" AND ");

    let sql = `${baseQuery} ${prefix}deleted_at IS${deleted ? " NOT" : ""} NULL ${
      placeholders ? "AND " + placeholders : ""
    }`;

    if (pagination) {
      if (pagination.orderby) sql += ` ORDER BY ${prefix}${pagination.orderby}`;

      values.push(pagination.limit || 0, pagination.offset || 0);
      sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    return { sql, values };
  }

  // #getOperator(key){
  //   // const a= ["type"]
  //   const conditionalOperator = k.includes("id") ? `=` : `ILIKE`;
  // }
}

const postgresqlDB = new PostgresqlDB(
  process.env.DB_USER,
  process.env.DB_HOST,
  process.env.DB_NAME,
  process.env.DB_PSW,
  process.env.DB_PORT
);

export default postgresqlDB;

// Usage
// ✅ Safe — prevents SQL injection
// const result = await postgresqlDB.query("SELECT * FROM users WHERE id = $1", [xxx]);
// const result = await postgresqlDB.query("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *", ["xxx", "xx@xx.com"]);
