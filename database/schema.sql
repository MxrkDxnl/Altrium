
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- -----------------------------------------------------------------------------
-- 1. Table: users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plain_password` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` ENUM('admin','operational_manager','hr_manager','department_manager','team_manager','employee') COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `report_portfolio` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quarter_batch` ENUM('Q1','Q2','Q3','Q4','ALL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` INT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `login_count` INT NOT NULL DEFAULT '0',
  `last_login_at` DATETIME DEFAULT NULL,
  `profile_picture` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_manager_id` (`manager_id`),
  KEY `idx_users_role_dept` (`role`,`department`),
  CONSTRAINT `fk_users_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: plans
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `plans`;
CREATE TABLE `plans` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('PIP','PDP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `quarter` ENUM('Q1','Q2','Q3','Q4') COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` INT NOT NULL,
  `due_date` DATE DEFAULT NULL,
  `status` ENUM('pending','evidence_submitted','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_plans_manager_id` (`manager_id`),
  KEY `idx_plans_recipient_id` (`recipient_id`),
  KEY `idx_plans_cycle` (`quarter`,`year`,`status`),
  CONSTRAINT `fk_plans_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_plans_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: tasks
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('self_review','peer_review','upward_review','downward_review','pip','pdp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `feedback_type` ENUM('self','peer','upward','downward') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` ENUM('pending','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `quarter` ENUM('Q1','Q2','Q3','Q4') COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` INT NOT NULL,
  `message` TEXT COLLATE utf8mb4_unicode_ci,
  `assignee_id` INT DEFAULT NULL,
  `reviewee_id` INT DEFAULT NULL,
  `plan_id` INT DEFAULT NULL,
  `group_subject_ids` JSON DEFAULT NULL,
  `draft_content` JSON DEFAULT NULL,
  `submission_key` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_hash` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_assignee_id` (`assignee_id`),
  KEY `idx_tasks_reviewee_id` (`reviewee_id`),
  KEY `idx_tasks_plan_id` (`plan_id`),
  KEY `idx_tasks_cycle_status` (`quarter`,`year`,`status`),
  KEY `idx_tasks_submission_key` (`submission_key`),
  CONSTRAINT `fk_tasks_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_reviewee` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: reviews
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `content` JSON NOT NULL,
  `submitted_at` DATETIME DEFAULT NULL,
  `task_id` INT DEFAULT NULL,
  `reviewer_id` INT DEFAULT NULL,
  `reviewee_id` INT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviews_task_id` (`task_id`),
  KEY `idx_reviews_reviewer_id` (`reviewer_id`),
  KEY `idx_reviews_reviewee_id` (`reviewee_id`),
  CONSTRAINT `fk_reviews_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_reviewee` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: evidence
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `evidence`;
CREATE TABLE `evidence` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `plan_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `file_path` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` INT NOT NULL,
  `mime_type` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` TEXT COLLATE utf8mb4_unicode_ci,
  `idempotency_key` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_hash` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evidence_plan_recipient_idempotency` (`plan_id`,`recipient_id`,`idempotency_key`),
  KEY `idx_evidence_recipient` (`recipient_id`),
  KEY `idx_evidence_plan` (`plan_id`),
  CONSTRAINT `fk_evidence_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: evidence_feedback
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `evidence_feedback`;
CREATE TABLE `evidence_feedback` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `evidence_id` INT NOT NULL,
  `plan_id` INT NOT NULL,
  `manager_id` INT NOT NULL,
  `feedback_text` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotency_key` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evidence_feedback_idempotency` (`evidence_id`,`manager_id`,`idempotency_key`),
  KEY `idx_evidence_feedback_evidence_id` (`evidence_id`),
  KEY `idx_evidence_feedback_plan_id` (`plan_id`),
  KEY `idx_evidence_feedback_manager_id` (`manager_id`),
  CONSTRAINT `fk_evidence_feedback_evidence` FOREIGN KEY (`evidence_id`) REFERENCES `evidence` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_feedback_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_feedback_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: department_reports
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `department_reports`;
CREATE TABLE `department_reports` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `department` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quarter` ENUM('Q1','Q2','Q3','Q4') COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` INT NOT NULL,
  `title` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviews_summary` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `pip_summary` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `pdp_summary` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` INT NOT NULL,
  `recipient_id` INT NOT NULL,
  `file_path` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` INT NOT NULL,
  `mime_type` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision_number` INT NOT NULL DEFAULT '1',
  `revision_notes` TEXT COLLATE utf8mb4_unicode_ci,
  `is_latest` TINYINT(1) NOT NULL DEFAULT '1',
  `parent_report_id` INT DEFAULT NULL,
  `submission_key` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_hash` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_department_reports_author_id` (`author_id`),
  KEY `idx_department_reports_recipient_id` (`recipient_id`),
  KEY `idx_department_reports_parent_id` (`parent_report_id`),
  KEY `idx_department_reports_dept_cycle` (`department`,`quarter`,`year`),
  KEY `idx_department_reports_submission_key` (`submission_key`),
  CONSTRAINT `fk_dept_reports_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dept_reports_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dept_reports_parent` FOREIGN KEY (`parent_report_id`) REFERENCES `department_reports` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: notifications
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `message` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` TINYINT(1) DEFAULT '0',
  `link` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` INT DEFAULT NULL,
  `user_id` INT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_user_read` (`user_id`,`is_read`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


