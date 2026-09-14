-- Select the database
USE altrium_fresh_db;

-- 1. List all tables
SHOW TABLES;

-- 2. Check the users table structure
DESCRIBE users;

-- 3. Show all users
SELECT id, name, role, department, manager_id
FROM users
ORDER BY id;

-- 4. Count users by role
SELECT role, COUNT(*) AS total_users
FROM users
GROUP BY role
ORDER BY total_users DESC;

-- 5. Count users in each department
SELECT department, COUNT(*) AS total_users
FROM users
GROUP BY department
ORDER BY department;

-- 6. Show each user and their manager (self-join)
SELECT
    employee.id,
    employee.name AS employee_name,
    employee.role,
    employee.department,
    manager.name AS manager_name
FROM users AS employee
LEFT JOIN users AS manager
    ON employee.manager_id = manager.id
ORDER BY employee.department, employee.id;

-- 7. Show plans with recipient and assigning manager names
SELECT
    p.id,
    p.title,
    p.type,
    recipient.name AS recipient_name,
    manager.name AS assigned_by,
    p.due_date,
    p.status
FROM plans AS p
LEFT JOIN users AS recipient
    ON p.recipient_id = recipient.id
LEFT JOIN users AS manager
    ON p.manager_id = manager.id
ORDER BY p.id;

-- 8. Check all PIP deadlines
SELECT id, title, due_date, status
FROM plans
WHERE type = 'pip'
ORDER BY id;

-- 9. Find incorrect or missing PIP deadlines
-- An empty result means every PIP matches the deadline policy.
SELECT id, title, due_date
FROM plans
WHERE type = 'pip'
  AND (
      due_date IS NULL
      OR due_date <> '2027-08-30'
  );

-- 10. Count plans by type and status
SELECT type, status, COUNT(*) AS total_plans
FROM plans
GROUP BY type, status
ORDER BY type, status;

-- 11. Count evidence submissions for each plan
-- Includes plans with zero submissions.
SELECT
    p.id,
    p.title,
    p.type,
    COUNT(e.id) AS evidence_submissions
FROM plans AS p
LEFT JOIN evidence AS e
    ON e.plan_id = p.id
GROUP BY p.id, p.title, p.type
ORDER BY p.id;

-- 12. Show table definitions, including keys and constraints
SHOW CREATE TABLE users;
SHOW CREATE TABLE plans;

-- 13. List all foreign-key relationships
SELECT
    TABLE_NAME AS child_table,
    COLUMN_NAME AS child_column,
    REFERENCED_TABLE_NAME AS parent_table,
    REFERENCED_COLUMN_NAME AS parent_column
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;