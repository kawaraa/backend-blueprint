
-- Recreate a table with preserving All Data

-- 2. Begin a transaction for safety
BEGIN TRANSACTION;

-- 3. Create a new temporary table with the foreign key constraints
CREATE TABLE temp_table (
    id INTEGER PRIMARY KEY,
    role_id INTEGER,
    branch_id INTEGER,
    -- include all your other columns here
    other_column1 TEXT,
    other_column2 INTEGER,
    FOREIGN KEY (role_id) REFERENCES role(id),
    FOREIGN KEY (branch_id) REFERENCES branch(id)
);

-- 4. Copy ALL data from the old table to the new table
INSERT INTO temp_table 
SELECT * FROM your_original_table;

-- 5. Drop the old table
DROP TABLE your_original_table;

-- 6. Rename the temporary table to the original name
ALTER TABLE temp_table RENAME TO your_original_table;

-- 7. Commit the transaction
COMMIT;