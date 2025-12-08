-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Dec 06, 2025 at 10:22 PM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.0.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mantech_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `intern_id` int(11) NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('present','absent','late') DEFAULT 'present',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `budget`
--

CREATE TABLE `budget` (
  `id` int(11) NOT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `spent` decimal(10,2) DEFAULT 0.00,
  `description` text DEFAULT NULL,
  `fiscal_year` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(11) NOT NULL,
  `event_name` varchar(255) NOT NULL,
  `event_date` date NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `budget` decimal(10,2) DEFAULT NULL,
  `status` enum('planned','ongoing','completed') DEFAULT 'planned',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `interns`
--

CREATE TABLE `interns` (
  `id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `registration_date` date NOT NULL,
  `status` enum('active','inactive','completed') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `school` varchar(255) DEFAULT NULL,
  `degree` varchar(255) DEFAULT NULL,
  `year_of_study` varchar(50) DEFAULT NULL,
  `gpa` decimal(3,2) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `mentor` varchar(255) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `interns`
--

INSERT INTO `interns` (`id`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `registration_date`, `status`, `created_at`, `updated_at`, `school`, `degree`, `year_of_study`, `gpa`, `department`, `start_date`, `end_date`, `mentor`, `skills`, `notes`) VALUES
(10, 'test', 'shield', 'fongongserge21@gmail.com', '+237680600811', NULL, '2025-12-02', 'active', '2025-12-02 09:35:10', '2025-12-02 09:35:10', 'FET', 'bachelors in computer engineering', '3rd Year', NULL, 'Software Development', '2025-12-09', '2025-12-16', NULL, 'balling', NULL),
(11, 'lemuel', 'fineboy', 'lemuelmbunwe@gmail.com', '+237680600811', NULL, '2025-12-04', 'active', '2025-12-04 15:56:37', '2025-12-04 15:56:37', 'FET', 'bachelors in computer engineering', '3rd Year', NULL, 'Software Development', '2025-12-11', '2025-12-25', NULL, 'dancing', 'he lied about his skill'),
(12, 'fong', 'serg', 'serge@gmail.com', '680600811', NULL, '2025-12-06', 'active', '2025-12-06 08:28:03', '2025-12-06 08:28:03', 'FET', 'bachelors in computer engineering', '4th Year', NULL, 'Network Administration', '2025-12-07', '2025-12-16', NULL, 'talking', NULL),
(13, 'sergio rakitin', 'kitchens', 'nwantolyben@gmail.com', '237678366438', NULL, '2025-12-06', 'active', '2025-12-06 09:41:49', '2025-12-06 09:41:49', 'FET', 'bachelors in computer engineering', '3rd Year', '1.65', 'Software Development', '2025-12-06', '2026-07-06', 'Lemuel Fineboy', 'nothing', 'nothing');

-- --------------------------------------------------------

--
-- Table structure for table `receipts`
--

CREATE TABLE `receipts` (
  `id` int(11) NOT NULL,
  `receipt_id` varchar(50) NOT NULL,
  `intern_id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_type` varchar(50) NOT NULL,
  `fee_type_description` varchar(255) DEFAULT NULL,
  `payment_description` varchar(255) DEFAULT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `amount_paid` decimal(10,2) NOT NULL,
  `balance` decimal(10,2) GENERATED ALWAYS AS (`amount_due` - `amount_paid`) STORED,
  `payment_method` varchar(50) NOT NULL,
  `received_by` varchar(100) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `void_reason` varchar(255) DEFAULT NULL,
  `voided_at` timestamp NULL DEFAULT NULL,
  `voided_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `receipts`
--

INSERT INTO `receipts` (`id`, `receipt_id`, `intern_id`, `payment_date`, `payment_type`, `fee_type_description`, `payment_description`, `amount_due`, `amount_paid`, `payment_method`, `received_by`, `notes`, `status`, `created_at`, `created_by`, `updated_at`, `void_reason`, `voided_at`, `voided_by`) VALUES
(1, 'ETS/2025/12/001', 11, '2025-12-05', 'Registration Fee', NULL, NULL, '5000.00', '5000.00', 'Mobile Money', 'Admin', NULL, 'Active', '2025-12-06 20:28:59', 1, '2025-12-06 21:11:45', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `receipt_audit_logs`
--

CREATE TABLE `receipt_audit_logs` (
  `id` int(11) NOT NULL,
  `receipt_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `action_by` int(11) NOT NULL,
  `action_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `receipt_audit_logs`
--

INSERT INTO `receipt_audit_logs` (`id`, `receipt_id`, `action`, `action_by`, `action_timestamp`, `old_values`, `new_values`, `notes`) VALUES
(1, 1, 'CREATE', 1, '2025-12-06 20:28:59', NULL, '{\"receipt_id\":\"ETS/2025/12/001\",\"amount_due\":5000,\"amount_paid\":4000}', NULL),
(2, 1, 'UPDATE', 1, '2025-12-06 21:11:45', '{\"amount_due\": \"5000.00\", \"amount_paid\": \"4000.00\"}', '{\"amount_due\": 5000, \"amount_paid\": 5000}', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `created_at`, `updated_at`) VALUES
(1, 'admin@ets-ntech.org', '$2b$10$/iQTaRKf/W1n/ePMUmEBFeGL2eH3RfkBLkSq2KDpURKtibPHNNW5m', 'Admin User', '2025-11-30 10:12:53', '2025-11-30 10:12:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attendance` (`intern_id`,`attendance_date`),
  ADD KEY `idx_date` (`attendance_date`);

--
-- Indexes for table `budget`
--
ALTER TABLE `budget`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_year` (`fiscal_year`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_date` (`event_date`);

--
-- Indexes for table `interns`
--
ALTER TABLE `interns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `receipts`
--
ALTER TABLE `receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `receipt_id` (`receipt_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `voided_by` (`voided_by`),
  ADD KEY `idx_receipt_id` (`receipt_id`),
  ADD KEY `idx_intern_id` (`intern_id`),
  ADD KEY `idx_payment_date` (`payment_date`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `receipt_audit_logs`
--
ALTER TABLE `receipt_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `action_by` (`action_by`),
  ADD KEY `idx_receipt_id` (`receipt_id`),
  ADD KEY `idx_action_timestamp` (`action_timestamp`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `budget`
--
ALTER TABLE `budget`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `interns`
--
ALTER TABLE `interns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `receipt_audit_logs`
--
ALTER TABLE `receipt_audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `receipts`
--
ALTER TABLE `receipts`
  ADD CONSTRAINT `receipts_ibfk_1` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`),
  ADD CONSTRAINT `receipts_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `receipts_ibfk_3` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `receipt_audit_logs`
--
ALTER TABLE `receipt_audit_logs`
  ADD CONSTRAINT `receipt_audit_logs_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`),
  ADD CONSTRAINT `receipt_audit_logs_ibfk_2` FOREIGN KEY (`action_by`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
