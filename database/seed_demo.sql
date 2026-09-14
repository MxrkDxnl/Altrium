-- =============================================================================
-- Altrium Performance Tracker - Shareable Demonstration Dataset
--
-- NOTICE: Contains ONLY fictional organization data and sanitized accounts.
-- Default Demonstration Password for all accounts: 'DemoPassword123!'
--
-- Workflows Included:
--   - Approved 3-tier hierarchy (Company Manager -> Dept Heads -> Team Mgrs -> Employees)
--   - Company Manager PIP / PDP assignment to direct department heads (Dinesh, Chamari, Amaya)
--   - Team Manager plan assignments & review cycles
--   - Sample evidence deliverables & append-only manager feedback
--   - Department summary reports with multi-revision tracking (IT Rev 1 & 2, Finance Rev 1)
--   - Deep-linked notifications & task tracking
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Seed: users (94 accounts)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `department`, `team`, `report_portfolio`, `quarter_batch`, `manager_id`, `profile_picture`, `createdAt`, `updatedAt`) VALUES
  (1, 'Amaya Senanayake', 'amaya.hr@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'hr_manager', 'Human Resources', 'HR', NULL, NULL, 91, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (2, 'Dinesh Jayawardena', 'dinesh.it@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'department_manager', 'IT', 'Management', NULL, NULL, 91, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (3, 'Chamari Perera', 'chamari.finance@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'department_manager', 'Finance', 'Management', NULL, NULL, 91, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (4, 'Sarah Fernando', 'sarah.software@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'IT', 'Software Development', NULL, NULL, 2, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (5, 'Kasun Bandara', 'kasun.qa@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'IT', 'Quality Assurance', NULL, NULL, 2, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (6, 'Asanka Wijesinghe', 'asanka.support@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'IT', 'IT Support and Operations', NULL, NULL, 2, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (7, 'Tharindu Gunaratne', 'tharindu.cyber@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'IT', 'Cyber Security', NULL, NULL, 2, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (8, 'Dilini Rajapakse', 'dilini.uiux@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'IT', 'UI/UX', NULL, NULL, 2, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (9, 'Malan Dissanayake', 'malan.accounting@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'Finance', 'Accounting', NULL, NULL, 3, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (10, 'Chathurika Peiris', 'chathurika.analysis@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'Finance', 'Financial Analysis', NULL, NULL, 3, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (11, 'Nuwan De Silva', 'nuwan.finops@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'team_manager', 'Finance', 'Finance Operations', NULL, NULL, 3, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (12, 'Kavith Perera', 'kavith.perera@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q1', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (13, 'Oshan Wickramasinghe', 'oshan.wickramasinghe2@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q2', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (14, 'Avishka Wijesinghe', 'avishka.wijesinghe3@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q3', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (15, 'Gayan Liyanage', 'gayan.liyanage4@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q1', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (16, 'Suranga Munasinghe', 'suranga.munasinghe5@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q2', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (17, 'Nimal Jayakody', 'nimal.jayakody6@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q3', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (18, 'Dimuthu Karunanayake', 'dimuthu.karunanayake7@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q1', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (19, 'Shehan Rodrigo', 'shehan.rodrigo8@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q2', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (20, 'Shehan Dissanayake', 'shehan.dissanayake9@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q3', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (21, 'Indika Rodrigo', 'indika.rodrigo10@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Software Development', NULL, 'Q3', 4, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (22, 'Nimali Silva', 'nimali.silva@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q1', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (23, 'Bhanuka Fernando', 'bhanuka.fernando12@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q2', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (24, 'Dinuka Jayatilake', 'dinuka.jayatilake13@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q3', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (25, 'Menuka Samarasinghe', 'menuka.samarasinghe14@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q1', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (26, 'Yashoda Welgama', 'yashoda.welgama15@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q2', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (27, 'Ranil Nanayakkara', 'ranil.nanayakkara16@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q3', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (28, 'Sajith Siriwardena', 'sajith.siriwardena17@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q1', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (29, 'Thilina Fernando', 'thilina.fernando18@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q2', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (30, 'Niroshan Silva', 'niroshan.silva19@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q3', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (31, 'Isuru Karunaratne', 'isuru.karunaratne20@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Quality Assurance', NULL, 'Q3', 5, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (32, 'Dhananjaya Bandara', 'dhananjaya.bandara21@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q1', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (33, 'Menuka Wijesinghe', 'menuka.wijesinghe22@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q2', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (34, 'Dimuthu Rodrigo', 'dimuthu.rodrigo23@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q3', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (35, 'Namal Weerasinghe', 'namal.weerasinghe24@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q1', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (36, 'Niroshan Illangakoon', 'niroshan.illangakoon25@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q2', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (37, 'Sumith Mendis', 'sumith.mendis26@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q3', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (38, 'Nimal Hettiarachchi', 'nimal.hettiarachchi27@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q1', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (39, 'Harsha Ekanayake', 'harsha.ekanayake28@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q2', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (40, 'Pathum Silva', 'pathum.silva29@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q3', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (41, 'Udara Gunaratne', 'udara.gunaratne30@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'IT Support and Operations', NULL, 'Q3', 6, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (42, 'Oshan Jayawardena', 'oshan.jayawardena31@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q1', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (43, 'Ashan Gunaratne', 'ashan.gunaratne32@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q2', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (44, 'Tharusha Goonewardena', 'tharusha.goonewardena33@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q3', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (45, 'Namal Senadheera', 'namal.senadheera34@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q1', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (46, 'Milinda Senadheera', 'milinda.senadheera35@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q2', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (47, 'Suresh Jayakody', 'suresh.jayakody36@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q3', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (48, 'Supun Silva', 'supun.silva37@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q1', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (49, 'Udara Wickramasinghe', 'udara.wickramasinghe38@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q2', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (50, 'Menuka Senanayake', 'menuka.senanayake39@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q3', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (51, 'Oshada Hettiarachchi', 'oshada.hettiarachchi40@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'Cyber Security', NULL, 'Q3', 7, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (52, 'Pathum Weerasinghe', 'pathum.weerasinghe41@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q1', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (53, 'Sanka Gunawardena', 'sanka.gunawardena42@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q2', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (54, 'Oshada Rajapaksa', 'oshada.rajapaksa43@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q3', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (55, 'Lasantha Herath', 'lasantha.herath44@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q1', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (56, 'Pradeep Herath', 'pradeep.herath45@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q2', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (57, 'Malith Senadheera', 'malith.senadheera46@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q3', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (58, 'Madhuka Goonewardena', 'madhuka.goonewardena47@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q1', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (59, 'Gihan Herath', 'gihan.herath48@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q2', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (60, 'Dasun Wijesinghe', 'dasun.wijesinghe49@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q3', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (61, 'Madhuka Peiris', 'madhuka.peiris50@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'IT', 'UI/UX', NULL, 'Q3', 8, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (62, 'Sanduni Fernando', 'sanduni.fernando@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q1', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (63, 'Geeth Edirisinghe', 'geeth.edirisinghe52@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q2', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (64, 'Ranil Abeysekara', 'ranil.abeysekara53@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q3', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (65, 'Nuwan Liyanage', 'nuwan.liyanage54@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q1', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (66, 'Avishka Illangakoon', 'avishka.illangakoon55@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q2', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (67, 'Namal Amarasiri', 'namal.amarasiri56@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q3', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (68, 'Vishwa Ekanayake', 'vishwa.ekanayake57@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q1', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (69, 'Bhanuka Liyanage', 'bhanuka.liyanage58@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q2', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (70, 'Menuka Wickramasinghe', 'menuka.wickramasinghe59@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q3', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (71, 'Madhuka Karunanayake', 'madhuka.karunanayake60@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Accounting', NULL, 'Q3', 9, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (72, 'Ruwan Jayasinghe', 'ruwan.jayasinghe@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q1', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (73, 'Akesh Goonewardena', 'akesh.goonewardena62@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q2', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (74, 'Pathum Dissanayake', 'pathum.dissanayake63@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q3', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (75, 'Mahela Jayasooriya', 'mahela.jayasooriya64@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q1', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (76, 'Gihan Kaluarachchi', 'gihan.kaluarachchi65@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q2', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (77, 'Ruwan Liyanage', 'ruwan.liyanage66@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q3', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (78, 'Maneesha Jayatilake', 'maneesha.jayatilake67@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q1', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (79, 'Vishwa Subasinghe', 'vishwa.subasinghe68@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q2', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (80, 'Milinda Nanayakkara', 'milinda.nanayakkara69@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q3', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (81, 'Malith Karunanayake', 'malith.karunanayake70@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Financial Analysis', NULL, 'Q3', 10, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (82, 'Indika De Silva', 'indika.desilva71@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q1', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (83, 'Pathum Herath', 'pathum.herath72@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q2', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (84, 'Dhananjaya Welgama', 'dhananjaya.welgama73@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q3', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (85, 'Kosala Athauda', 'kosala.athauda74@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q1', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (86, 'Dimuthu Silva', 'dimuthu.silva75@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q2', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (87, 'Oshada Peiris', 'oshada.peiris76@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q3', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (88, 'Shanaka Ekanayake', 'shanaka.ekanayake77@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q1', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (89, 'Sanath Rodrigo', 'sanath.rodrigo78@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q2', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (90, 'Dulshan Rajapaksa', 'dulshan.rajapaksa79@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Finance', 'Finance Operations', NULL, 'Q3', 11, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (91, 'Anura Senaratne', 'anura.company@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'company_manager', 'Management', 'Executive', NULL, NULL, NULL, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (92, 'Ayesha Perera', 'ayesha.hr@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Human Resources', 'HR', 'IT', 'ALL', 1, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (93, 'Ruwan Fernando', 'ruwan.hr@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Human Resources', 'HR', 'Finance', 'ALL', 1, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00'),
  (94, 'Nethmi Silva', 'nethmi.hr@altrium.com', '$2b$10$gHjkNKUK/k7cHQGUo/.0POGfODRdn.hER17aCS/HuFViBo4xDtly6', 'employee', 'Human Resources', 'HR', NULL, 'ALL', 1, NULL, '2026-09-08 00:00:00', '2026-09-12 00:00:00');

-- -----------------------------------------------------------------------------
-- 2. Seed: plans (Demonstrating Company Manager & Team Manager Workflows)
-- -----------------------------------------------------------------------------
INSERT INTO `plans` (`id`, `type`, `title`, `description`, `manager_id`, `recipient_id`, `quarter`, `year`, `due_date`, `status`, `createdAt`, `updatedAt`) VALUES
  (1, 'PDP', 'Executive Engineering Governance & System Resiliency Roadmap', 'Establish high-fidelity continuous delivery standards and executive cross-departmental alignment for the IT division over the next 12 months.', 91, 2, 'Q3', 2026, NULL, 'completed', '2026-09-09 10:00:00', '2026-09-12 12:00:00'),
  (2, 'PIP', 'People Operations SLA & Cross-Departmental Review Enforcement', 'Improve cycle completion metrics and ensure portfolio HR specialists deliver quarterly reports within established deadlines.', 91, 1, 'Q3', 2026, '2027-08-30', 'pending', '2026-09-10 14:30:00', '2026-09-10 14:30:00'),
  (3, 'PDP', 'Corporate Financial Strategy & Audit Automation Initiative', 'Implement automated ledger verification systems and coordinate fiscal compliance milestones with departmental heads.', 91, 3, 'Q3', 2026, NULL, 'evidence_submitted', '2026-09-11 09:00:00', '2026-09-12 10:15:00'),
  (4, 'PIP', 'Q3 Backend API Optimization & Unit Testing Target', 'Complete the refactoring of order processing endpoints and achieve minimum 85% unit test coverage before cycle end.', 4, 14, 'Q3', 2026, '2027-08-30', 'pending', '2026-09-08 20:58:17', '2026-09-11 02:00:00'),
  (5, 'PDP', 'Cloud Infrastructure & Architecture Development Plan', 'Prepare a cloud architecture learning plan and upload separate milestone documents showing your progress.', 2, 4, 'Q3', 2026, NULL, 'completed', '2026-09-10 18:50:27', '2026-09-10 18:55:15');

-- -----------------------------------------------------------------------------
-- 3. Seed: evidence (Linked Deliverables in demo_storage/evidence/)
-- -----------------------------------------------------------------------------
INSERT INTO `evidence` (`id`, `plan_id`, `recipient_id`, `file_path`, `original_filename`, `file_size`, `mime_type`, `note`, `idempotency_key`, `payload_hash`, `submitted_at`, `createdAt`, `updatedAt`) VALUES
  (1, 1, 2, 'evidence-demo-arch-blueprint.png', 'Executive_Architecture_Roadmap.png', 57303, 'image/png', 'Submitted executive engineering architecture roadmap and continuous delivery framework deliverables.', 'demo_idempotency_ev_1', 'demo_hash_ev_1', '2026-09-11 11:30:00', '2026-09-11 11:30:00', '2026-09-11 11:30:00'),
  (2, 3, 3, 'evidence-demo-finance-audit.xlsx', 'Finance_Audit_Automation_Metrics.xlsx', 2783, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Uploaded comprehensive audit spreadsheet tracking Q3 automated ledger reconciliation.', 'demo_idempotency_ev_2', 'demo_hash_ev_2', '2026-09-12 10:15:00', '2026-09-12 10:15:00', '2026-09-12 10:15:00'),
  (3, 5, 4, 'evidence-demo-project-deliverables.docx', 'Engineering_Governance_Framework.docx', 3005, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Cloud infrastructure milestone specifications and governance blueprints.', 'demo_idempotency_ev_3', 'demo_hash_ev_3', '2026-09-10 18:52:00', '2026-09-10 18:52:00', '2026-09-10 18:52:00');

-- -----------------------------------------------------------------------------
-- 4. Seed: evidence_feedback (Append-only Manager Feedback)
-- -----------------------------------------------------------------------------
INSERT INTO `evidence_feedback` (`id`, `evidence_id`, `plan_id`, `manager_id`, `feedback_text`, `idempotency_key`, `createdAt`, `updatedAt`) VALUES
  (1, 1, 1, 91, 'Excellent architectural roadmap. Ensure the cross-department rollout schedule is aligned with Finance operations.', 'demo_fb_key_1', '2026-09-11 14:00:00', '2026-09-11 14:00:00'),
  (2, 3, 5, 2, 'Great cloud architecture milestones. Proceed with the automated provisioning pipeline.', 'demo_fb_key_2', '2026-09-10 18:54:00', '2026-09-10 18:54:00');

-- -----------------------------------------------------------------------------
-- 5. Seed: department_reports (Multi-Revision Tracking)
-- -----------------------------------------------------------------------------
INSERT INTO `department_reports` (`id`, `department`, `quarter`, `year`, `title`, `reviews_summary`, `pip_summary`, `pdp_summary`, `author_id`, `recipient_id`, `file_path`, `original_filename`, `file_size`, `mime_type`, `revision_number`, `revision_notes`, `is_latest`, `parent_report_id`, `submission_key`, `payload_hash`, `submitted_at`, `createdAt`, `updatedAt`) VALUES
  (1, 'IT', 'Q3', 2026, 'IT Department Q3 2026 Performance Summary Report', 'Overview of IT department performance reviews across all 5 engineering teams.', '1 active PIP in Software Development team under active remediation.', '1 active PDP on executive engineering governance.', 2, 92, 'report-demo-it-q3-rev1.pdf', 'IT_Q3_2026_Department_Summary.pdf', 1596, 'application/pdf', 1, 'Initial submission of Q3 department summary report.', 0, NULL, 'demo_sub_key_rep_1', 'demo_hash_rep_1', '2026-09-11 16:00:00', '2026-09-11 16:00:00', '2026-09-12 09:00:00'),
  (2, 'IT', 'Q3', 2026, 'IT Department Q3 2026 Performance Summary Report (Revision 2)', 'Updated IT department performance overview incorporating cross-team calibration metrics.', '1 active PIP under continuous evaluation.', '1 completed PDP and 1 ongoing initiative.', 2, 92, 'report-demo-it-q3-rev2.docx', 'IT_Q3_2026_Department_Summary_v2.docx', 1383, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2, 'Updated with latest review calibration numbers.', 1, 1, 'demo_sub_key_rep_2', 'demo_hash_rep_2', '2026-09-12 09:00:00', '2026-09-12 09:00:00', '2026-09-12 09:00:00'),
  (3, 'Finance', 'Q3', 2026, 'Finance Department Q3 2026 Summary Report', 'Summary of financial analysis and accounting teams review progress.', 'Zero active PIPs in Finance division.', '1 ongoing corporate financial automation PDP.', 3, 93, 'report-demo-finance-q3-rev1.xlsx', 'Finance_Q3_2026_Department_Summary.xlsx', 2323, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 1, 'Initial Q3 fiscal summary submission.', 1, NULL, 'demo_sub_key_rep_3', 'demo_hash_rep_3', '2026-09-11 17:30:00', '2026-09-11 17:30:00', '2026-09-11 17:30:00');

-- -----------------------------------------------------------------------------
-- 6. Seed: tasks (Review & Plan Action Items)
-- -----------------------------------------------------------------------------
INSERT INTO `tasks` (`id`, `type`, `feedback_type`, `status`, `quarter`, `year`, `message`, `assignee_id`, `reviewee_id`, `plan_id`, `group_subject_ids`, `draft_content`, `submission_key`, `payload_hash`, `createdAt`, `updatedAt`) VALUES
  (1, 'self_review', 'self', 'completed', 'Q3', 2026, 'Complete your Q3 self evaluation', 21, 21, NULL, NULL, NULL, 'demo_task_key_1', 'demo_task_hash_1', '2026-09-08 20:00:00', '2026-09-08 20:14:51'),
  (2, 'self_review', 'self', 'pending', 'Q3', 2026, 'Complete your Q3 self evaluation', 2, 2, NULL, NULL, NULL, 'demo_task_key_2', 'demo_task_hash_2', '2026-09-08 20:00:00', '2026-09-08 20:00:00'),
  (3, 'peer_review', 'peer', 'pending', 'Q3', 2026, 'Submit peer review for IT colleague', 2, 3, NULL, NULL, NULL, 'demo_task_key_3', 'demo_task_hash_3', '2026-09-08 20:00:00', '2026-09-08 20:00:00'),
  (4, 'peer_review', 'peer', 'pending', 'Q3', 2026, 'Submit peer review for HR Head', 1, 2, NULL, NULL, NULL, 'demo_task_key_4', 'demo_task_hash_4', '2026-09-08 20:00:00', '2026-09-08 20:00:00'),
  (5, 'upward_review', 'upward', 'pending', 'Q3', 2026, 'Submit upward evaluation for Dinesh Jayawardena', 4, 2, NULL, NULL, NULL, 'demo_task_key_5', 'demo_task_hash_5', '2026-09-08 20:00:00', '2026-09-08 20:00:00'),
  (6, 'downward_review', 'downward', 'pending', 'Q3', 2026, 'Conduct performance review for Avishka Wijesinghe', 4, 14, NULL, NULL, NULL, 'demo_task_key_6', 'demo_task_hash_6', '2026-09-08 20:00:00', '2026-09-08 20:00:00'),
  (7, 'pip', NULL, 'pending', 'Q3', 2026, 'Performance Improvement Plan deliverables assigned by Sarah Fernando', 14, NULL, 4, NULL, NULL, 'demo_task_key_7', 'demo_task_hash_7', '2026-09-08 20:58:17', '2026-09-08 20:58:17'),
  (8, 'pdp', NULL, 'completed', 'Q3', 2026, 'Professional Development Plan: Executive Engineering Governance', 2, NULL, 1, NULL, NULL, 'demo_task_key_8', 'demo_task_hash_8', '2026-09-09 10:00:00', '2026-09-12 12:00:00'),
  (9, 'pip', NULL, 'pending', 'Q3', 2026, 'Performance Improvement Plan: People Operations SLA', 1, NULL, 2, NULL, NULL, 'demo_task_key_9', 'demo_task_hash_9', '2026-09-10 14:30:00', '2026-09-10 14:30:00'),
  (10, 'pdp', NULL, 'pending', 'Q3', 2026, 'Professional Development Plan: Corporate Financial Strategy', 3, NULL, 3, NULL, NULL, 'demo_task_key_10', 'demo_task_hash_10', '2026-09-11 09:00:00', '2026-09-11 09:00:00');

-- -----------------------------------------------------------------------------
-- 7. Seed: reviews (Completed Review Records)
-- -----------------------------------------------------------------------------
INSERT INTO `reviews` (`id`, `content`, `submitted_at`, `task_id`, `reviewer_id`, `reviewee_id`, `createdAt`, `updatedAt`) VALUES
  (1, '{"techSkills": "Exceeds Expectations", "techNotes": "Successfully delivered full-stack microservices migration on schedule.", "commRating": "Meets Expectations", "commNotes": "Maintains clear cross-team communication.", "growthAreas": "Continue mentoring junior engineers on testing best practices."}', '2026-09-08 20:14:51', 1, 21, 21, '2026-09-08 20:14:51', '2026-09-08 20:14:51');

-- -----------------------------------------------------------------------------
-- 8. Seed: notifications (Sample Deep-Linked Notifications)
-- -----------------------------------------------------------------------------
INSERT INTO `notifications` (`id`, `message`, `is_read`, `link`, `entity_type`, `entity_id`, `user_id`, `createdAt`, `updatedAt`) VALUES
  (1, 'Anura Senaratne has assigned you a Professional Development Plan (PDP).', 1, '/my-tasks', 'plan', 1, 2, '2026-09-09 10:00:00', '2026-09-09 10:05:00'),
  (2, 'Anura Senaratne has assigned you a Performance Improvement Plan (PIP).', 0, '/my-tasks', 'plan', 2, 1, '2026-09-10 14:30:00', '2026-09-10 14:30:00'),
  (3, 'Dinesh Jayawardena has submitted evidence for plan: Executive Engineering Governance & System Resiliency Roadmap.', 1, '/assign-plan', 'evidence', 1, 91, '2026-09-11 11:30:00', '2026-09-11 12:00:00'),
  (4, 'Anura Senaratne provided feedback on your evidence deliverable.', 0, '/my-tasks', 'feedback', 1, 2, '2026-09-11 14:00:00', '2026-09-11 14:00:00'),
  (5, 'Chamari Perera has submitted evidence for plan: Corporate Financial Strategy & Audit Automation Initiative.', 0, '/assign-plan', 'evidence', 2, 91, '2026-09-12 10:15:00', '2026-09-12 10:15:00'),
  (6, 'Dinesh Jayawardena submitted Department Summary Report Revision 2 for IT Department.', 0, '/department-reports', 'department_report', 2, 92, '2026-09-12 09:00:00', '2026-09-12 09:00:00');

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- End of Demonstration Seed
-- =============================================================================
