-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jan 11, 2026 at 01:26 PM
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
  `status` enum('present','absent','late','excused') DEFAULT 'absent',
  `registration_id` varchar(20) DEFAULT NULL,
  `sign_in_time` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `validation_method` varchar(50) DEFAULT NULL,
  `is_override` tinyint(1) DEFAULT 0,
  `override_by` int(11) DEFAULT NULL,
  `override_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `intern_id`, `attendance_date`, `status`, `registration_id`, `sign_in_time`, `ip_address`, `device_fingerprint`, `validation_method`, `is_override`, `override_by`, `override_reason`, `created_at`, `updated_at`) VALUES
(13, 18, '2026-01-11', 'present', NULL, '2026-01-11 09:15:00', '192.168.2.101', 'device_fp_001', 'token', 0, NULL, NULL, '2026-01-11 12:21:20', '2026-01-11 12:21:20'),
(14, 19, '2026-01-11', 'absent', NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL, '2026-01-11 12:21:20', '2026-01-11 12:21:20'),
(15, 17, '2026-01-10', 'present', NULL, '2026-01-10 09:30:00', '192.168.2.101', 'device_fp_001', 'token', 0, NULL, NULL, '2026-01-11 12:21:20', '2026-01-11 12:21:20'),
(16, 19, '2026-01-10', 'present', NULL, '2026-01-10 10:00:00', '192.168.2.102', 'device_fp_002', 'token', 0, NULL, NULL, '2026-01-11 12:21:20', '2026-01-11 12:21:20');

-- --------------------------------------------------------

--
-- Table structure for table `attendance_audit_logs`
--

CREATE TABLE `attendance_audit_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `intern_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_value` varchar(100) DEFAULT NULL,
  `new_value` varchar(100) DEFAULT NULL,
  `reason` text DEFAULT NULL,
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
-- Table structure for table `groups`
--

CREATE TABLE `groups` (
  `id` int(11) NOT NULL,
  `group_name` varchar(100) NOT NULL,
  `group_number` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_by` int(11) NOT NULL,
  `status` enum('draft','active','completed','archived') DEFAULT 'draft',
  `cycle_start_date` date DEFAULT NULL,
  `cycle_end_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `groups`
--

INSERT INTO `groups` (`id`, `group_name`, `group_number`, `created_at`, `created_by`, `status`, `cycle_start_date`, `cycle_end_date`, `notes`, `updated_at`) VALUES
(3, 'Project Group 1', 1, '2026-01-07 08:34:26', 1, 'active', '2026-01-07', NULL, NULL, '2026-01-07 08:34:26'),
(4, 'Project Group 2', 2, '2026-01-07 08:34:26', 1, 'active', '2026-01-07', NULL, NULL, '2026-01-07 08:34:26');

-- --------------------------------------------------------

--
-- Table structure for table `group_audit_logs`
--

CREATE TABLE `group_audit_logs` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `action_by` int(11) NOT NULL,
  `action_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `details` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `group_audit_logs`
--

INSERT INTO `group_audit_logs` (`id`, `group_id`, `action`, `action_by`, `action_timestamp`, `old_values`, `new_values`, `details`) VALUES
(4, 3, 'CREATE', 1, '2026-01-07 08:34:26', NULL, '{\"groupName\":\"Project Group 1\",\"memberCount\":4,\"schoolDistribution\":{\"FET\":4}}', 'Auto-generated group with 4 members'),
(5, 4, 'CREATE', 1, '2026-01-07 08:34:26', NULL, '{\"groupName\":\"Project Group 2\",\"memberCount\":4,\"schoolDistribution\":{\"yibs\":2,\"FET\":2}}', 'Auto-generated group with 4 members'),
(6, 3, 'REMOVE_MEMBER', 1, '2026-01-07 08:34:51', NULL, NULL, 'Removed intern 17 from group'),
(7, 3, 'REMOVE_MEMBER', 1, '2026-01-07 08:35:54', NULL, NULL, 'Removed intern 11 from group');

-- --------------------------------------------------------

--
-- Table structure for table `group_members`
--

CREATE TABLE `group_members` (
  `id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `intern_id` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `assigned_by` int(11) NOT NULL,
  `status` enum('active','removed','transferred') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `group_members`
--

INSERT INTO `group_members` (`id`, `group_id`, `intern_id`, `assigned_at`, `assigned_by`, `status`) VALUES
(9, 3, 12, '2026-01-07 08:34:26', 1, 'active'),
(10, 3, 16, '2026-01-07 08:34:26', 1, 'active'),
(11, 3, 11, '2026-01-07 08:34:26', 1, 'removed'),
(12, 3, 17, '2026-01-07 08:34:26', 1, 'removed'),
(13, 4, 15, '2026-01-07 08:34:26', 1, 'active'),
(14, 4, 14, '2026-01-07 08:34:26', 1, 'active'),
(15, 4, 13, '2026-01-07 08:34:26', 1, 'active'),
(16, 4, 10, '2026-01-07 08:34:26', 1, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `interns`
--

CREATE TABLE `interns` (
  `id` int(11) NOT NULL,
  `registration_id` varchar(20) NOT NULL,
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

INSERT INTO `interns` (`id`, `registration_id`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `registration_date`, `status`, `created_at`, `updated_at`, `school`, `degree`, `year_of_study`, `gpa`, `department`, `start_date`, `end_date`, `mentor`, `skills`, `notes`) VALUES
(10, '', 'test', 'shield', 'fongongserge2@gmail.com', '+237680600811', NULL, '2025-12-02', 'active', '2025-12-02 09:35:10', '2025-12-10 16:49:34', 'FET', 'bachelors in computer engineering', '3rd Year', NULL, 'Software Development', '2025-12-09', '2025-12-16', NULL, 'balling', NULL),
(11, '', 'lemuel', 'fineboy', 'lemuelmbunwe@gmail.com', '+237680600811', NULL, '2025-12-04', 'active', '2025-12-04 15:56:37', '2025-12-04 15:56:37', 'FET', 'bachelors in computer engineering', '3rd Year', NULL, 'Software Development', '2025-12-11', '2025-12-25', NULL, 'dancing', 'he lied about his skill'),
(12, '', 'fong', 'serg', 'serge@gmail.com', '680600811', NULL, '2025-12-06', 'active', '2025-12-06 08:28:03', '2025-12-06 08:28:03', 'FET', 'bachelors in computer engineering', '4th Year', NULL, 'Network Administration', '2025-12-07', '2025-12-16', NULL, 'talking', NULL),
(13, '', 'sergio rakitin', 'kitchens', 'nwantolyben@gmail.com', '237678366438', NULL, '2025-12-06', 'active', '2025-12-06 09:41:49', '2025-12-06 09:41:49', 'FET', 'bachelors in computer engineering', '3rd Year', '1.65', 'Software Development', '2025-12-06', '2026-07-06', 'Lemuel Fineboy', 'nothing', 'nothing'),
(14, '', 'Samiratu', 'Daheri', 'samiradaheri99@gmail.com', '6712345678', NULL, '2025-12-08', 'active', '2025-12-08 19:45:08', '2025-12-08 19:45:08', 'yibs', 'bachelors in software engineering', '2nd Year', NULL, 'Software Development', '2025-12-09', '2025-12-31', 'Le Boss', 'experienced hands', NULL),
(15, '', 'Julliet', 'Tanya', 'julliettanya7@gmail.com', '6777777777', NULL, '2025-12-09', 'active', '2025-12-09 21:11:59', '2025-12-09 21:11:59', 'yibs', 'bachelors in computer engineering', '2nd Year', NULL, 'Software Development', '2025-12-10', '2025-12-30', NULL, 'talking', NULL),
(16, '', 'fongong', 'serge', 'fongongserge1@gmail.com', '+237680600811', NULL, '2025-12-10', 'active', '2025-12-10 16:49:42', '2026-01-08 06:17:05', 'FET', 'bachelors in computer engineering', '4th Year', NULL, 'Software Development', '2025-12-11', '2025-12-24', NULL, 'talking', NULL),
(17, '', 'Suh', 'Herbert', 'team@etsntech.org', '237680600811', NULL, '2025-12-20', 'active', '2025-12-20 11:14:07', '2025-12-20 11:14:07', 'FET', 'bachelors in computer engineering', '3rd Year', NULL, 'Software Development', '2025-12-22', '2026-01-19', 'nonw', 'baseball', NULL),
(18, '', 'reg', 'test', 'fongongserge21@gmail.com', '237680600811', NULL, '2026-01-08', 'active', '2026-01-08 06:45:15', '2026-01-08 06:45:15', 'hibmat', 'bachelors in computer engineering', '2nd Year', NULL, 'Database Management', '2026-01-15', '2026-01-24', NULL, 'this is cooking', NULL),
(19, 'INT752927', 'reges', 'tetes', 'fongongblaise@gmail.com', '237680600811', NULL, '2026-01-08', 'active', '2026-01-08 07:07:01', '2026-01-08 07:07:01', 'hibmat', 'bachelors in software engineering', '2nd Year', NULL, 'Software Development', '2026-01-09', '2026-01-22', NULL, 'nothing', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `receipt_id` int(11) NOT NULL,
  `payment_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `payment_date` date NOT NULL,
  `recorded_by` int(11) NOT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `receipt_id`, `payment_amount`, `payment_method`, `payment_date`, `recorded_by`, `recorded_at`, `notes`) VALUES
(1, 2, '20000.00', 'Mobile Money', '2025-12-07', 1, '2025-12-07 08:32:05', 'this is the complete payment'),
(2, 3, '2000.00', 'Mobile Money', '2025-12-07', 1, '2025-12-07 09:28:19', NULL),
(3, 3, '1000.00', 'Bank Transfer', '2025-12-07', 1, '2025-12-07 09:28:58', NULL),
(4, 5, '1000.00', 'Mobile Money', '2025-12-07', 1, '2025-12-07 09:43:50', NULL),
(5, 5, '1000.00', 'Card', '2025-12-07', 1, '2025-12-07 09:44:35', NULL),
(6, 6, '3000.00', 'Bank Transfer', '2025-12-07', 1, '2025-12-07 09:52:32', NULL),
(7, 7, '2000.00', 'Mobile Money', '2025-12-20', 1, '2025-12-20 11:28:26', NULL),
(8, 9, '3000.00', 'Mobile Money', '2025-12-28', 1, '2025-12-28 07:20:42', NULL);

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
  `voided_by` int(11) DEFAULT NULL,
  `payment_status` varchar(20) DEFAULT 'Pending Payment',
  `initial_payment_recorded` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `receipts`
--

INSERT INTO `receipts` (`id`, `receipt_id`, `intern_id`, `payment_date`, `payment_type`, `fee_type_description`, `payment_description`, `amount_due`, `amount_paid`, `payment_method`, `received_by`, `notes`, `status`, `created_at`, `created_by`, `updated_at`, `void_reason`, `voided_at`, `voided_by`, `payment_status`, `initial_payment_recorded`) VALUES
(1, 'ETS/2025/12/001', 11, '2025-12-05', 'Registration Fee', NULL, NULL, '5000.00', '5000.00', 'Mobile Money', 'Admin', NULL, 'Active', '2025-12-06 20:28:59', 1, '2025-12-06 21:11:45', NULL, NULL, NULL, 'Pending Payment', 0),
(2, 'ETS/2025/12/002', 13, '2025-12-07', 'Internship Fee', NULL, NULL, '50000.00', '30000.00', 'Cash', 'Admin', NULL, 'Active', '2025-12-07 08:22:55', 1, '2025-12-07 08:32:05', NULL, NULL, NULL, 'Pending Payment', 1),
(3, 'ETS/2025/12/003', 10, '2025-12-07', 'Internship Fee', NULL, NULL, '3000.00', '2000.00', 'Cash', 'Admin', NULL, 'Active', '2025-12-07 09:26:40', 1, '2025-12-07 09:28:19', NULL, NULL, NULL, 'Pending Payment', 1),
(4, 'ETS/2025/12/004', 12, '2025-12-07', 'Internship Fee', NULL, NULL, '50000.00', '20000.00', 'Bank Transfer', 'Admin', NULL, 'Active', '2025-12-07 09:30:30', 1, '2025-12-07 09:30:30', NULL, NULL, NULL, 'Pending Payment', 0),
(5, 'ETS/2025/12/005', 11, '2025-12-07', 'Other Fees', 'showcase', NULL, '5000.00', '3000.00', 'Cash', 'Admin', NULL, 'Active', '2025-12-07 09:43:09', 1, '2025-12-07 09:43:50', NULL, NULL, NULL, 'Pending Payment', 1),
(6, 'ETS/2025/12/006', 10, '2025-12-07', 'Custom Payment', NULL, 'showcase tshirt', '10000.00', '7000.00', 'Cash', 'Admin', NULL, 'Active', '2025-12-07 09:51:42', 1, '2025-12-07 09:52:32', NULL, NULL, NULL, 'Pending Payment', 1),
(7, 'ETS/2025/12/007', 17, '2025-12-20', 'Other Fees', 'showcase', NULL, '5000.00', '3000.00', 'Cash', 'Admin', NULL, 'Active', '2025-12-20 11:25:33', 1, '2025-12-20 11:28:26', NULL, NULL, NULL, 'Pending Payment', 1),
(8, 'ETS/2025/12/008', 10, '2025-12-28', 'Internship Fee', NULL, NULL, '5000.00', '2000.00', 'Cash', 'Admin', 'Paid partial internship fee ', 'Active', '2025-12-28 07:16:31', 1, '2025-12-28 07:16:31', NULL, NULL, NULL, 'Pending Payment', 0),
(9, 'ETS/2025/12/009', 16, '2025-12-28', 'Internship Fee', NULL, NULL, '5000.00', '2000.00', 'Cash', 'Admin', 'nothing to add', 'Active', '2025-12-28 07:18:18', 1, '2025-12-28 07:20:42', NULL, NULL, NULL, 'Pending Payment', 1);

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
(2, 1, 'UPDATE', 1, '2025-12-06 21:11:45', '{\"amount_due\": \"5000.00\", \"amount_paid\": \"4000.00\"}', '{\"amount_due\": 5000, \"amount_paid\": 5000}', NULL),
(3, 2, 'CREATE', 1, '2025-12-07 08:22:55', NULL, '{\"receipt_id\":\"ETS/2025/12/002\",\"amount_due\":50000,\"amount_paid\":30000}', NULL),
(4, 2, 'PARTIAL_PAYMENT', 1, '2025-12-07 08:32:05', NULL, '{\"payment_amount\":20000,\"new_status\":\"Pending Payment\"}', NULL),
(5, 3, 'CREATE', 1, '2025-12-07 09:26:40', NULL, '{\"receipt_id\":\"ETS/2025/12/003\",\"amount_due\":3000,\"amount_paid\":2000}', NULL),
(6, 3, 'PARTIAL_PAYMENT', 1, '2025-12-07 09:28:19', NULL, '{\"payment_amount\":2000,\"new_status\":\"Pending Payment\"}', NULL),
(7, 3, 'PARTIAL_PAYMENT', 1, '2025-12-07 09:28:58', NULL, '{\"payment_amount\":1000,\"new_status\":\"Pending Payment\"}', NULL),
(8, 4, 'CREATE', 1, '2025-12-07 09:30:30', NULL, '{\"receipt_id\":\"ETS/2025/12/004\",\"amount_due\":50000,\"amount_paid\":20000}', NULL),
(9, 5, 'CREATE', 1, '2025-12-07 09:43:09', NULL, '{\"receipt_id\":\"ETS/2025/12/005\",\"amount_due\":5000,\"amount_paid\":3000}', NULL),
(10, 5, 'PARTIAL_PAYMENT', 1, '2025-12-07 09:43:50', NULL, '{\"payment_amount\":1000,\"new_status\":\"Pending Payment\"}', NULL),
(11, 5, 'PARTIAL_PAYMENT', 1, '2025-12-07 09:44:35', NULL, '{\"payment_amount\":1000,\"new_status\":\"Pending Payment\"}', NULL),
(12, 6, 'CREATE', 1, '2025-12-07 09:51:42', NULL, '{\"receipt_id\":\"ETS/2025/12/006\",\"amount_due\":10000,\"amount_paid\":7000}', NULL),
(13, 6, 'PARTIAL_PAYMENT', 1, '2025-12-07 09:52:32', NULL, '{\"payment_amount\":3000,\"new_status\":\"Pending Payment\"}', NULL),
(14, 7, 'CREATE', 1, '2025-12-20 11:25:33', NULL, '{\"receipt_id\":\"ETS/2025/12/007\",\"amount_due\":5000,\"amount_paid\":3000}', NULL),
(15, 7, 'PARTIAL_PAYMENT', 1, '2025-12-20 11:28:26', NULL, '{\"payment_amount\":2000,\"new_status\":\"Pending Payment\"}', NULL),
(16, 8, 'CREATE', 1, '2025-12-28 07:16:31', NULL, '{\"receipt_id\":\"ETS/2025/12/008\",\"amount_due\":5000,\"amount_paid\":2000}', NULL),
(17, 9, 'CREATE', 1, '2025-12-28 07:18:18', NULL, '{\"receipt_id\":\"ETS/2025/12/009\",\"amount_due\":5000,\"amount_paid\":2000}', NULL),
(18, 9, 'PARTIAL_PAYMENT', 1, '2025-12-28 07:20:42', NULL, '{\"payment_amount\":3000,\"new_status\":\"Pending Payment\"}', NULL);

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
  ADD UNIQUE KEY `unique_daily_attendance` (`intern_id`,`attendance_date`),
  ADD KEY `idx_attendance_date` (`attendance_date`),
  ADD KEY `idx_registration_id` (`registration_id`),
  ADD KEY `idx_sign_in_time` (`sign_in_time`);

--
-- Indexes for table `attendance_audit_logs`
--
ALTER TABLE `attendance_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `intern_id` (`intern_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

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
-- Indexes for table `groups`
--
ALTER TABLE `groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_group_number` (`group_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `group_audit_logs`
--
ALTER TABLE `group_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `action_by` (`action_by`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_action_timestamp` (`action_timestamp`);

--
-- Indexes for table `group_members`
--
ALTER TABLE `group_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_group_member` (`group_id`,`intern_id`),
  ADD KEY `assigned_by` (`assigned_by`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_intern_id` (`intern_id`),
  ADD KEY `idx_assigned_at` (`assigned_at`);

--
-- Indexes for table `interns`
--
ALTER TABLE `interns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_registration_id` (`registration_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recorded_by` (`recorded_by`),
  ADD KEY `idx_receipt_id` (`receipt_id`),
  ADD KEY `idx_payment_date` (`payment_date`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `attendance_audit_logs`
--
ALTER TABLE `attendance_audit_logs`
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
-- AUTO_INCREMENT for table `groups`
--
ALTER TABLE `groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `group_audit_logs`
--
ALTER TABLE `group_audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `group_members`
--
ALTER TABLE `group_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `interns`
--
ALTER TABLE `interns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `receipt_audit_logs`
--
ALTER TABLE `receipt_audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

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
-- Constraints for table `attendance_audit_logs`
--
ALTER TABLE `attendance_audit_logs`
  ADD CONSTRAINT `attendance_audit_logs_ibfk_1` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `groups`
--
ALTER TABLE `groups`
  ADD CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `group_audit_logs`
--
ALTER TABLE `group_audit_logs`
  ADD CONSTRAINT `group_audit_logs_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_audit_logs_ibfk_2` FOREIGN KEY (`action_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `group_members`
--
ALTER TABLE `group_members`
  ADD CONSTRAINT `group_members_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_members_ibfk_2` FOREIGN KEY (`intern_id`) REFERENCES `interns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `group_members_ibfk_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`),
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`);

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
