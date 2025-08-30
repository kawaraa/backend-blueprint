
-- RBAC declaration syntax should be like this: {endpoint:rule}
-- {users:superuser} mean only the superuser can see and update all users
-- {contact:user} mean the superuser and the user who created it can see and update the contact
-- {input-field:branch} mean is the superuser or users with type ADMIN in the same branch can see and update the input_field
-- {translation:allUsers} mean all logged in users can see and only the superuser can update the translation
-- {product:public} mean it's public and just the superuser and the user who created it can see and update the product

-- CREATE DATABASE IF NOT EXISTS main; -- (Not needed in SQLITE)
-- USE main; -- use main Database. (Not needed in SQLITE)

CREATE TABLE IF NOT EXISTS users ( -- {users:superuser}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  created_by INTEGER NOT NULL, -- immutable
  deleted_at TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES role(id),
  FOREIGN KEY (branch_id) REFERENCES branch(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Role-Based Access Control (RBAC) System
-- Permission Groups/Role table
CREATE TABLE IF NOT EXISTS role ( -- {role:superuser}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  name VARCHAR(100) UNIQUE NOT NULL CHECK(name IN (
    'SUPERVISOR', 'ADMIN', 'SYSTEM_ADMIN', 'OFFICER', 
    'ENLISTED', 'PERSONNEL', 'CITIZEN', 'AGENT'
  )),
  description TEXT,
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Group/Role-Permission Mapping table. the code is taken from config/permissions.json file
CREATE TABLE IF NOT EXISTS permission ( -- {permission:superuser}
  role_id INTEGER NOT NULL, -- immutable
  code VARCHAR(100) NOT NULL, -- immutable -- 'view:entity:record:field' E.g. '*:*:*:*'
  description TEXT,
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  PRIMARY KEY (role_id, code),
  FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS branch ( -- {branch:superuser}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  name VARCHAR(150) NOT NULL,
  description TEXT,
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  FOREIGN KEY (created_by) REFERENCES users(id)
);

----- Not supported in SQLITE:
-- ALTER TABLE users ADD CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES role(id);
-- ALTER TABLE users ADD CONSTRAINT fk_users_branch_id FOREIGN KEY (branch_id) REFERENCES branch(id);

CREATE TABLE contact ( -- {contact:user}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  user_id INTEGER NOT NULL, -- immutable
  type VARCHAR(100) NOT NULL,
  value VARCHAR(150) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiration_date TEXT NOT NULL DEFAULT (DATE('now', '+3 years'))
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE address ( -- {address:user}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  user_id INTEGER NOT NULL, -- immutable
  country VARCHAR(50) NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  postal_code VARCHAR(10), -- Or neighborhood VARCHAR(50),
  street_line2 VARCHAR(200), -- Additional info e.g. neighborhood
  street_line1 VARCHAR(200) NOT NULL, -- E.g. street
  note VARCHAR(250), -- Some guides
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product ( -- {product:public}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
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
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branch(id),
  FOREIGN KEY (owner) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  actor_id TEXT NOT NULL,
  actor_name VARCHAR(50),
  ip_address VARCHAR(50),
  device VARCHAR(250), -- actor_agent, actor_device or service_name
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ACCESS'
  entity VARCHAR(50) NOT NULL, -- Table name
  record VARCHAR(100) NOT NULL, -- Record id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  old_data TEXT,  -- SQLite doesn't have JSONB; use TEXT or BLOB
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

-- System UI translation table
CREATE TABLE IF NOT EXISTS translation ( -- {translation:allUsers}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  article VARCHAR(50) NOT NULL,
  text_a TEXT NOT NULL,
  text_b TEXT NOT NULL,
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  UNIQUE (text_a, text_b),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- System UI form input field table
CREATE TABLE input_field ( -- {input-field}
  id INTEGER PRIMARY KEY AUTOINCREMENT, -- immutable
  form VARCHAR(50) NOT NULL,
  label VARCHAR(250) NOT NULL,
  name VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  branch_id INTEGER,
  created_by INTEGER NOT NULL, -- immutable
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- immutable
  UNIQUE (form, name),
  FOREIGN KEY (branch_id) REFERENCES branch(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Trigger in SQLITE:

-- Generating UUID for branch table.
-- CREATE TRIGGER IF NOT EXISTS branch_id_gen BEFORE INSERT ON branch
-- BEGIN
--   SET NEW.id = lower(hex(randomblob(16)));
-- END;

-- Update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS product_updated_at_trigger
AFTER UPDATE ON product
FOR EACH ROW
BEGIN
  UPDATE product 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_product_category ON product(category);
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);
CREATE INDEX IF NOT EXISTS idx_product_branch_id ON product(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_sku ON product(sku);
CREATE INDEX IF NOT EXISTS idx_translation_article ON translation(article);
CREATE INDEX IF NOT EXISTS idx_input_field_form ON input_field(form);
