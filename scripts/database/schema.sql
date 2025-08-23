-- CREATE DATABASE IF NOT EXISTS main;

-- use main Database
-- USE main;

-- Role-Based Access Control (RBAC) System
-- Permission Groups/Role table
CREATE TABLE IF NOT EXISTS role (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL CHECK(name IN (
    'SUPERVISOR', 'ADMIN', 'SYSTEM_ADMIN', 'OFFICER', 
    'ENLISTED', 'PERSONNEL', 'CITIZEN', 'AGENT'
  )),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group/Role-Permission Mapping table. the code is taken from config/permissions.json file
CREATE TABLE IF NOT EXISTS permission (
  role_id INTEGER NOT NULL,
  code VARCHAR(100) NOT NULL, -- 'view:entity:record:field' E.g. '*:*:*:*'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, code),
  FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS branch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Store bcrypt/scrypt hashes
  type VARCHAR(50) NOT NULL,
  -- User-Role/Group Assignment
  role_id INTEGER,
  role_assignor INTEGER,
  role_assigned_at TIMESTAMP,
  branch_id INTEGER,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED')),
  last_login TIMESTAMP,
  failed_attempts SMALLINT DEFAULT 0,
  locked_until TIMESTAMP,
  mfa_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES role(id),
  FOREIGN KEY (branch_id) REFERENCES branch(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner INTEGER,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE,  -- Stock Keeping Unit
  category TEXT NOT NULL CHECK(category IN (
    'ELECTRONICS', 'CLOTHING', 'FOOD', 'BOOKS', 'FURNITURE', 'OTHER'
  )),
  price DECIMAL(10, 2) NOT NULL CHECK(price >= 0),
  cost DECIMAL(10, 2) CHECK(cost >= 0),  -- Cost price
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  min_stock_level INTEGER DEFAULT 0 CHECK(min_stock_level >= 0),
  weight_kg DECIMAL(8, 3) CHECK(weight_kg >= 0),  -- Product weight in kilograms
  dimensions VARCHAR(250),  -- Format: "LxWxH" (e.g., "10.5x8.2x3.0")
  supplier_id VARCHAR(100),  -- Reference to a suppliers table (if you have one)
  branch_id INTEGER,  -- Which branch this product belongs to
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN (
    'ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK', 'COMING_SOON'
  )),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branch(id),
  FOREIGN KEY (owner) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT NOT NULL,
  actor_name VARCHAR(50),
  ip_address VARCHAR(50),
  device VARCHAR(250), -- actor_agent, actor_device or service_name
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ACCESS'
  entity VARCHAR(50) NOT NULL, -- Table name
  record VARCHAR(100) NOT NULL, -- Record id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  old_data TEXT,  -- SQLite doesn't have JSONB; use TEXT or BLOB
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- System UI translation table
CREATE TABLE IF NOT EXISTS translation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text_a TEXT NOT NULL,
  text_b TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (text_a, text_b)
);


-- Trigger in SQLITE:

-- Generating UUID for branch table.
-- CREATE TRIGGER IF NOT EXISTS branch_id_gen BEFORE INSERT ON branch
-- BEGIN
--   SET NEW.id = lower(hex(randomblob(16)));
-- END;

-- Update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS products_updated_at_trigger
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
  UPDATE products 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_branch_id ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
