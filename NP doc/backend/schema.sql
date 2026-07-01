-- Create Schema for Request for Parts Making Document Tracking App
CREATE DATABASE IF NOT EXISTS np_data_list CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE np_data_list;

-- 0. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  email_group VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 0B. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- Admin, MK_Staff, MK_Manager, NP_Staff, Checker, Approved, Incharge, NP_Manager, PD
  department VARCHAR(50) NOT NULL, -- Admin, MK, NP, ECN, FM, PU, PD1, PD2, PD3, PD4, QA_QC, TD, CS, PL, WH
  email VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Document Template Master (Managed by NP, Active/Disabled status, no delete)
CREATE TABLE IF NOT EXISTS document_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_name VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(50) NOT NULL, -- Responsible department
  is_apqp BOOLEAN NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active', -- Active / Disabled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Requests Table
CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_no VARCHAR(50) NOT NULL,
  revision INT NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  from_user_id INT NOT NULL,
  request_type VARCHAR(50) NOT NULL, -- Sample Part 1, Sample Part 2, Pre-Production 1, Mass Production, Other
  customer_name VARCHAR(100) NOT NULL,
  part_name VARCHAR(100) NOT NULL,
  part_no VARCHAR(100) NOT NULL,
  model_code VARCHAR(50) NOT NULL,
  rfq_volume INT NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  sample_part_qty INT NOT NULL,
  model_life INT NOT NULL,
  remark TEXT NULL,
  sop_plan VARCHAR(50) NOT NULL,
  tooling_die_leadtime INT NULL,
  tooling_die_by VARCHAR(50) NULL, -- C.N.I, CUSTOMER SUPPLY, CENTRALIZED
  delivery_date DATE NOT NULL,
  guarantee_tooling INT NULL,
  drawing_2d_path VARCHAR(255) NULL,
  drawing_3d_path VARCHAR(255) NULL,
  standard_doc_path VARCHAR(255) NULL,
  other_doc_path VARCHAR(255) NULL,
  erp_fg_no VARCHAR(100) NOT NULL,
  erp_die_no VARCHAR(100) NULL,
  apqp_last_ots DATE NOT NULL,
  ots_approved DATE NOT NULL,
  hatsu_line_in DATE NOT NULL,
  mass_production DATE NOT NULL,
  packaging VARCHAR(255) NOT NULL,
  kick_off_date DATE NULL,
  due_date_2w DATE NULL,
  due_date_4w DATE NULL,
  due_date_6w DATE NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Waiting MK Manager Approval, Approved by MK Manager, NP Setting Documents, In Progress, Completed
  is_cancelled BOOLEAN NOT NULL DEFAULT 0,
  iso_dar_status VARCHAR(50) DEFAULT 'Normal', -- Normal, Waiting ISO DAR Registration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Raw Materials Table
CREATE TABLE IF NOT EXISTS raw_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  sub_item INT NOT NULL,
  part_no VARCHAR(100) NOT NULL,
  part_name VARCHAR(100) NOT NULL,
  qty_unit INT NOT NULL,
  in_house BOOLEAN NOT NULL DEFAULT 0,
  outsource_supplier VARCHAR(100) NULL,
  outsource_moq INT NULL,
  spec_t DECIMAL(10,3) NOT NULL,
  spec_w DECIMAL(10,3) NOT NULL,
  spec_l DECIMAL(10,3) NOT NULL,
  qty_per_strip INT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- 5. Processes Table
CREATE TABLE IF NOT EXISTS processes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  process_no VARCHAR(20) NOT NULL,
  process_name VARCHAR(255) NOT NULL,
  mc VARCHAR(100) NOT NULL,
  remark TEXT NULL,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- 6. Request Documents Table (Documents required for specific request)
CREATE TABLE IF NOT EXISTS request_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  department VARCHAR(50) NOT NULL,
  is_apqp BOOLEAN NOT NULL DEFAULT 0,
  period VARCHAR(50) NOT NULL, -- 2 Weeks, 4 Weeks, 6 Weeks, OTS / OPS Approved, 1PP / Hatsu / Pre Mass Production
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Waiting Upload', -- Downloaded, No Required, Approved, Waiting Reporter, Waiting Upload, Rejected
  file_path VARCHAR(255) NULL,
  file_name VARCHAR(255) NULL,
  attached_by INT NULL,
  attached_at TIMESTAMP NULL,
  checker_approved_by INT NULL,
  checker_approved_at TIMESTAMP NULL,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  incharge_approved_by INT NULL,
  incharge_approved_at TIMESTAMP NULL,
  np_manager_approved_by INT NULL,
  np_manager_approved_at TIMESTAMP NULL,
  delay_days INT DEFAULT 0,
  reject_reason VARCHAR(255) NULL,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

-- 7. Notifications Log Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NULL,
  type VARCHAR(50) NOT NULL, -- Email, Telegram
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Departments
INSERT INTO departments (name, email_group) VALUES
('Admin', NULL),
('Accounting', NULL),
('Compliance', NULL),
('FM', 'fm_group@cni.co.th'),
('GM', NULL),
('HR', NULL),
('IT', NULL),
('Management', NULL),
('MK', 'mk_group@cni.co.th'),
('NB', NULL),
('Costing', NULL),
('MT', NULL),
('NP', 'np_group@cni.co.th'),
('PD1', 'pd1_group@cni.co.th'),
('PD2', 'pd2_group@cni.co.th'),
('PD3', 'pd3_group@cni.co.th'),
('Planning', NULL),
('Purchasing', 'purchasing_group@cni.co.th'),
('QA', 'qa_group@cni.co.th'),
('QC', 'qc_group@cni.co.th'),
('SHE', NULL),
('TD', 'td_group@cni.co.th'),
('WH', 'wh_group@cni.co.th');

-- Seed Initial Customers
INSERT INTO customers (name, note) VALUES
('SIAM KUBOTA CORPORATION CO., LTD. (SKC-A)', 'Default customer')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Initial Users
INSERT INTO users (username, password, name, role, department, email) VALUES
('admin', 'admin123', 'Administrator System', 'Admin', 'Admin', 'admin@cni.co.th'),
('mk_staff1', 'mk123', 'Yanika (MK Staff)', 'MK_Staff', 'MK', 'yanika@cni.co.th'),
('mk_manager', 'mk123', 'MK Manager', 'MK_Manager', 'MK', 'mk_manager@cni.co.th'),
('np_staff1', 'np123', 'Charoenrat (NP Staff)', 'NP_Staff', 'NP', 'charoenrat@cni.co.th'),
('np_staff2', 'np123', 'Yotsapon (NP Staff)', 'NP_Staff', 'NP', 'yotsapon@cni.co.th'),
('pd_staff1', 'pd123', 'Pornchai (PD1 Reporter)', 'PD', 'PD1', 'pd1_pornchai@cni.co.th'),
('pd_staff2', 'pd123', 'Amnat (PD4 Reporter)', 'PD', 'PD4', 'pd4_amnat@cni.co.th'),
('checker1', 'checker123', 'Checker Team Leader A', 'Checker', 'PD1', 'checker_pd1@cni.co.th'),
('checker2', 'checker123', 'Checker Team Leader B', 'Checker', 'PD4', 'checker_pd4@cni.co.th'),
('approved1', 'approved123', 'Somponlert (PU Manager)', 'Approved', 'PU', 'somponlert@cni.co.th'),
('approved2', 'approved123', 'Approved PD1 Manager', 'Approved', 'PD1', 'approved_pd1@cni.co.th'),
('incharge1', 'incharge123', 'Pipat (TD/Incharge Engineer)', 'Incharge', 'TD', 'pipat@cni.co.th'),
('np_manager', 'np123', 'NP Manager', 'NP_Manager', 'NP', 'np_manager@cni.co.th');

-- Seed Default Document Templates
INSERT INTO document_templates (document_name, department, is_apqp, status) VALUES
('PPAP Checklist', 'QA_QC', 1, 'Active'),
('Part Submission Warrant (PSW)', 'QA_QC', 1, 'Active'),
('Process Flow Chart', 'TD', 1, 'Active'),
('Process FMEA', 'TD', 1, 'Active'),
('Control Plan', 'QA_QC', 1, 'Active'),
('Dimensional Report', 'QA_QC', 0, 'Active'),
('Material Test Report', 'QA_QC', 0, 'Active'),
('Performance Test Report', 'QA_QC', 0, 'Active'),
('Appearance Approval Report (AAR)', 'QA_QC', 0, 'Active'),
('Gauge R&R Study', 'QA_QC', 0, 'Active'),
('Initial Process Capability Study (Ppk)', 'QA_QC', 0, 'Active'),
('Packaging Standard', 'PL', 0, 'Active'),
('Supplier PPAP Approval', 'PU', 0, 'Active'),
('Tooling Construction Approval', 'TD', 0, 'Active'),
('Machine Capability (Cmk)', 'TD', 0, 'Active'),
('Jig & Fixture Check Sheet', 'TD', 0, 'Active'),
('Work Instruction (WI)', 'PD1', 0, 'Active'),
('Daily Check Sheet', 'PD1', 0, 'Active');
