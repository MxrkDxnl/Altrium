
--
-- Table structure for table `department_reports`
--

DROP TABLE IF EXISTS `department_reports`;


CREATE TABLE `department_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `department` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quarter` enum('Q1','Q2','Q3','Q4') COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reviews_summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `pip_summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `pdp_summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `revision_number` int NOT NULL DEFAULT '1',
  `revision_notes` text COLLATE utf8mb4_unicode_ci,
  `is_latest` tinyint(1) NOT NULL DEFAULT '1',
  `parent_report_id` int DEFAULT NULL,
  `submission_key` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_department_reports_author_id` (`author_id`),
  KEY `idx_department_reports_recipient_id` (`recipient_id`),
  KEY `idx_department_reports_parent_id` (`parent_report_id`),
  KEY `idx_department_reports_dept_cycle` (`department`,`quarter`,`year`),
  KEY `idx_department_reports_submission_key` (`submission_key`),
  CONSTRAINT `fk_dept_reports_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dept_reports_parent` FOREIGN KEY (`parent_report_id`) REFERENCES `department_reports` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_dept_reports_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `department_reports`
--

LOCK TABLES `department_reports` WRITE;
/*!40000 ALTER TABLE `department_reports` DISABLE KEYS */;
INSERT INTO `department_reports` VALUES (31,'IT','Q3',2026,'IT Performance & Capability Summary (Q3 2026)','Check report','Check report','Check report',2,92,'report-41551a50f0f9756b7a6e094eaa19f6f1.xlsx','Sample_Metrics_Spreadsheet.xlsx',2783,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',1,NULL,0,NULL,'dept_rep_1789193445308_w8ubo8m','b2a2c0d187c264c2719419ac9db131dc427e3bdedb1ed58bc126cf5a60b1330e','2026-09-12 06:25:13','2026-09-12 06:25:13','2026-09-12 06:52:18'),(32,'IT','Q3',2026,'IT Performance & Capability Summary (Q3 2026) (Revision 2)','Check report 2','Check report 2','Check report 2',2,92,'report-53596341143d219663f71b7a186fa219.pdf','Sample_API_Optimization_Report.pdf',8393,'application/pdf',2,'2 added',1,31,'dept_rep_1789194439637_8ojho0h','09ed2220c8a15dc83aeed4a59020e99119dacc7a18a94ce6adb58836c3fcb3b7','2026-09-12 06:27:52','2026-09-12 06:27:52','2026-09-12 06:52:18'),(33,'Finance','Q3',2026,'Finance Performance & Capability Summary (Q3 2026)','chamari.finance@altrium.com','chamari.finance@altrium.com','chamari.finance@altrium.com',3,93,'report-a2b6d2c9aa24763cb2f0d6282130e90f.docx','Sample_Project_Deliverables.docx',3005,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',1,NULL,1,NULL,'dept_rep_1789194546281_ip5g5sb','6468405520e714fd085e82da4fe4b96edd9e1697535e7ea67e5587966573b5f4','2026-09-12 06:29:19','2026-09-12 06:29:19','2026-09-12 06:29:19');
/*!40000 ALTER TABLE `department_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evidence`
--

DROP TABLE IF EXISTS `evidence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evidence_plan_recipient_idempotency` (`plan_id`,`recipient_id`,`idempotency_key`),
  KEY `idx_evidence_recipient` (`recipient_id`),
  KEY `idx_evidence_plan` (`plan_id`),
  CONSTRAINT `fk_evidence_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evidence_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=82 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evidence`
--

LOCK TABLES `evidence` WRITE;
/*!40000 ALTER TABLE `evidence` DISABLE KEYS */;
INSERT INTO `evidence` VALUES (12,40,4,'evidence-da23fbe4a09fc2bfd31a5289114c9d97.docx','Sample_Project_Deliverables.docx',3005,'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Manual test — Initial learning plan and milestone outline.','legacy_manual_test_12','2348900bd7390a01fc2026bbb2a3f749bf883d5f7505afb788cd9a5c6f9c7c70','2026-09-10 18:53:01','2026-09-10 18:53:01','2026-09-10 19:07:15'),(13,40,4,'evidence-3cb667b17b296009b5ec0e83c3cfaedc.xlsx','Sample_Metrics_Spreadsheet.xlsx',2783,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Manual test — Progress measurements for the planned milestones.','legacy_manual_test_13','2bc98f3ac10603a151d922088bef05c958152a56981f3389e3f5b715d050f3ac','2026-09-10 18:53:29','2026-09-10 18:53:29','2026-09-10 19:07:15'),(43,103,6,'evidence-ade37ad1e849d0d49d30d37dc370d7e7.xlsx','Sample_Metrics_Spreadsheet.xlsx',2783,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',NULL,'9cedc685-94d0-43e2-bf02-04cd291772e8','d26ede8165d582dfb58882f875faaa0faffcc43d727b3cbaece1ec66516a3825','2026-09-13 09:07:12','2026-09-13 09:07:12','2026-09-13 09:07:12');
/*!40000 ALTER TABLE `evidence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evidence_feedback`
--

DROP TABLE IF EXISTS `evidence_feedback`;


CREATE TABLE `evidence_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evidence_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `manager_id` int NOT NULL,
  `feedback_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `idempotency_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evidence_feedback_idempotency` (`evidence_id`,`manager_id`,`idempotency_key`),
  KEY `idx_evidence_feedback_evidence_id` (`evidence_id`),
  KEY `idx_evidence_feedback_plan_id` (`plan_id`),
  KEY `idx_evidence_feedback_manager_id` (`manager_id`),
  CONSTRAINT `fk_evidence_feedback_evidence` FOREIGN KEY (`evidence_id`) REFERENCES `evidence` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_feedback_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_evidence_feedback_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evidence_feedback`
--

LOCK TABLES `evidence_feedback` WRITE;
/*!40000 ALTER TABLE `evidence_feedback` DISABLE KEYS */;
INSERT INTO `evidence_feedback` VALUES (34,43,103,2,'Very good ah','06a60690-679c-4f45-8e74-57a697b228a5','2026-09-13 10:19:02','2026-09-13 10:19:02');
/*!40000 ALTER TABLE `evidence_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=617 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (2,'Indika Rodrigo has submitted their assigned review.',1,NULL,NULL,NULL,'2026-09-08 20:14:51','2026-09-08 20:15:38',4),(62,'You have been assigned a PDP plan: \"Manual test - Cloud architecture development\" by Dinesh Jayawardena.',1,NULL,NULL,NULL,'2026-09-10 18:50:28','2026-09-10 18:51:25',4),(63,'Sarah Fernando has submitted evidence for PDP plan: \"Manual test - Cloud architecture development\".',1,NULL,NULL,NULL,'2026-09-10 18:53:01','2026-09-12 06:49:20',2),(64,'Sarah Fernando has submitted evidence for PDP plan: \"Manual test - Cloud architecture development\".',1,NULL,NULL,NULL,'2026-09-10 18:53:29','2026-09-10 18:54:34',2),(65,'Your Personal Development Plan \"Manual test - Cloud architecture development\" has been concluded and marked completed by Dinesh Jayawardena.',1,NULL,NULL,NULL,'2026-09-10 18:55:15','2026-09-10 18:55:46',4),(101,'Kasun Bandara has submitted their assigned review.',1,NULL,NULL,NULL,'2026-09-10 20:11:44','2026-09-12 06:49:20',2),(103,'You have been assigned a Self Review for Q3 2026.',1,NULL,NULL,NULL,'2026-09-10 20:17:52','2026-09-11 19:42:51',2),(104,'You have been assigned to peer review Dinesh Jayawardena for Q3 2026.',0,NULL,NULL,NULL,'2026-09-10 20:19:59','2026-09-10 20:19:59',1),(105,'You have been assigned to peer review Dinesh Jayawardena for Q3 2026.',0,NULL,NULL,NULL,'2026-09-10 20:19:59','2026-09-10 20:19:59',3),(106,'You have been assigned to provide upward feedback for Dinesh Jayawardena for Q3 2026.',1,NULL,NULL,NULL,'2026-09-10 20:19:59','2026-09-10 20:21:05',4),(107,'You have been assigned to provide upward feedback for Dinesh Jayawardena for Q3 2026.',0,NULL,NULL,NULL,'2026-09-10 20:19:59','2026-09-10 20:19:59',5),(108,'You have been assigned to peer review Amaya Senanayake for Q3 2026.',0,NULL,NULL,NULL,'2026-09-10 20:24:08','2026-09-10 20:24:08',3),(109,'You have been assigned to peer review Amaya Senanayake for Q3 2026.',1,NULL,NULL,NULL,'2026-09-10 20:24:08','2026-09-12 06:49:20',2),(110,'You have been assigned to provide upward feedback for Amaya Senanayake for Q3 2026.',1,NULL,NULL,NULL,'2026-09-10 20:24:08','2026-09-12 06:30:59',92),(111,'You have been assigned to provide upward feedback for Amaya Senanayake for Q3 2026.',0,NULL,NULL,NULL,'2026-09-10 20:24:08','2026-09-10 20:24:08',94),(112,'You have been assigned to peer review Ayesha Perera for Q3 2026.',0,NULL,NULL,NULL,'2026-09-10 20:25:00','2026-09-10 20:25:00',94),(113,'You have been assigned to peer review Ayesha Perera for Q3 2026.',1,NULL,NULL,NULL,'2026-09-10 20:25:00','2026-09-10 20:25:22',93),(117,'Nimal Jayakody has submitted evidence for PIP plan: \"AUTOMATED_TEST_PIP_12_MONTH\".',1,NULL,NULL,NULL,'2026-09-10 20:35:25','2026-09-12 08:06:34',4),(119,'Nimal Jayakody has submitted evidence for PIP plan: \"TEST_PIP_AUTHORITATIVE_DEADLINE\".',1,NULL,NULL,NULL,'2026-09-10 21:12:28','2026-09-12 08:06:34',4),(121,'Dinesh Jayawardena provided feedback on your evidence deliverable \"Sample_Project_Deliverables.docx\" for PDP plan: \"Manual test - Cloud architecture development\".',1,NULL,NULL,NULL,'2026-09-10 21:23:26','2026-09-12 08:06:34',4),(133,'Nimal Jayakody has submitted evidence for PIP plan: \"TEST_PIP_AUTHORITATIVE_DEADLINE\".',1,NULL,NULL,NULL,'2026-09-10 21:25:47','2026-09-12 08:06:34',4),(138,'Dinesh Jayawardena provided feedback on your evidence deliverable \"Sample_Project_Deliverables.docx\" for PDP plan: \"Manual test - Cloud architecture development\".',1,'/my-tasks','plan',40,'2026-09-11 08:27:24','2026-09-12 08:06:34',4),(140,'Nimal Jayakody has submitted evidence for PIP plan: \"Authoritative Deadline Verification Plan\".',1,'/assign-plan','plan',53,'2026-09-11 08:28:40','2026-09-12 08:06:34',4),(169,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',126,'2026-09-11 19:20:38','2026-09-12 06:49:20',2),(175,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',133,'2026-09-11 19:20:49','2026-09-12 06:49:20',2),(181,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',142,'2026-09-11 19:23:43','2026-09-12 06:49:20',2),(187,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',151,'2026-09-11 19:31:47','2026-09-12 06:49:20',2),(192,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',157,'2026-09-11 19:33:38','2026-09-12 06:08:54',4),(195,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',158,'2026-09-11 19:33:38','2026-09-12 08:06:34',4),(196,'You have been assigned a PIP plan: \"Regression Test PIP Plan for Q3 Automation\" by Sarah Fernando.',0,'/my-tasks','plan',54,'2026-09-11 19:33:38','2026-09-11 19:33:38',17),(197,'You have been assigned a PDP plan: \"Regression Test PDP Plan for Architecture Growth\" by Sarah Fernando.',0,'/my-tasks','plan',55,'2026-09-11 19:33:38','2026-09-11 19:33:38',17),(199,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',162,'2026-09-11 19:34:26','2026-09-12 08:06:34',4),(202,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',163,'2026-09-11 19:34:26','2026-09-12 08:06:34',4),(206,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',167,'2026-09-11 19:34:46','2026-09-12 08:06:34',4),(209,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',168,'2026-09-11 19:34:46','2026-09-12 08:06:34',4),(212,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',59,'2026-09-11 19:34:47','2026-09-11 19:34:47',17),(213,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',58,'2026-09-11 19:34:47','2026-09-11 19:34:47',17),(215,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',172,'2026-09-11 19:34:57','2026-09-12 08:06:34',4),(218,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',173,'2026-09-11 19:34:57','2026-09-12 08:06:34',4),(221,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',61,'2026-09-11 19:34:57','2026-09-11 19:34:57',17),(222,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',60,'2026-09-11 19:34:57','2026-09-11 19:34:57',17),(228,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',183,'2026-09-11 19:35:02','2026-09-12 06:49:20',2),(230,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',186,'2026-09-11 19:35:03','2026-09-12 08:06:34',4),(233,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',187,'2026-09-11 19:35:03','2026-09-12 08:06:34',4),(236,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',63,'2026-09-11 19:35:04','2026-09-11 19:35:04',17),(237,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',62,'2026-09-11 19:35:04','2026-09-11 19:35:04',17),(243,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',197,'2026-09-11 19:35:24','2026-09-12 06:49:20',2),(245,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',200,'2026-09-11 19:35:27','2026-09-12 08:06:34',4),(248,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',201,'2026-09-11 19:35:27','2026-09-12 08:06:34',4),(251,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',65,'2026-09-11 19:35:27','2026-09-11 19:35:27',17),(252,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',64,'2026-09-11 19:35:27','2026-09-11 19:35:27',17),(253,'You have been assigned to complete downward reviews for 4 team member(s) (Q3 2026).',1,'/my-tasks','task',205,'2026-09-11 19:46:35','2026-09-11 19:47:00',4),(256,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',207,'2026-09-11 19:55:54','2026-09-11 19:56:34',4),(259,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',208,'2026-09-11 19:55:54','2026-09-12 08:06:34',4),(262,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',67,'2026-09-11 19:55:54','2026-09-11 19:55:54',17),(263,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',66,'2026-09-11 19:55:54','2026-09-11 19:55:54',17),(269,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',218,'2026-09-11 19:55:58','2026-09-12 06:49:20',2),(278,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',228,'2026-09-11 20:29:33','2026-09-12 08:06:34',4),(281,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',229,'2026-09-11 20:29:33','2026-09-12 08:06:34',4),(284,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',69,'2026-09-11 20:29:33','2026-09-11 20:29:33',17),(285,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',1,'/my-tasks','plan',68,'2026-09-11 20:29:34','2026-09-11 20:29:34',17),(291,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',239,'2026-09-11 20:29:43','2026-09-12 06:49:20',2),(292,'You have been assigned a Self Review for Q1 2027.',0,'/my-tasks','task',242,'2026-09-11 20:38:14','2026-09-11 20:38:14',94),(302,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',251,'2026-09-11 20:38:49','2026-09-12 08:06:34',4),(305,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',252,'2026-09-11 20:38:49','2026-09-12 08:06:34',4),(308,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',71,'2026-09-11 20:38:49','2026-09-11 20:38:49',17),(309,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',70,'2026-09-11 20:38:49','2026-09-11 20:38:49',17),(315,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',262,'2026-09-11 20:38:50','2026-09-12 06:49:20',2),(330,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',272,'2026-09-11 20:48:54','2026-09-12 08:06:34',4),(333,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',273,'2026-09-11 20:48:54','2026-09-12 08:06:34',4),(336,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',73,'2026-09-11 20:48:54','2026-09-11 20:48:54',17),(337,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',72,'2026-09-11 20:48:54','2026-09-11 20:48:54',17),(343,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',283,'2026-09-11 20:48:56','2026-09-12 06:49:20',2),(359,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',286,'2026-09-11 20:58:38','2026-09-12 08:06:34',4),(362,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',287,'2026-09-11 20:58:38','2026-09-12 08:06:34',4),(365,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',75,'2026-09-11 20:58:38','2026-09-11 20:58:38',17),(366,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',74,'2026-09-11 20:58:38','2026-09-11 20:58:38',17),(372,'Kasun Bandara has submitted their assigned reviews.',1,'/review-table','review',297,'2026-09-11 20:58:42','2026-09-12 06:49:20',2),(388,'Dinesh Jayawardena submitted the IT Department Summary Report for Q3 2026.',1,'/department-reports','report',31,'2026-09-12 06:25:13','2026-09-12 06:25:50',92),(389,'Dinesh Jayawardena submitted Revision 2 of the IT Department Summary Report for Q3 2026.',1,'/department-reports','report',32,'2026-09-12 06:27:52','2026-09-12 06:28:04',92),(390,'Chamari Perera submitted the Finance Department Summary Report for Q3 2026.',1,'/department-reports','report',33,'2026-09-12 06:29:19','2026-09-12 06:49:20',93),(409,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',307,'2026-09-12 06:51:56','2026-09-12 08:06:34',4),(412,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',308,'2026-09-12 06:51:56','2026-09-12 08:06:34',4),(415,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',77,'2026-09-12 06:51:56','2026-09-12 06:51:56',17),(416,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',76,'2026-09-12 06:51:56','2026-09-12 06:51:56',17),(434,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',312,'2026-09-12 07:31:15','2026-09-12 08:06:34',4),(437,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',313,'2026-09-12 07:31:15','2026-09-12 08:06:34',4),(440,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',79,'2026-09-12 07:31:15','2026-09-12 07:31:15',17),(441,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',78,'2026-09-12 07:31:15','2026-09-12 07:31:15',17),(453,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',317,'2026-09-12 07:41:38','2026-09-12 08:06:34',4),(456,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',318,'2026-09-12 07:41:38','2026-09-12 08:06:34',4),(459,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',81,'2026-09-12 07:41:38','2026-09-12 07:41:38',17),(460,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',80,'2026-09-12 07:41:38','2026-09-12 07:41:38',17),(472,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',322,'2026-09-12 07:44:00','2026-09-12 08:06:34',4),(475,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',323,'2026-09-12 07:44:00','2026-09-12 08:06:34',4),(478,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',83,'2026-09-12 07:44:00','2026-09-12 07:44:00',17),(479,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',0,'/my-tasks','plan',82,'2026-09-12 07:44:00','2026-09-12 07:44:00',17),(491,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',338,'2026-09-12 07:52:58','2026-09-12 08:06:34',4),(494,'Nimal Jayakody has submitted their assigned review.',1,'/review-table','review',339,'2026-09-12 07:52:58','2026-09-12 08:06:34',4),(497,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',87,'2026-09-12 07:52:58','2026-09-12 07:52:58',17),(498,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',1,'/my-tasks','plan',86,'2026-09-12 07:52:58','2026-09-12 07:52:58',17),(510,'Nimal Jayakody has submitted their assigned review.',0,'/review-table','review',347,'2026-09-12 08:25:12','2026-09-12 08:25:12',4),(513,'Nimal Jayakody has submitted their assigned review.',0,'/review-table','review',348,'2026-09-12 08:25:12','2026-09-12 08:25:12',4),(516,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',90,'2026-09-12 08:25:12','2026-09-12 08:25:12',17),(517,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',1,'/my-tasks','plan',89,'2026-09-12 08:25:12','2026-09-12 08:25:12',17),(519,'Nimal Jayakody has submitted their assigned review.',0,'/review-table','review',352,'2026-09-12 08:27:28','2026-09-12 08:27:28',4),(522,'Nimal Jayakody has submitted their assigned review.',0,'/review-table','review',353,'2026-09-12 08:27:28','2026-09-12 08:27:28',4),(525,'Your Personal Development Plan \"Regression Test PDP Plan for Architecture Growth\" has been concluded and marked completed by Sarah Fernando.',0,'/my-tasks','plan',92,'2026-09-12 08:27:28','2026-09-12 08:27:28',17),(526,'Sarah Fernando provided feedback on your evidence deliverable \"Regression_Evidence.docx\" for PIP plan: \"Regression Test PIP Plan for Q3 Automation\".',1,'/my-tasks','plan',91,'2026-09-12 08:27:28','2026-09-12 08:27:28',17),(564,'You have been assigned a PIP plan: \"Check 3456789\" by Dinesh Jayawardena.',1,'/my-tasks','plan',103,'2026-09-13 09:01:03','2026-09-13 09:02:25',6),(565,'Asanka Wijesinghe has submitted evidence for PIP plan: \"Check 3456789\".',1,'/assign-plan','plan',103,'2026-09-13 09:07:12','2026-09-13 09:07:48',2),(566,'Dinesh Jayawardena has submitted evidence for PDP plan: \"Temporary Test PDP for Repeated Upload Investigation\".',0,'/assign-plan','plan',104,'2026-09-13 09:35:06','2026-09-13 09:35:06',91),(567,'Dinesh Jayawardena has submitted evidence for PDP plan: \"Temporary Test PDP for Repeated Upload Investigation\".',0,'/assign-plan','plan',104,'2026-09-13 09:35:06','2026-09-13 09:35:06',91),(600,'Dinesh Jayawardena provided feedback on your evidence deliverable \"Sample_Metrics_Spreadsheet.xlsx\" for PIP plan: \"Check 3456789\".',1,'/my-tasks','plan',103,'2026-09-13 10:19:02','2026-09-13 10:19:27',6),(608,'You have been assigned a PIP plan: \"Automated Lifecycle Boundary Test Plan for Q3 Automation\" by Sarah Fernando.',0,'/my-tasks','plan',125,'2026-09-14 09:50:12','2026-09-14 09:50:12',17),(613,'You have been assigned a PIP plan: \"Automated Lifecycle Boundary Test Plan for Q3 Automation\" by Sarah Fernando.',0,'/my-tasks','plan',129,'2026-09-14 09:51:31','2026-09-14 09:51:31',17),(614,'You have been assigned a PIP plan: \"Automated Lifecycle Boundary Test Plan for Q3 Automation\" by Sarah Fernando.',0,'/my-tasks','plan',130,'2026-09-14 10:00:29','2026-09-14 10:00:29',17);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;


CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('PIP','PDP') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `quarter` enum('Q1','Q2','Q3','Q4') COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('pending','evidence_submitted','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_plan_manager` (`manager_id`),
  KEY `fk_plan_recipient` (`recipient_id`),
  CONSTRAINT `fk_plan_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_plan_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (7,'PIP','Q3 Backend API Optimization & Unit Testing Target','Complete the refactoring of order processing endpoints and achieve minimum 85% unit test coverage before cycle end.',4,14,'Q3',2026,'2027-08-30','pending','2026-09-08 20:58:17','2026-09-14 09:48:50'),(40,'PDP','Manual test - Cloud architecture development','Prepare a cloud architecture learning plan and upload separate milestone documents showing your progress.',2,4,'Q3',2026,NULL,'completed','2026-09-10 18:50:27','2026-09-10 18:55:15'),(103,'PIP','Check 3456789','Check 3qwert yuioa sdfghjk lzxcvb  nmweto',2,6,'Q3',2026,'2027-08-30','evidence_submitted','2026-09-13 09:01:03','2026-09-14 09:48:50');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` json NOT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `task_id` int DEFAULT NULL,
  `reviewer_id` int DEFAULT NULL,
  `reviewee_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `reviewer_id` (`reviewer_id`),
  KEY `reviewee_id` (`reviewee_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,'{\"commNotes\": \"\", \"commRating\": \"Exceeds Expectations\", \"techSkills\": \"Fine\", \"growthAreas\": \"\"}','2026-09-08 20:14:51','2026-09-08 20:14:51','2026-09-08 20:14:51',1,21,21),(100,'{\"commRating\": \"Exceeds Expectations\", \"techSkills\": \"Legacy 2025 Skills Assessment\"}','2025-08-15 10:00:00','2026-09-12 07:52:20','2026-09-12 07:52:20',327,4,4),(101,'{\"commRating\": \"Meets Expectations\", \"techSkills\": \"Confidential Peer Feedback Notes\"}','2026-09-10 14:00:00','2026-09-12 07:52:20','2026-09-12 07:52:20',328,15,14);
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('self_review','peer_review','upward_review','downward_review','pip','pdp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `feedback_type` enum('self','peer','upward','downward') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `quarter` enum('Q1','Q2','Q3','Q4') COLLATE utf8mb4_unicode_ci NOT NULL,
  `year` int NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  `assignee_id` int DEFAULT NULL,
  `reviewee_id` int DEFAULT NULL,
  `plan_id` int DEFAULT NULL,
  `group_subject_ids` json DEFAULT NULL,
  `draft_content` json DEFAULT NULL,
  `submission_key` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assignee_id` (`assignee_id`),
  KEY `reviewee_id` (`reviewee_id`),
  KEY `fk_task_plan` (`plan_id`),
  CONSTRAINT `fk_task_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`reviewee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=397 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,'self_review','self','completed','Q3',2026,'Please Do the Self review\n','2026-09-08 20:13:23','2026-09-08 20:14:51',21,21,NULL,NULL,NULL,NULL,NULL),(8,'pip',NULL,'pending','Q3',2026,'Q3 Backend API Optimization & Unit Testing Target','2026-09-08 20:58:17','2026-09-08 20:58:17',14,14,7,NULL,NULL,NULL,NULL),(49,'pdp',NULL,'completed','Q3',2026,'Manual test - Cloud architecture development','2026-09-10 18:50:28','2026-09-10 18:55:15',4,4,40,NULL,NULL,NULL,NULL),(78,'self_review','self','pending','Q3',2026,'Manual test — Reflect on department delivery, leadership challenges, and development priorities.','2026-09-10 20:17:52','2026-09-10 20:17:52',2,2,NULL,NULL,NULL,NULL,NULL),(79,'peer_review','peer','pending','Q3',2026,'Manual test - Provide constructive feedback on department leadership and communication.','2026-09-10 20:19:59','2026-09-10 20:19:59',1,2,NULL,NULL,NULL,NULL,NULL),(80,'peer_review','peer','pending','Q3',2026,'Manual test - Provide constructive feedback on department leadership and communication.','2026-09-10 20:19:59','2026-09-10 20:19:59',3,2,NULL,NULL,NULL,NULL,NULL),(81,'upward_review','upward','pending','Q3',2026,'Manual test - Provide constructive feedback on department leadership and communication.','2026-09-10 20:19:59','2026-09-10 20:19:59',4,2,NULL,NULL,NULL,NULL,NULL),(82,'upward_review','upward','pending','Q3',2026,'Manual test - Provide constructive feedback on department leadership and communication.','2026-09-10 20:19:59','2026-09-10 20:19:59',5,2,NULL,NULL,NULL,NULL,NULL),(83,'peer_review','peer','pending','Q3',2026,NULL,'2026-09-10 20:24:08','2026-09-10 20:24:08',3,1,NULL,NULL,NULL,NULL,NULL),(84,'peer_review','peer','pending','Q3',2026,NULL,'2026-09-10 20:24:08','2026-09-10 20:24:08',2,1,NULL,NULL,NULL,NULL,NULL),(85,'upward_review','upward','pending','Q3',2026,NULL,'2026-09-10 20:24:08','2026-09-10 20:24:08',92,1,NULL,NULL,NULL,NULL,NULL),(86,'upward_review','upward','pending','Q3',2026,NULL,'2026-09-10 20:24:08','2026-09-10 20:24:08',94,1,NULL,NULL,NULL,NULL,NULL),(87,'peer_review','peer','pending','Q3',2026,NULL,'2026-09-10 20:25:00','2026-09-10 20:25:00',94,92,NULL,NULL,NULL,NULL,NULL),(88,'peer_review','peer','pending','Q3',2026,NULL,'2026-09-10 20:25:00','2026-09-10 20:25:00',93,92,NULL,NULL,NULL,NULL,NULL),(94,'pdp',NULL,'pending','Q3',2026,'Improve API testing and documentation','2026-09-11 08:26:03','2026-09-11 08:26:03',14,14,NULL,NULL,NULL,NULL,NULL),(95,'pdp',NULL,'pending','Q3',2026,'Improve API testing and documentation','2026-09-11 08:26:58','2026-09-11 08:26:58',14,14,NULL,NULL,NULL,NULL,NULL),(96,'pdp',NULL,'pending','Q3',2026,'Improve API testing and documentation','2026-09-11 08:27:17','2026-09-11 08:27:17',14,14,NULL,NULL,NULL,NULL,NULL),(160,'pip',NULL,'pending','Q3',2026,'Regression Test PIP Plan for Q3 Automation','2026-09-11 19:33:38','2026-09-11 19:33:38',17,17,NULL,NULL,NULL,NULL,NULL),(161,'pdp',NULL,'pending','Q3',2026,'Regression Test PDP Plan for Architecture Growth','2026-09-11 19:33:38','2026-09-11 19:33:38',17,17,NULL,NULL,NULL,NULL,NULL),(205,'downward_review','downward','pending','Q3',2026,'Please Review Employes','2026-09-11 19:46:35','2026-09-11 19:46:35',4,14,NULL,'[14, 21, 17, 20]',NULL,NULL,NULL),(242,'self_review','self','pending','Q1',2027,'Future cycle test','2026-09-11 20:38:14','2026-09-11 20:38:14',94,94,NULL,NULL,NULL,NULL,NULL),(327,'self_review','self','completed','Q2',2025,NULL,'2026-09-12 07:52:20','2026-09-12 07:52:20',4,NULL,NULL,NULL,NULL,NULL,NULL),(328,'peer_review','peer','completed','Q3',2026,NULL,'2026-09-12 07:52:20','2026-09-12 07:52:20',15,14,NULL,NULL,NULL,NULL,NULL),(329,'peer_review','peer','pending','Q3',2026,NULL,'2026-09-12 07:52:20','2026-09-12 07:52:20',4,15,NULL,NULL,'{\"commRating\": \"Meets Expectations\", \"techSkills\": \"Unfinished private draft notes\"}',NULL,NULL),(379,'pip',NULL,'pending','Q3',2026,'Check 3456789','2026-09-13 09:01:03','2026-09-13 09:01:03',6,6,103,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;


CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('company_manager','hr_manager','department_manager','team_manager','employee') COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `report_portfolio` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quarter_batch` enum('Q1','Q2','Q3','Q4','ALL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `manager_id` int DEFAULT NULL,
  `profile_picture` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `manager_id` (`manager_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Amaya Senanayake','amaya.hr@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','hr_manager','Human Resources','HR',NULL,NULL,91,NULL,'2026-09-08 19:59:46','2026-09-10 19:33:40'),(2,'Dinesh Jayawardena','dinesh.it@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','department_manager','IT','Management',NULL,NULL,91,NULL,'2026-09-08 19:59:46','2026-09-10 19:33:40'),(3,'Chamari Perera','chamari.finance@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','department_manager','Finance','Management',NULL,NULL,91,NULL,'2026-09-08 19:59:46','2026-09-10 19:33:40'),(4,'Sarah Fernando','sarah.software@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','IT','Software Development',NULL,NULL,2,NULL,'2026-09-08 19:59:46','2026-09-08 19:59:46'),(5,'Kasun Bandara','kasun.qa@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','IT','Quality Assurance',NULL,NULL,2,NULL,'2026-09-08 19:59:46','2026-09-08 19:59:46'),(6,'Asanka Wijesinghe','asanka.support@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','IT','IT Support and Operations',NULL,NULL,2,NULL,'2026-09-08 19:59:46','2026-09-08 19:59:46'),(7,'Tharindu Gunaratne','tharindu.cyber@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','IT','Cyber Security',NULL,NULL,2,NULL,'2026-09-08 19:59:46','2026-09-08 19:59:46'),(8,'Dilini Rajapakse','dilini.uiux@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','IT','UI/UX',NULL,NULL,2,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(9,'Malan Dissanayake','malan.accounting@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','Finance','Accounting',NULL,NULL,3,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(10,'Chathurika Peiris','chathurika.analysis@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','Finance','Financial Analysis',NULL,NULL,3,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(11,'Nuwan De Silva','nuwan.finops@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','team_manager','Finance','Finance Operations',NULL,NULL,3,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(12,'Kavith Perera','kavith.perera@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q1',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(13,'Oshan Wickramasinghe','oshan.wickramasinghe2@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q2',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(14,'Avishka Wijesinghe','avishka.wijesinghe3@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q3',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(15,'Gayan Liyanage','gayan.liyanage4@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q1',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(16,'Suranga Munasinghe','suranga.munasinghe5@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q2',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(17,'Nimal Jayakody','nimal.jayakody6@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q3',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(18,'Dimuthu Karunanayake','dimuthu.karunanayake7@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q1',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(19,'Shehan Rodrigo','shehan.rodrigo8@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q2',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(20,'Shehan Dissanayake','shehan.dissanayake9@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q3',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(21,'Indika Rodrigo','indika.rodrigo10@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Software Development',NULL,'Q3',4,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(22,'Nimali Silva','nimali.silva@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q1',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(23,'Bhanuka Fernando','bhanuka.fernando12@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q2',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(24,'Dinuka Jayatilake','dinuka.jayatilake13@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q3',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(25,'Menuka Samarasinghe','menuka.samarasinghe14@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q1',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(26,'Yashoda Welgama','yashoda.welgama15@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q2',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(27,'Ranil Nanayakkara','ranil.nanayakkara16@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q3',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(28,'Sajith Siriwardena','sajith.siriwardena17@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q1',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(29,'Thilina Fernando','thilina.fernando18@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q2',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(30,'Niroshan Silva','niroshan.silva19@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q3',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(31,'Isuru Karunaratne','isuru.karunaratne20@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Quality Assurance',NULL,'Q3',5,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(32,'Dhananjaya Bandara','dhananjaya.bandara21@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q1',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(33,'Menuka Wijesinghe','menuka.wijesinghe22@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q2',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(34,'Dimuthu Rodrigo','dimuthu.rodrigo23@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q3',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(35,'Namal Weerasinghe','namal.weerasinghe24@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q1',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(36,'Niroshan Illangakoon','niroshan.illangakoon25@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q2',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(37,'Sumith Mendis','sumith.mendis26@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q3',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(38,'Nimal Hettiarachchi','nimal.hettiarachchi27@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q1',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(39,'Harsha Ekanayake','harsha.ekanayake28@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q2',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(40,'Pathum Silva','pathum.silva29@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q3',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(41,'Udara Gunaratne','udara.gunaratne30@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','IT Support and Operations',NULL,'Q3',6,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(42,'Oshan Jayawardena','oshan.jayawardena31@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q1',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(43,'Ashan Gunaratne','ashan.gunaratne32@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q2',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(44,'Tharusha Goonewardena','tharusha.goonewardena33@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q3',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(45,'Namal Senadheera','namal.senadheera34@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q1',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(46,'Milinda Senadheera','milinda.senadheera35@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q2',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(47,'Suresh Jayakody','suresh.jayakody36@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q3',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(48,'Supun Silva','supun.silva37@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q1',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(49,'Udara Wickramasinghe','udara.wickramasinghe38@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q2',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(50,'Menuka Senanayake','menuka.senanayake39@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q3',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(51,'Oshada Hettiarachchi','oshada.hettiarachchi40@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','Cyber Security',NULL,'Q3',7,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(52,'Pathum Weerasinghe','pathum.weerasinghe41@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q1',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(53,'Sanka Gunawardena','sanka.gunawardena42@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q2',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(54,'Oshada Rajapaksa','oshada.rajapaksa43@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q3',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(55,'Lasantha Herath','lasantha.herath44@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q1',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(56,'Pradeep Herath','pradeep.herath45@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q2',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(57,'Malith Senadheera','malith.senadheera46@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q3',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(58,'Madhuka Goonewardena','madhuka.goonewardena47@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q1',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(59,'Gihan Herath','gihan.herath48@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q2',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(60,'Dasun Wijesinghe','dasun.wijesinghe49@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q3',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(61,'Madhuka Peiris','madhuka.peiris50@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','IT','UI/UX',NULL,'Q3',8,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(62,'Sanduni Fernando','sanduni.fernando@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q1',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(63,'Geeth Edirisinghe','geeth.edirisinghe52@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q2',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(64,'Ranil Abeysekara','ranil.abeysekara53@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q3',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(65,'Nuwan Liyanage','nuwan.liyanage54@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q1',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(66,'Avishka Illangakoon','avishka.illangakoon55@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q2',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(67,'Namal Amarasiri','namal.amarasiri56@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q3',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(68,'Vishwa Ekanayake','vishwa.ekanayake57@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q1',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(69,'Bhanuka Liyanage','bhanuka.liyanage58@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q2',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(70,'Menuka Wickramasinghe','menuka.wickramasinghe59@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q3',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(71,'Madhuka Karunanayake','madhuka.karunanayake60@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Accounting',NULL,'Q3',9,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(72,'Ruwan Jayasinghe','ruwan.jayasinghe@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q1',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(73,'Akesh Goonewardena','akesh.goonewardena62@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q2',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(74,'Pathum Dissanayake','pathum.dissanayake63@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q3',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(75,'Mahela Jayasooriya','mahela.jayasooriya64@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q1',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(76,'Gihan Kaluarachchi','gihan.kaluarachchi65@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q2',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(77,'Ruwan Liyanage','ruwan.liyanage66@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q3',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(78,'Maneesha Jayatilake','maneesha.jayatilake67@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q1',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(79,'Vishwa Subasinghe','vishwa.subasinghe68@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q2',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(80,'Milinda Nanayakkara','milinda.nanayakkara69@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q3',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(81,'Malith Karunanayake','malith.karunanayake70@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Financial Analysis',NULL,'Q3',10,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(82,'Indika De Silva','indika.desilva71@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q1',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(83,'Pathum Herath','pathum.herath72@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q2',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(84,'Dhananjaya Welgama','dhananjaya.welgama73@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q3',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(85,'Kosala Athauda','kosala.athauda74@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q1',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(86,'Dimuthu Silva','dimuthu.silva75@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q2',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(87,'Oshada Peiris','oshada.peiris76@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q3',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(88,'Shanaka Ekanayake','shanaka.ekanayake77@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q1',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(89,'Sanath Rodrigo','sanath.rodrigo78@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q2',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(90,'Dulshan Rajapaksa','dulshan.rajapaksa79@altrium.com','$2b$10$r7gsq2hqaa4Wcjmzl7GCXuTokksYfrIopwmQCtF.72/ykmiiyClYm','employee','Finance','Finance Operations',NULL,'Q3',11,NULL,'2026-09-08 19:59:47','2026-09-08 19:59:47'),(91,'Anura Senaratne','anura.company@altrium.com','$2b$10$4yT9NAT0KPFmkdmrb8qnDeNT45nNNZaLjidLs.JL0XgeMa3spY7ee','company_manager','Management','Executive',NULL,NULL,NULL,NULL,'2026-09-10 19:33:35','2026-09-10 19:33:35'),(92,'Ayesha Perera','ayesha.hr@altrium.com','$2b$10$4yT9NAT0KPFmkdmrb8qnDeNT45nNNZaLjidLs.JL0XgeMa3spY7ee','employee','Human Resources','HR','IT','ALL',1,NULL,'2026-09-10 19:33:35','2026-09-12 08:25:02'),(93,'Ruwan Fernando','ruwan.hr@altrium.com','$2b$10$4yT9NAT0KPFmkdmrb8qnDeNT45nNNZaLjidLs.JL0XgeMa3spY7ee','employee','Human Resources','HR','Finance','ALL',1,NULL,'2026-09-10 19:33:35','2026-09-12 08:25:02'),(94,'Nethmi Silva','nethmi.hr@altrium.com','$2b$10$4yT9NAT0KPFmkdmrb8qnDeNT45nNNZaLjidLs.JL0XgeMa3spY7ee','employee','Human Resources','HR',NULL,'ALL',1,NULL,'2026-09-10 19:33:35','2026-09-10 19:33:40');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;


