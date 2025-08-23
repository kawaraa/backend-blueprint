# Setup a development DB using Docker:

## spin up a Postgres DB server using Docker:

```
 docker run --name postgresdb \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=interior \
  -p 5432:5432 \
  -v ./database/schema.sql:/docker-entrypoint-initdb.d/00-init.sql \
  -v ./database/query.sql:/docker-entrypoint-initdb.d/01-query.sql \
  -d \
  postgres
```

Scripts execute in alphabetical order (prefix with numbers for ordering) E.g. `00-init.sql` then `01-query.sql`

##### To check DB logs:

`docker logs postgresdb`

##### To ssh into the DB container:

`docker exec -it postgresdb /bin/sh ` then `psql -U admin -d interior`

`docker exec -it postgresdb psql -U admin -d interior`

##### To remove the DB container:

`docker stop postgresdb && docker rm -v postgresdb`

##### Other commands and PostgreSQL-Specific Features:

- `\conninfo`
- `\l`
- `SELECT datname FROM pg_database;`
- `\dt+` Show table/index storage information
- `\dx` List extensions
- `EXPLAIN ANALYZE SELECT...` Show query execution plan
- `SELECT \* FROM pg_stat_activity;` Show running queries
- `pg_dump/pg_restore` Export/import in MySQL mysqldump
- `\s` Show command history
- `\i filename.sql` Execute commands from file

## MySQL vs PostgreSQL Command Cheat Sheet

### Database Operations

| Operation       | MySQL                 | PostgreSQL                                       |
| --------------- | --------------------- | ------------------------------------------------ |
| List databases  | `SHOW DATABASES;`     | `\l` or `SELECT datname FROM pg_database;`       |
| Show table info | `SHOW TABLES;`        | `\dt+`                                           |
| Create database | `CREATE DATABASE db;` | `CREATE DATABASE db;` (Note: No `IF NOT EXISTS`) |
| Delete database | `DROP DATABASE db;`   | `DROP DATABASE db;`                              |
| Switch database | `USE db;`             | `\c db`                                          |

### Table Operations

| Operation         | MySQL                      | PostgreSQL                                                                               |
| ----------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| List tables       | `SHOW TABLES;`             | `\dt` or `SELECT table_name FROM information_schema.tables WHERE table_schema='public';` |
| Describe table    | `DESCRIBE table;`          | `\d table`                                                                               |
| Show create table | `SHOW CREATE TABLE table;` | `\d+ table`                                                                              |
| Rename table      | `RENAME TABLE old TO new;` | `ALTER TABLE old RENAME TO new;`                                                         |
| Truncate table    | `TRUNCATE TABLE table;`    | `TRUNCATE table;`                                                                        |

### User/Role Management

| Operation        | MySQL                                   | PostgreSQL                                     |
| ---------------- | --------------------------------------- | ---------------------------------------------- |
| List users       | `SELECT user FROM mysql.user;`          | `\du` or `SELECT rolname FROM pg_roles;`       |
| Create user      | `CREATE USER user IDENTIFIED BY 'pwd';` | `CREATE ROLE user WITH LOGIN PASSWORD 'pwd';`  |
| Grant privileges | `GRANT ALL ON db.* TO user;`            | `GRANT ALL PRIVILEGES ON DATABASE db TO user;` |

### Query Operations

| Operation            | MySQL               | PostgreSQL                               |
| -------------------- | ------------------- | ---------------------------------------- |
| Limit results        | `LIMIT 10`          | `LIMIT 10` or `FETCH FIRST 10 ROWS ONLY` |
| Offset               | `LIMIT 10 OFFSET 5` | `LIMIT 10 OFFSET 5`                      |
| Explain query        | `EXPLAIN SELECT...` | `EXPLAIN ANALYZE SELECT...`              |
| Show running queries | `SHOW PROCESSLIST;` | `SELECT * FROM pg_stat_activity;`        |

### Data Types

| Type           | MySQL            | PostgreSQL                              |
| -------------- | ---------------- | --------------------------------------- |
| Auto-increment | `AUTO_INCREMENT` | `SERIAL` or `IDENTITY`                  |
| UUID           | `CHAR(36)`       | `UUID` (requires `uuid-ossp` extension) |
| JSON           | `JSON`           | `JSONB` (binary format)                 |

### Common Functions

| Function             | MySQL                 | PostgreSQL                                         |
| -------------------- | --------------------- | -------------------------------------------------- |
| Current time         | `NOW()`               | `CURRENT_TIMESTAMP`                                |
| String concatenation | `CONCAT(str1, str2)`  | `str1 \|\| str2`                                   |
| Type casting         | `CAST(value AS TYPE)` | `value::TYPE`                                      |
| Generate UUID        | `UUID()`              | `gen_random_uuid()` (v13+) or `uuid_generate_v4()` |

### Administrative Commands

| Operation       | MySQL                     | PostgreSQL                          |
| --------------- | ------------------------- | ----------------------------------- |
| Show version    | `SELECT VERSION();`       | `SELECT version();`                 |
| Kill connection | `KILL id;`                | `SELECT pg_terminate_backend(pid);` |
| Export database | `mysqldump db > file.sql` | `pg_dump db > file.sql`             |
| Import database | `mysql db < file.sql`     | `psql db < file.sql`                |

### Client Commands

| Operation    | MySQL CLI          | psql (PostgreSQL)    |
| ------------ | ------------------ | -------------------- |
| Connect      | `mysql -u user -p` | `psql -U user -d db` |
| Command help | `HELP;`            | `\?`                 |
| SQL help     | `HELP SELECT;`     | `\h SELECT`          |
| Quit         | `EXIT` or `QUIT`   | `\q`                 |

### Inserting new records

- Insert single record: `INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');`
- Insert multiple records: `INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2'), ('value3', 'value4');`
- Insert and returns generated values: `INSERT INTO users (name, email) VALUES ('John', 'john@example.com') RETURNING id, created_at;` or use `RETURNING *` to get all columns of inserted row
- Insert JSON: `INSERT INTO products (id, data) VALUES (1, '{"name": "Laptop", "price": 999}'::jsonb)`
- Insert with UUID Generation: `INSERT INTO orders (id, total) VALUES (gen_random_uuid(), 100.00);`
- Insert with upsert like in MySQL "ON DUPLICATE KEY UPDATE": `INSERT INTO inventory (item_id, stock) VALUES (123, 10) ON CONFLICT (item_id) DO UPDATE SET stock = inventory.stock + 10;`
- Insert with ignore duplicates like in MySQL "INSERT IGNORE": `INSERT INTO inventory (item_id, stock) VALUES (123, 10) ON CONFLICT (item_id) ON CONFLICT DO NOTHING;`
- Inserting from Another Table: `INSERT INTO archive_users (id, name) SELECT id, name FROM users WHERE created_at < '2020-01-01';`
- Insert with Default Values: `INSERT INTO users (id, status) VALUES (DEFAULT, DEFAULT);` or just remove "DEFAULT"
- Bulk Loading from File: `\copy table_name FROM '/path/to/file.csv' WITH CSV HEADER;`
- Bulk Loading from File in MySQL: `LOAD DATA INFILE '/path/to/file.csv' INTO TABLE table_name FIELDS TERMINATED BY ',';`

##### Pro Tip

For PostgreSQL, remember:

- All `\` commands must be at the start of a new line in `psql`
- Use `;` to terminate SQL statements (optional for single `\` commands)

## Setup a development Vector DB (Milvus) using Docker

Look into this: https://milvus.io/docs/prerequisite-docker.md

### Dependencies

#### - etcd (Metadata Store)

It's a distributed key-value store used to manage metadata. Milvus needs it to manage **Collections**, **Partitions**, **Indexes**, and **Schema definitions**
We must run etcd alongside Milvus, even in single-node (non-distributed) deployments

#### - minio (Object Storage)

it's a lightweight, self-hosted object storage server. Milvus needs it to stores raw data segments E.g. **vector data**, and **index files**. Also Persistent storage for search and insert operations
We must run minio or another storage backend unless we use a different setup (like local file storage in special Milvus modes).
