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
    this.all = promisify(this.db.all.bind(this.db));
    this.close = promisify(this.db.close.bind(this.db));

    this.#initializeDatabase();
  }

  async #initializeDatabase() {
    try {
      await this.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA cache_size = -20000;
        PRAGMA mmap_size = 200000;
        PRAGMA busy_timeout = 3000;
        PRAGMA synchronous = FULL;
      `);
      // ❌ synchronous = NORMAL means Balance safety and performance
      // ❌ synchronous = FULL; if it's financial, medical transactions

      const script = readFileSync(path.resolve(process.cwd(), "scripts/database/schema.sql"), "utf-8");
      await this.run(script);

      console.log("Initialized database and tables.");
    } catch (error) {
      console.error("Failed to initialize database and tables", error.message);
    }
  }
}

const sqliteDB = new SqliteDB(path.resolve(process.cwd(), "db.sqlite"));

export default sqliteDB;

// Usage:
// const result = await db.run("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
// const users = await db.all("SELECT * FROM users");
// db.run("UPDATE users SET name = ?, email = ? WHERE id = ?", [name, email, id]);
// db.get("SELECT * FROM users WHERE id = ?", [id]);
// db.run("DELETE FROM users WHERE id = ?", [id]);
