-- Enable foreign key support (important for SQLite)
-- PRAGMA foreign_keys = ON;

-- 1. Create the superuser.
-- 2. Create "*" role for the superuser.
-- 3. Add "*:*:*:*" permission to the superuser role.
-- 4. Create "Consumer" role for Consumers.
-- 6. Add the required permissions to the "Consumer" role E.g. "view:users:self:*","edit:users:self:*".
-- 7. Create "Consumers" group for the new registered users

-- 1. Insert sample roles
INSERT INTO role (name, description) VALUES
('SUPERVISOR', 'Supervisor role with elevated permissions'),
('ADMIN', 'Administrator role for system management'),
('SYSTEM_ADMIN', 'System administrator with full access'),
('OFFICER', 'Officer role with specific privileges'),
('ENLISTED', 'Enlisted personnel role'),
('PERSONNEL', 'General personnel role'),
('CITIZEN', 'Standard citizen/user role'),
('AGENT', 'External agent role');

-- 2. Insert sample permissions
INSERT INTO permission (role_id, code, description) VALUES
(1, '*:*:*:*', 'Supervisor has all permissions'),
(2, 'view:*:*:*', 'Admin can view all records'),
(2, 'edit:*:*:*', 'Admin can edit all records'),
(3, '*:*:*:*', 'System admin has all permissions'),
(4, 'view:products:*:*', 'Officer can view products'),
(4, 'edit:products:*:*', 'Officer can edit products'),
(5, 'view:products:own:*', 'Enlisted can view own products'),
(6, 'view:products:own:*', 'Personnel can view own products'),
(7, 'view:products:public:*', 'Citizen can view public products'),
(8, 'view:products:limited:*', 'Agent has limited product view');

-- 3. Insert sample branches
INSERT INTO branch (name, description) VALUES
('Headquarters', 'Main headquarters branch'),
('North Branch', 'Northern regional branch'),
('South Branch', 'Southern regional branch'),
('East Branch', 'Eastern regional branch'),
('West Branch', 'Western regional branch');

-- 4. Insert sample users (password is "password123" hashed with bcrypt)
INSERT INTO users (name, username, password_hash, type, role_id, branch_id, status, last_login) VALUES
('John Smith', 'john.smith', '$2b$10$wb4aUrCh9X89uLcX1UPjNOaL8uxrQxitB8P2oSeEvcXHgB64J2x5e', 'INTERNAL', 1, 1, 'ACTIVE', datetime('now', '-1 day')),
('Jane Doe', 'jane.doe', '$2b$10$wb4aUrCh9X89uLcX1UPjNOaL8uxrQxitB8P2oSeEvcXHgB64J2x5e', 'INTERNAL', 2, 1, 'ACTIVE', datetime('now', '-2 days')),
('Bob Johnson', 'bob.johnson', '$2b$10$wb4aUrCh9X89uLcX1UPjNOaL8uxrQxitB8P2oSeEvcXHgB64J2x5e', 'INTERNAL', 4, 2, 'ACTIVE', datetime('now', '-3 days')),
('Alice Brown', 'alice.brown', '$2b$10$wb4aUrCh9X89uLcX1UPjNOaL8uxrQxitB8P2oSeEvcXHgB64J2x5e', 'INTERNAL', 5, 3, 'ACTIVE', datetime('now', '-4 days')),
('Charlie Wilson', 'charlie.wilson', '$2b$10$wb4aUrCh9X89uLcX1UPjNOaL8uxrQxitB8P2oSeEvcXHgB64J2x5e', 'EXTERNAL', 7, NULL, 'ACTIVE', datetime('now', '-5 days')),
('Diana Prince', 'diana.prince', '$2b$10$wb4aUrCh9X89uLcX1UPjNOaL8uxrQxitB8P2oSeEvcXHgB64J2x5e', 'EXTERNAL', 8, NULL, 'PENDING', NULL);

-- 5. Insert sample products
INSERT INTO products (owner, name, description, sku, category, price, cost, quantity, min_stock_level, weight_kg, dimensions, branch_id, status) VALUES
(1, 'Laptop Pro', 'High-performance business laptop', 'LP-1001', 'ELECTRONICS', 1299.99, 899.99, 25, 5, 1.5, '14x9.5x0.7', 1, 'ACTIVE'),
(2, 'Desk Chair', 'Ergonomic office chair', 'DC-2001', 'FURNITURE', 249.99, 149.99, 15, 3, 12.8, '24x24x42', 1, 'ACTIVE'),
(3, 'Wireless Mouse', 'Bluetooth wireless mouse', 'WM-3001', 'ELECTRONICS', 39.99, 19.99, 100, 10, 0.2, '4x2x1', 2, 'ACTIVE'),
(4, 'Notebook Set', 'Premium quality notebooks', 'NS-4001', 'OTHER', 19.99, 8.99, 50, 15, 0.8, '8x6x2', 3, 'ACTIVE'),
(5, 'Energy Drink', 'High-caffeine energy drink', 'ED-5001', 'FOOD', 2.99, 1.29, 200, 50, 0.5, '6x3x3', NULL, 'ACTIVE'),
(1, 'Winter Jacket', 'Waterproof winter jacket', 'WJ-6001', 'CLOTHING', 89.99, 45.99, 30, 5, 1.2, '12x10x3', 1, 'OUT_OF_STOCK');

-- 6. Insert sample log entries
INSERT INTO log (actor_id, actor_name, ip_address, device, action, entity, record, old_data) VALUES
(1, 'John Smith', '192.168.1.100', 'Chrome on Windows', 'CREATE', 'products', '1', NULL),
(2, 'Jane Doe', '192.168.1.101', 'Firefox on Mac', 'UPDATE', 'products', '2', '{"price": 229.99}'),
(3, 'Bob Johnson', '192.168.1.102', 'Safari on iPhone', 'VIEW', 'products', '3', NULL),
(4, 'Alice Brown', '192.168.1.103', 'Chrome on Android', 'DELETE', 'products', '4', '{"name": "Old Notebook Set", "price": 17.99}'),
(5, 'Charlie Wilson', '192.168.1.104', 'Edge on Windows', 'CREATE', 'users', '5', NULL);

-- 7. Insert sample translations
INSERT INTO translation (text_a, text_b) VALUES
('Welcome', 'Bienvenido'),
('Login', 'Iniciar sesión'),
('Logout', 'Cerrar sesión'),
('Products', 'Productos'),
('Users', 'Usuarios'),
('Settings', 'Configuración'),
('Save', 'Guardar'),
('Cancel', 'Cancelar');