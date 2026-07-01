const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
require('dotenv').config();

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create upload directories
const uploadDirs = [
  'uploads',
  'uploads/drawings',
  'uploads/documents',
  'uploads/processes'
];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname.startsWith('drawing') || file.fieldname.startsWith('standard') || file.fieldname.startsWith('other')) {
      cb(null, path.join(__dirname, 'uploads/drawings'));
    } else if (file.fieldname === 'process_file') {
      cb(null, path.join(__dirname, 'uploads/processes'));
    } else {
      cb(null, path.join(__dirname, 'uploads/documents'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

function formatDateForDisplay(value) {
  if (!value) return '-';
  const str = String(value);
  const dateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    return `${dateOnly[3]}-${dateOnly[2]}-${dateOnly[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return str;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Helper to log notifications
async function logNotification(requestId, type, recipient, subject, message) {
  try {
    await db.query(
      `INSERT INTO notifications (request_id, type, recipient, subject, message) VALUES (?, ?, ?, ?, ?)`,
      [requestId, type, recipient, subject, message]
    );
    console.log(`📣 Notification logged: [${type}] to ${recipient} - ${subject}`);
  } catch (error) {
    console.error('Error logging notification:', error);
  }
}

async function ensureCustomersTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(
      `INSERT INTO customers (name, note)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      ['SIAM KUBOTA CORPORATION CO., LTD. (SKC-A)', 'Default customer']
    );
  } catch (error) {
    console.error('Error ensuring customers table:', error.message);
  }
}

async function ensureDepartmentEmailGroupColumn() {
  try {
    const columns = await db.query("SHOW COLUMNS FROM departments LIKE 'email_group'", []);
    if (columns.length === 0) {
      await db.query('ALTER TABLE departments ADD COLUMN email_group VARCHAR(255) NULL AFTER name', []);
      console.log('✅ Added departments.email_group column.');
    }

    const defaults = {
      MK: 'mk_group@cni.co.th',
      NP: 'np_group@cni.co.th',
      ECN: 'ecn_group@cni.co.th',
      FM: 'fm_group@cni.co.th',
      Purchasing: 'purchasing_group@cni.co.th',
      PD1: 'pd1_group@cni.co.th',
      PD2: 'pd2_group@cni.co.th',
      PD3: 'pd3_group@cni.co.th',
      QA: 'qa_group@cni.co.th',
      QC: 'qc_group@cni.co.th',
      TD: 'td_group@cni.co.th',
      Planning: 'planning_group@cni.co.th',
      WH: 'wh_group@cni.co.th'
    };

    for (const [name, email] of Object.entries(defaults)) {
      await db.query(
        "UPDATE departments SET email_group = ? WHERE name = ? AND (email_group IS NULL OR email_group = '')",
        [email, name]
      );
    }
  } catch (error) {
    console.error('Error ensuring departments.email_group column:', error.message);
  }
}

const departmentSchemaReady = ensureDepartmentEmailGroupColumn();
const customerSchemaReady = ensureCustomersTable();

// Migrate department VARCHAR(50) -> VARCHAR(255) to support multiple departments
async function ensureDepartmentColumnExpanded() {
  try {
    const cols = await db.query(
      `SELECT CHARACTER_MAXIMUM_LENGTH 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'document_templates' 
         AND COLUMN_NAME = 'department'`,
      []
    );
    if (cols.length > 0 && cols[0].CHARACTER_MAXIMUM_LENGTH < 255) {
      await db.query('ALTER TABLE document_templates MODIFY COLUMN department VARCHAR(255) NOT NULL', []);
      console.log('✅ Expanded document_templates.department to VARCHAR(255)');
    }
    const cols2 = await db.query(
      `SELECT CHARACTER_MAXIMUM_LENGTH 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'request_documents' 
         AND COLUMN_NAME = 'department'`,
      []
    );
    if (cols2.length > 0 && cols2[0].CHARACTER_MAXIMUM_LENGTH < 255) {
      await db.query('ALTER TABLE request_documents MODIFY COLUMN department VARCHAR(255) NOT NULL', []);
      console.log('✅ Expanded request_documents.department to VARCHAR(255)');
    }
  } catch (error) {
    console.error('Error expanding department column:', error.message);
  }
}
ensureDepartmentColumnExpanded();

const departmentAliases = {
  PU: 'Purchasing',
  QA_QC: 'QA'
};

function fallbackDepartmentEmail(department) {
  return `${String(department || '').toLowerCase()}@cni.co.th`;
}

async function getDepartmentEmailGroup(department) {
  await departmentSchemaReady;
  const deptName = String(department || '').trim();
  if (!deptName) return '';

  const lookupNames = [deptName];
  if (departmentAliases[deptName]) {
    lookupNames.push(departmentAliases[deptName]);
  }

  const placeholders = lookupNames.map(() => '?').join(', ');
  const rows = await db.query(
    `SELECT email_group FROM departments WHERE name IN (${placeholders}) AND email_group IS NOT NULL AND email_group != '' LIMIT 1`,
    lookupNames
  );

  return rows[0]?.email_group || fallbackDepartmentEmail(deptName);
}

async function formatDepartmentRecipient(department) {
  const email = await getDepartmentEmailGroup(department);
  return `แผนก ${department} (${email})`;
}

async function formatDepartmentRecipients(departmentNames) {
  const uniqueNames = [...new Set(departmentNames.filter(Boolean))];
  const recipients = [];
  for (const dept of uniqueNames) {
    recipients.push(await formatDepartmentRecipient(dept));
  }
  return recipients.join(', ');
}

// ----------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0 || users[0].password !== password) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const user = { ...users[0] };
    delete user.password;
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์', error: error.message });
  }
});

// ----------------------------------------------------
// 1B. USER MANAGEMENT ENDPOINTS
// ----------------------------------------------------
app.get('/api/users', async (req, res) => {
  try {
    const list = await db.query('SELECT id, username, name, role, department, email FROM users ORDER BY name');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { username, password, name, role, department, email } = req.body;
  try {
    const duplicate = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' });
    }
    const result = await db.query(
      'INSERT INTO users (username, password, name, role, department, email) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, name, role, department, email]
    );
    res.status(201).json({ id: result.insertId, username, name, role, department, email });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้งาน', error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, password, name, role, department, email } = req.body;
  try {
    const duplicate = await db.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้งานนี้มีอยู่ในระบบแล้ว' });
    }
    
    if (password && password.trim() !== '') {
      await db.query(
        'UPDATE users SET username = ?, password = ?, name = ?, role = ?, department = ?, email = ? WHERE id = ?',
        [username, password, name, role, department, email, id]
      );
    } else {
      await db.query(
        'UPDATE users SET username = ?, name = ?, role = ?, department = ?, email = ? WHERE id = ?',
        [username, name, role, department, email, id]
      );
    }
    res.json({ id, username, name, role, department, email });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้งาน', error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db.query('SELECT username FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
    }
    if (user[0].username === 'admin') {
      return res.status(400).json({ message: 'ไม่สามารถลบบัญชีหลักของระบบ (admin) ได้' });
    }
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน', error: error.message });
  }
});

// ----------------------------------------------------
// 1C. DEPARTMENT MASTER ENDPOINTS
// ----------------------------------------------------
app.get('/api/departments', async (req, res) => {
  try {
    await departmentSchemaReady;
    const list = await db.query('SELECT * FROM departments ORDER BY name');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลแผนกได้', error: error.message });
  }
});

app.post('/api/departments', async (req, res) => {
  const { name, email_group } = req.body;
  try {
    await departmentSchemaReady;
    const duplicate = await db.query('SELECT id FROM departments WHERE name = ?', [name]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'แผนกนี้มีอยู่ในระบบแล้ว' });
    }
    const result = await db.query('INSERT INTO departments (name, email_group) VALUES (?, ?)', [name, email_group || null]);
    res.status(201).json({ id: result.insertId, name, email_group: email_group || null });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างแผนก', error: error.message });
  }
});

app.put('/api/departments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email_group } = req.body;
  try {
    await departmentSchemaReady;
    const dept = await db.query('SELECT name FROM departments WHERE id = ?', [id]);
    if (dept.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลแผนก' });
    }
    const oldName = dept[0].name;

    const duplicate = await db.query('SELECT id FROM departments WHERE name = ? AND id != ?', [name, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'แผนกนี้มีอยู่ในระบบแล้ว' });
    }

    await db.query('UPDATE departments SET name = ?, email_group = ? WHERE id = ?', [name, email_group || null, id]);
    await db.query('UPDATE users SET department = ? WHERE department = ?', [name, oldName]);

    res.json({ id, name, email_group: email_group || null });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขแผนก', error: error.message });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const dept = await db.query('SELECT name FROM departments WHERE id = ?', [id]);
    if (dept.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลแผนก' });
    }
    const deptName = dept[0].name;

    const inUse = await db.query('SELECT id FROM users WHERE department = ?', [deptName]);
    if (inUse.length > 0) {
      return res.status(400).json({ message: 'ไม่สามารถลบแผนกนี้ได้ เนื่องจากยังมีผู้ใช้ในระบบสังกัดแผนกนี้อยู่' });
    }

    await db.query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ message: 'ลบแผนกสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบแผนก', error: error.message });
  }
});

// ----------------------------------------------------
// 1D. CUSTOMER MASTER ENDPOINTS
// ----------------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    await customerSchemaReady;
    const list = await db.query('SELECT * FROM customers ORDER BY name');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Cannot load customers', error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, note } = req.body;
  try {
    await customerSchemaReady;
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const duplicate = await db.query('SELECT id FROM customers WHERE name = ?', [cleanName]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'Customer already exists' });
    }

    const result = await db.query(
      'INSERT INTO customers (name, note) VALUES (?, ?)',
      [cleanName, note || null]
    );
    res.status(201).json({ id: result.insertId, name: cleanName, note: note || null });
  } catch (error) {
    res.status(500).json({ message: 'Cannot create customer', error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, note } = req.body;
  try {
    await customerSchemaReady;
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const duplicate = await db.query('SELECT id FROM customers WHERE name = ? AND id != ?', [cleanName, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({ message: 'Customer already exists' });
    }

    await db.query('UPDATE customers SET name = ?, note = ? WHERE id = ?', [cleanName, note || null, id]);
    res.json({ id, name: cleanName, note: note || null });
  } catch (error) {
    res.status(500).json({ message: 'Cannot update customer', error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await customerSchemaReady;
    const inUse = await db.query(
      `SELECT c.id
       FROM customers c
       JOIN requests r ON r.customer_name = c.name
       WHERE c.id = ?
       LIMIT 1`,
      [id]
    );
    if (inUse.length > 0) {
      return res.status(400).json({ message: 'Cannot delete a customer that is used by requests' });
    }

    await db.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Cannot delete customer', error: error.message });
  }
});

// ----------------------------------------------------
// 2. DOCUMENT TEMPLATES MASTER (NP Management)
// ----------------------------------------------------
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await db.query('SELECT * FROM document_templates ORDER BY created_at DESC');
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลเทมเพลตเอกสารได้', error: error.message });
  }
});

app.post('/api/templates', async (req, res) => {
  const { document_name, department, is_apqp } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO document_templates (document_name, department, is_apqp) VALUES (?, ?, ?)',
      [document_name, department, is_apqp ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, document_name, department, is_apqp, status: 'Active' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกเทมเพลตเอกสาร', error: error.message });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { document_name, department, is_apqp, status } = req.body;
  try {
    await db.query(
      'UPDATE document_templates SET document_name = ?, department = ?, is_apqp = ?, status = ? WHERE id = ?',
      [document_name, department, is_apqp ? 1 : 0, status, id]
    );
    res.json({ id, document_name, department, is_apqp, status });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตเทมเพลตเอกสาร', error: error.message });
  }
});

// ----------------------------------------------------
// 3. PARTS MAKING REQUESTS
// ----------------------------------------------------

// Get all requests
app.get('/api/requests', async (req, res) => {
  try {
    const queryStr = `
      SELECT r.*, u.name as creator_name 
      FROM requests r
      JOIN users u ON r.from_user_id = u.id
      ORDER BY r.created_at DESC
    `;
    const requests = await db.query(queryStr);
    
    // For each request, calculate attachment progress %
    for (let r of requests) {
      const docs = await db.query('SELECT id, status FROM request_documents WHERE request_id = ?', [r.id]);
      if (docs.length > 0) {
        const completed = docs.filter(d => ['Approved', 'Downloaded', 'No Required'].includes(d.status)).length;
        r.completion_percentage = Math.round((completed / docs.length) * 100);
      } else {
        r.completion_percentage = 0;
      }
      
      // Calculate overall delay status
      const delayDocs = await db.query(
        "SELECT COUNT(*) as count FROM request_documents WHERE request_id = ? AND status NOT IN ('Approved', 'Downloaded', 'No Required') AND due_date < CURDATE()",
        [r.id]
      );
      r.has_delay = delayDocs[0].count > 0 ? 'Delay' : 'On plan';
    }
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการใบแจ้งจัดทำได้', error: error.message });
  }
});

// Search existing Part No values for create-request autocomplete
app.get('/api/requests/part-no-suggestions', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);

  if (q.length < 2) {
    return res.json([]);
  }

  const escaped = q.replace(/[=%_]/g, '=$&');
  try {
    const suggestions = await db.query(
      `SELECT r.part_no, r.part_name, r.revision
       FROM requests r
       JOIN (
         SELECT part_no, MAX(id) as latest_id
         FROM requests
         WHERE is_cancelled = 0
           AND part_no LIKE ? ESCAPE '='
         GROUP BY part_no
       ) latest ON latest.latest_id = r.id
       ORDER BY
         CASE WHEN r.part_no LIKE ? ESCAPE '=' THEN 0 ELSE 1 END,
         r.part_no ASC
       LIMIT ?`,
      [`%${escaped}%`, `${escaped}%`, limit]
    );

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Unable to search Part No suggestions', error: error.message });
  }
});

// Get request detail (with raw materials, processes, revision history)
app.get('/api/requests/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const requests = await db.query('SELECT r.*, u.name as creator_name FROM requests r JOIN users u ON r.from_user_id = u.id WHERE r.id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ message: 'ไม่พบใบแจ้งจัดทำที่ต้องการ' });
    }
    const request = requests[0];
    
    // Fetch raw materials
    request.raw_materials = await db.query('SELECT * FROM raw_materials WHERE request_id = ? ORDER BY sub_item', [id]);
    
    // Fetch processes
    request.processes = await db.query('SELECT * FROM processes WHERE request_id = ? ORDER BY id', [id]);
    
    // Fetch documents
    request.documents = await db.query('SELECT * FROM request_documents WHERE request_id = ? ORDER BY id', [id]);
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียดใบแจ้งจัดทำ', error: error.message });
  }
});

// Create new Request
app.post('/api/requests', upload.fields([
  { name: 'drawing_2d', maxCount: 1 },
  { name: 'drawing_3d', maxCount: 1 },
  { name: 'standard_doc', maxCount: 1 },
  { name: 'other_doc', maxCount: 1 },
  { name: 'process_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const files = req.files;

    // Check drawings validation: Require at least 2D or 3D Drawing
    const has2D = files.drawing_2d ? true : false;
    const has3D = files.drawing_3d ? true : false;
    if (!has2D && !has3D) {
      return res.status(400).json({ message: 'กรุณาแนบแบบวาดชิ้นส่วน (2D Drawing หรือ 3D Drawing หรือทั้งสองอย่าง)' });
    }

    // Check ERP Die No validation
    if (data.erp_die_no && data.erp_die_no.trim() !== '') {
      if (!data.tooling_die_leadtime || !data.guarantee_tooling) {
        return res.status(400).json({ 
          message: 'เนื่องจากมีข้อมูล ERP Die No. กรุณากรอกข้อมูล Tooling and Die leadtime และ Guarantee tooling ให้ครบถ้วน' 
        });
      }
    }

    // Delivery date must equal APQP last OTS
    data.delivery_date = data.apqp_last_ots;

    // Determine Revision
    const existing = await db.query(
      'SELECT MAX(revision) as max_rev FROM requests WHERE part_no = ? AND is_cancelled = 0', 
      [data.part_no]
    );
    let revision = 0;
    if (existing[0] && existing[0].max_rev !== null) {
      revision = existing[0].max_rev + 1;
    }

    // Paths
    const drawing_2d_path = files.drawing_2d ? `/uploads/drawings/${files.drawing_2d[0].filename}` : null;
    const drawing_3d_path = files.drawing_3d ? `/uploads/drawings/${files.drawing_3d[0].filename}` : null;
    const standard_doc_path = files.standard_doc ? `/uploads/drawings/${files.standard_doc[0].filename}` : null;
    const other_doc_path = files.other_doc ? `/uploads/drawings/${files.other_doc[0].filename}` : null;

    // Insert Request
    const reqResult = await db.query(
      `INSERT INTO requests (
        request_no, revision, date, from_user_id, request_type, customer_name,
        part_name, part_no, model_code, rfq_volume, model_name, sample_part_qty,
        model_life, remark, sop_plan, tooling_die_leadtime, tooling_die_by,
        delivery_date, guarantee_tooling, drawing_2d_path, drawing_3d_path,
        standard_doc_path, other_doc_path, erp_fg_no, erp_die_no, apqp_last_ots,
        ots_approved, hatsu_line_in, mass_production, packaging, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Waiting MK Manager Approval')`,
      [
        data.request_no, revision, data.date, data.from_user_id, data.request_type, data.customer_name,
        data.part_name, data.part_no, data.model_code, data.rfq_volume, data.model_name, data.sample_part_qty,
        data.model_life, data.remark, data.sop_plan, data.tooling_die_leadtime || null, data.tooling_die_by || null,
        data.delivery_date, data.guarantee_tooling || null, drawing_2d_path, drawing_3d_path,
        standard_doc_path, other_doc_path, data.erp_fg_no, data.erp_die_no || null, data.apqp_last_ots,
        data.ots_approved, data.hatsu_line_in, data.mass_production, data.packaging
      ]
    );

    const requestId = reqResult.insertId;

    // Save Raw Materials
    if (data.raw_materials && Array.isArray(data.raw_materials)) {
      for (let rm of data.raw_materials) {
        await db.query(
          `INSERT INTO raw_materials (
            request_id, sub_item, part_no, part_name, qty_unit, in_house,
            outsource_supplier, outsource_moq, spec_t, spec_w, spec_l, qty_per_strip
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            requestId, rm.sub_item, rm.part_no, rm.part_name, rm.qty_unit, rm.in_house ? 1 : 0,
            rm.outsource_supplier || null, rm.outsource_moq || null, rm.spec_t, rm.spec_w, rm.spec_l, rm.qty_per_strip
          ]
        );
      }
    }

    // Save Process from Excel File
    if (files.process_file) {
      try {
        const excelPath = files.process_file[0].path;
        const workbook = xlsx.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const parsedRows = xlsx.utils.sheet_to_json(worksheet);

        // Expect structure with keys matching 'Process', 'M/C', 'Remark' case-insensitively
        for (let row of parsedRows) {
          const keys = Object.keys(row);
          const processKey = keys.find(k => k.toLowerCase() === 'process') || keys[0];
          const mcKey = keys.find(k => k.toLowerCase() === 'm/c' || k.toLowerCase() === 'mc') || keys[1];
          const remarkKey = keys.find(k => k.toLowerCase() === 'remark') || keys[2];

          const processName = row[processKey] ? String(row[processKey]).trim() : '';
          const mcVal = row[mcKey] ? String(row[mcKey]).trim() : '';
          const remarkVal = row[remarkKey] ? String(row[remarkKey]).trim() : '';

          if (processName) {
            await db.query(
              'INSERT INTO processes (request_id, process_no, process_name, mc, remark) VALUES (?, ?, ?, ?, ?)',
              [requestId, processName.split(' ')[0] || '1', processName, mcVal, remarkVal]
            );
          }
        }
      } catch (excelErr) {
        console.error('Error parsing Process Excel:', excelErr);
      }
    }

    // Send notification Email Group to MK for MK Manager approval
    const mkRecipient = await formatDepartmentRecipient('MK');
    await logNotification(
      requestId,
      'Email',
      mkRecipient,
      `[อนุมัติใบแจ้งจัดทำชิ้นส่วน] ใบจัดทำเลขที่ ${data.request_no} Rev.${revision} รอการอนุมัติ`,
      `เรียน ผู้จัดการแผนก MK,\n\nมีใบแจ้งจัดทำชิ้นส่วนใหม่ เลขที่ ${data.request_no} Part No. ${data.part_no} ได้รับการบันทึกเข้าระบบโดยคุณ ${data.creator_name || 'เจ้าหน้าที่ MK'} เรียบร้อยแล้ว กรุณาเข้าระบบเพื่อตรวจสอบและดำเนินการอนุมัติ\n\nลิงก์ระบบ: http://localhost:5173/requests/${requestId}`
    );

    res.status(201).json({ message: 'บันทึกใบแจ้งจัดทำชิ้นส่วนสำเร็จ', requestId });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกใบแจ้งจัดทำชิ้นส่วน', error: error.message });
  }
});

// Approve Request by MK Manager
app.put('/api/requests/:id/approve-mk', async (req, res) => {
  const { id } = req.params;
  try {
    const reqs = await db.query('SELECT * FROM requests WHERE id = ?', [id]);
    if (reqs.length === 0) {
      return res.status(404).json({ message: 'ไม่พบใบแจ้งจัดทำ' });
    }
    const r = reqs[0];

    // Update Request status to 'NP Setting Documents'
    await db.query("UPDATE requests SET status = 'NP Setting Documents' WHERE id = ?", [id]);

    // Send notifications to NP, ECN, FM, PU
    // CC to PD1-4, QA/QC, MKC, PL, WH
    const recipientTo = await formatDepartmentRecipients(['NP', 'ECN', 'FM', 'PU']);
    const recipientCc = await formatDepartmentRecipients(['PD1', 'PD2', 'PD3', 'PD4', 'QA_QC', 'MK', 'PL', 'WH']);

    const subject = `[อนุมัติจัดทำชิ้นส่วน] ใบจัดทำเลขที่ ${r.request_no} Rev.${r.revision} ได้รับการอนุมัติจากผู้จัดการ MK แล้ว`;
    const message = `เรียนผู้เกี่ยวข้อง,\n\nใบแจ้งจัดทำชิ้นส่วนเลขที่ ${r.request_no} (Part No. ${r.part_no}, Part Name: ${r.part_name}) ได้รับการอนุมัติโดยผู้จัดการ MK แล้วในระบบ\n\nขั้นตอนถัดไป: แผนก NP จะดำเนินการประชุมเพื่อระบุรายการเอกสารประกอบที่ต้องแนบ\n\nลิงก์เข้าดู: http://localhost:5173/requests/${id}`;

    await logNotification(id, 'Email', recipientTo, subject, message);
    await logNotification(id, 'Email', recipientCc, subject, `[CC] ${message}`);

    res.json({ message: 'อนุมัติใบแจ้งจัดทำและส่งแจ้งเตือนอีเมลกลุ่มเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติใบแจ้งจัดทำ', error: error.message });
  }
});

// Cancel Request
app.put('/api/requests/:id/cancel', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("UPDATE requests SET is_cancelled = 1, status = 'Cancelled' WHERE id = ?", [id]);
    res.json({ message: 'ยกเลิกใบแจ้งจัดทำชิ้นส่วนสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยกเลิกใบแจ้งจัดทำ', error: error.message });
  }
});

// Edit Request (PUT /api/requests/:id)
app.put('/api/requests/:id', upload.fields([
  { name: 'drawing_2d', maxCount: 1 },
  { name: 'drawing_3d', maxCount: 1 },
  { name: 'standard_doc', maxCount: 1 },
  { name: 'other_doc', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const files = req.files || {};
  try {
    const reqs = await db.query('SELECT * FROM requests WHERE id = ?', [id]);
    if (reqs.length === 0) return res.status(404).json({ message: 'ไม่พบใบแจ้งจัดทำ' });
    const existing = reqs[0];

    // Compute new file paths (keep old if no new file uploaded)
    const drawing_2d_path = files.drawing_2d
      ? `/uploads/drawings/${files.drawing_2d[0].filename}`
      : (existing.drawing_2d_path || null);
    const drawing_3d_path = files.drawing_3d
      ? `/uploads/drawings/${files.drawing_3d[0].filename}`
      : (existing.drawing_3d_path || null);
    const standard_doc_path = files.standard_doc
      ? `/uploads/drawings/${files.standard_doc[0].filename}`
      : (existing.standard_doc_path || null);
    const other_doc_path = files.other_doc
      ? `/uploads/drawings/${files.other_doc[0].filename}`
      : (existing.other_doc_path || null);

    // Delete old files if replaced
    const deleteOldFile = (oldPath, newUploaded) => {
      if (newUploaded && oldPath) {
        const full = path.join(__dirname, oldPath);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      }
    };
    deleteOldFile(existing.drawing_2d_path, files.drawing_2d);
    deleteOldFile(existing.drawing_3d_path, files.drawing_3d);
    deleteOldFile(existing.standard_doc_path, files.standard_doc);
    deleteOldFile(existing.other_doc_path, files.other_doc);

    // delivery_date always = apqp_last_ots
    const delivery_date = data.apqp_last_ots || existing.apqp_last_ots;

    await db.query(
      `UPDATE requests SET
        request_type = ?, customer_name = ?, part_name = ?, part_no = ?,
        model_code = ?, model_name = ?, rfq_volume = ?, sample_part_qty = ?,
        model_life = ?, remark = ?, sop_plan = ?,
        tooling_die_leadtime = ?, tooling_die_by = ?, guarantee_tooling = ?,
        erp_fg_no = ?, erp_die_no = ?,
        apqp_last_ots = ?, ots_approved = ?, hatsu_line_in = ?, mass_production = ?,
        delivery_date = ?, packaging = ?,
        drawing_2d_path = ?, drawing_3d_path = ?,
        standard_doc_path = ?, other_doc_path = ?
      WHERE id = ?`,
      [
        data.request_type || existing.request_type,
        data.customer_name || existing.customer_name,
        data.part_name || existing.part_name,
        data.part_no || existing.part_no,
        data.model_code || existing.model_code,
        data.model_name || existing.model_name,
        data.rfq_volume ?? existing.rfq_volume,
        data.sample_part_qty ?? existing.sample_part_qty,
        data.model_life ?? existing.model_life,
        data.remark ?? existing.remark,
        data.sop_plan || existing.sop_plan,
        data.tooling_die_leadtime || null,
        data.tooling_die_by || null,
        data.guarantee_tooling || null,
        data.erp_fg_no || existing.erp_fg_no,
        data.erp_die_no || null,
        data.apqp_last_ots || existing.apqp_last_ots,
        data.ots_approved || existing.ots_approved,
        data.hatsu_line_in || existing.hatsu_line_in,
        data.mass_production || existing.mass_production,
        delivery_date,
        data.packaging || existing.packaging,
        drawing_2d_path, drawing_3d_path, standard_doc_path, other_doc_path,
        id
      ]
    );

    await logNotification(
      id, 'Email', 'ระบบ',
      `[แก้ไขใบแจ้งจัดทำ] เลขที่ ${existing.request_no} ได้รับการแก้ไขข้อมูล`,
      `ใบแจ้งจัดทำชิ้นส่วนเลขที่ ${existing.request_no} (Part No. ${data.part_no || existing.part_no}) ได้รับการแก้ไขข้อมูลในระบบแล้ว`
    );

    res.json({ message: 'แก้ไขใบแจ้งจัดทำเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขใบแจ้งจัดทำ', error: error.message });
  }
});

// Get Revisions for Part No
app.get('/api/requests/part/:part_no/revisions', async (req, res) => {
  const { part_no } = req.params;
  try {
    const list = await db.query(
      `SELECT r.*, u.name as creator_name 
       FROM requests r 
       JOIN users u ON r.from_user_id = u.id 
       WHERE r.part_no = ? 
       ORDER BY r.revision DESC`,
      [part_no]
    );
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลประวัติ Revision ได้', error: error.message });
  }
});

// ----------------------------------------------------
// 4. NP DOCUMENT CONFIGURATION AND KICKOFF
// ----------------------------------------------------
app.put('/api/requests/:id/kickoff', async (req, res) => {
  const { id } = req.params;
  const { kick_off_date, selected_documents } = req.body; // selected_documents = [{ document_name, department, is_apqp, period, due_date }]
  try {
    const reqs = await db.query('SELECT * FROM requests WHERE id = ?', [id]);
    if (reqs.length === 0) {
      return res.status(404).json({ message: 'ไม่พบใบแจ้งจัดทำ' });
    }
    const r = reqs[0];

    // Calculate dates based on kick-off
    const kickOff = new Date(kick_off_date);
    const date2w = new Date(kickOff.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date4w = new Date(kickOff.getTime() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const date6w = new Date(kickOff.getTime() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Update Request with Kick-off date and periods
    await db.query(
      `UPDATE requests SET 
        kick_off_date = ?, 
        due_date_2w = ?, 
        due_date_4w = ?, 
        due_date_6w = ?, 
        status = 'In Progress' 
      WHERE id = ?`,
      [kick_off_date, date2w, date4w, date6w, id]
    );

    // Insert selected documents into request_documents
    for (let doc of selected_documents) {
      let finalDueDate = doc.due_date;
      
      // Auto fill periods if not customized
      if (!finalDueDate) {
        if (doc.period === '2 Weeks') finalDueDate = date2w;
        else if (doc.period === '4 Weeks') finalDueDate = date4w;
        else if (doc.period === '6 Weeks') finalDueDate = date6w;
        else if (doc.period === 'OTS / OPS Approved') finalDueDate = r.ots_approved;
        else if (doc.period === '1PP / Hatsu / Pre Mass Production') finalDueDate = r.hatsu_line_in;
        else finalDueDate = r.apqp_last_ots; // fallback
      }

      await db.query(
        `INSERT INTO request_documents (
          request_id, document_name, department, is_apqp, period, due_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'Waiting Upload')`,
        [id, doc.document_name, doc.department, doc.is_apqp ? 1 : 0, doc.period, finalDueDate]
      );
    }

    // Send notifications to NP department (Email and Telegram)
    const emailSubject = `[Kick-off] ใบแจ้งจัดทำเลขที่ ${r.request_no} เข้าสู่ขั้นตอนแนบเอกสาร`;
    const kickOffDateText = formatDateForDisplay(kick_off_date);
    const msg = `ใบแจ้งจัดทำเลขที่ ${r.request_no} (Part No. ${r.part_no}) ได้เริ่ม Kick-off ในวันที่ ${kickOffDateText} เรียบร้อยแล้ว แผนกที่เกี่ยวข้องกรุณาดำเนินการแนบไฟล์เอกสารภายในกำหนดส่ง\n\nรายละเอียดรายการเอกสารที่ถูกกำหนด: http://localhost:5173/requests/${id}`;
    
    const kickoffDepartments = selected_documents.map(doc => doc.department);
    const kickoffRecipients = await formatDepartmentRecipients(kickoffDepartments);
    await logNotification(id, 'Email', kickoffRecipients, emailSubject, msg);
    await logNotification(id, 'Telegram', 'New Part Channel (@cni_new_part_bot)', `📢 [Kick-off Request: ${r.request_no}]\nPart No: ${r.part_no}\nSOP: ${r.sop_plan}\nกำหนดส่งเริ่มนับจาก ${kickOffDateText}\nกรุณาแนบเอกสารในระบบ`, msg);

    res.json({ message: 'บันทึกการ Kick-off และการเลือกเอกสารแนบเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการ Kick-off', error: error.message });
  }
});

// ----------------------------------------------------
// 5. DOCUMENT ATTACHMENT AND APPROVAL FLOW
// ----------------------------------------------------

// Upload Document Attachment (by PD/Reporter)
app.post('/api/documents/:id/upload', upload.single('attachment'), async (req, res) => {
  const { id } = req.params;
  const { attached_by } = req.body;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
  }
  try {
    const docs = await db.query('SELECT * FROM request_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเอกสารที่ระบุ' });
    }
    const doc = docs[0];

    const filePath = `/uploads/documents/${file.filename}`;
    const fileName = file.originalname;

    // Check workflow
    let nextStatus = 'Waiting Checker'; // Default non-APQP flow: PD -> Checker -> Approved -> Incharge
    if (doc.is_apqp) {
      nextStatus = 'Waiting Incharge'; // APQP flow: PD -> Incharge -> NP Manager
    }

    // Update document attachment details
    await db.query(
      `UPDATE request_documents SET 
        file_path = ?, 
        file_name = ?, 
        attached_by = ?, 
        attached_at = CURRENT_TIMESTAMP, 
        status = ?
      WHERE id = ?`,
      [filePath, fileName, attached_by, nextStatus, id]
    );

    // If APQP doc, send email notify to Incharge
    if (doc.is_apqp) {
      const reqs = await db.query('SELECT * FROM requests WHERE id = ?', [doc.request_id]);
      if (reqs.length > 0) {
        const r = reqs[0];
        const inchargeRecipient = await formatDepartmentRecipient('TD');
        await logNotification(
          doc.request_id,
          'Email',
          inchargeRecipient,
          `[ตรวจรับเอกสาร APQP] เอกสาร ${doc.document_name} สำหรับใบแจ้งจัดทำ ${r.request_no} แนบเข้าระบบแล้ว`,
          `เรียน วิศวกรผู้รับผิดชอบ,\n\nเอกสารทีม APQP "${doc.document_name}" ของใบแจ้งจัดทำเลขที่ ${r.request_no} ได้รับการแนบเข้าระบบแล้ว รอการตรวจสอบความถูกต้องจากท่าน\n\nตรวจสอบที่นี่: http://localhost:5173/requests/${r.id}`
        );
      }
    }

    // Update delay days if uploaded late
    const today = new Date();
    const dueDate = new Date(doc.due_date);
    if (today > dueDate) {
      const diffTime = Math.abs(today - dueDate);
      const delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      await db.query('UPDATE request_documents SET delay_days = ? WHERE id = ?', [delayDays, id]);
    } else {
      await db.query('UPDATE request_documents SET delay_days = 0 WHERE id = ?', [id]);
    }

    res.json({ message: 'อัปโหลดเอกสารสำเร็จและเข้าสู่กระบวนการอนุมัติ', filePath });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปโหลดเอกสาร', error: error.message });
  }
});

// Checker Approval (Supervisor)
app.put('/api/documents/:id/checker-approve', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  try {
    await db.query(
      `UPDATE request_documents SET 
        status = 'Waiting Approved', 
        checker_approved_by = ?, 
        checker_approved_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [user_id, id]
    );
    res.json({ message: 'Checker ตรวจสอบผ่านแล้ว ส่งเรื่องต่อให้ Approved' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติขั้นตอน Checker', error: error.message });
  }
});

// Approved (Manager)
app.put('/api/documents/:id/manager-approve', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  try {
    await db.query(
      `UPDATE request_documents SET 
        status = 'Waiting Incharge', 
        approved_by = ?, 
        approved_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [user_id, id]
    );
    res.json({ message: 'Approved ตรวจสอบผ่านแล้ว ส่งเรื่องต่อให้ Incharge' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติขั้นตอน Approved', error: error.message });
  }
});

// Incharge Approval (Engineer)
app.put('/api/documents/:id/incharge-approve', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  try {
    const docs = await db.query('SELECT * FROM request_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเอกสาร' });
    }
    const doc = docs[0];

    let nextStatus = 'Approved';
    if (doc.is_apqp) {
      nextStatus = 'Waiting NP Manager'; // APQP flow ends with NP Manager
    }

    await db.query(
      `UPDATE request_documents SET 
        status = ?, 
        incharge_approved_by = ?, 
        incharge_approved_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [nextStatus, user_id, id]
    );

    // After approval, check if all documents are approved to change status to ISO DAR
    await checkAllDocsCompleted(doc.request_id);

    res.json({ message: doc.is_apqp ? 'Incharge ผ่านแล้ว ส่งต่อให้ NP Manager อนุมัติสุดท้าย' : 'Incharge อนุมัติเอกสารเสร็จสมบูรณ์' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติขั้นตอน Incharge', error: error.message });
  }
});

// NP Manager Approval (For APQP Docs)
app.put('/api/documents/:id/np-manager-approve', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  try {
    const docs = await db.query('SELECT * FROM request_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเอกสาร' });
    }
    const doc = docs[0];

    await db.query(
      `UPDATE request_documents SET 
        status = 'Approved', 
        np_manager_approved_by = ?, 
        np_manager_approved_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [user_id, id]
    );

    // Check if all documents are approved
    await checkAllDocsCompleted(doc.request_id);

    res.json({ message: 'NP Manager อนุมัติเอกสาร APQP เสร็จสมบูรณ์' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติของ NP Manager', error: error.message });
  }
});

// Reject Document: delete physical file, reset file_path, set status = 'Rejected'
app.put('/api/documents/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reject_reason } = req.body;
  try {
    const docs = await db.query('SELECT * FROM request_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ message: 'ไม่พบเอกสารที่ระบุ' });
    }
    const doc = docs[0];

    // Delete the file from directory
    if (doc.file_path) {
      const fullPath = path.join(__dirname, doc.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`🗑️ Deleted file on Reject: ${fullPath}`);
      }
    }

    // Reset document state
    await db.query(
      `UPDATE request_documents SET 
        file_path = NULL, 
        file_name = NULL, 
        status = 'Rejected', 
        reject_reason = ?, 
        attached_by = NULL, 
        attached_at = NULL,
        checker_approved_by = NULL,
        checker_approved_at = NULL,
        approved_by = NULL,
        approved_at = NULL,
        incharge_approved_by = NULL,
        incharge_approved_at = NULL,
        np_manager_approved_by = NULL,
        np_manager_approved_at = NULL
      WHERE id = ?`,
      [reject_reason || 'เอกสารไม่ถูกต้อง/ไม่สมบูรณ์', id]
    );

    // Send email notify to PD/Reporter that document was rejected
    const reqs = await db.query('SELECT * FROM requests WHERE id = ?', [doc.request_id]);
    if (reqs.length > 0) {
      const r = reqs[0];
      const rejectRecipient = await formatDepartmentRecipient(doc.department);
      await logNotification(
        doc.request_id,
        'Email',
        rejectRecipient,
        `❌ [ปฏิเสธเอกสารแนบ] เอกสาร ${doc.document_name} ถูกปฏิเสธการอนุมัติ`,
        `เอกสาร "${doc.document_name}" ของใบแจ้งจัดทำเลขที่ ${r.request_no} ถูกตีกลับ\nเหตุผลที่ปฏิเสธ: ${reject_reason || 'ไม่มีข้อมูลเพิ่ม'}\n\nกรุณาแก้ไขและอัปโหลดไฟล์ใหม่เข้าระบบ: http://localhost:5173/requests/${r.id}`
      );
    }

    res.json({ message: 'ปฏิเสธเอกสารแนบและลบไฟล์เดิมในระบบเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการ Reject เอกสาร', error: error.message });
  }
});

// Helper to check if all docs for a request are approved
async function checkAllDocsCompleted(requestId) {
  try {
    const docs = await db.query('SELECT status FROM request_documents WHERE request_id = ?', [requestId]);
    if (docs.length === 0) return;

    const allApproved = docs.every(d => ['Approved', 'No Required', 'Downloaded'].includes(d.status));
    if (allApproved) {
      // Update request status to 'Completed' and wait ISO DAR registration
      await db.query(
        "UPDATE requests SET status = 'Completed', iso_dar_status = 'Waiting ISO DAR Registration' WHERE id = ?",
        [requestId]
      );

      const reqs = await db.query('SELECT * FROM requests WHERE id = ?', [requestId]);
      if (reqs.length > 0) {
        const r = reqs[0];
        // Send email notify to NP Group
        const npRecipient = await formatDepartmentRecipient('NP');
        await logNotification(
          requestId,
          'Email',
          npRecipient,
          `🎉 [เอกสารครบถ้วน] ใบแจ้งจัดทำเลขที่ ${r.request_no} เอกสารแนบผ่านอนุมัติทั้งหมดแล้ว`,
          `เรียน แผนก New Part,\n\nเอกสารประกอบใบแจ้งจัดทำชิ้นส่วนเลขที่ ${r.request_no} (Part No. ${r.part_no}) ได้รับการอัปโหลดและอนุมัติผ่านครบถ้วนทุกรายการแล้วในระบบ\n\nสถานะปัจจุบัน: รอขึ้นทะเบียนระบบ ISO DAR\n\nลิงก์เข้าดู: http://localhost:5173/requests/${requestId}`
        );
      }
    }
  } catch (err) {
    console.error('Error checking all documents completion:', err);
  }
}

// ----------------------------------------------------
// 6. NOTIFICATIONS LOGS
// ----------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  try {
    const list = await db.query('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 100');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลประวัติการแจ้งเตือนได้', error: error.message });
  }
});

// ----------------------------------------------------
// 7. CRON SIMULATION (CRITICAL DEADLINES CHECKS)
// ----------------------------------------------------
app.get('/api/cron/check-deadlines', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Check for documents that have passed due_date and are still waiting for upload
    const overdueDocs = await db.query(
      `SELECT rd.*, r.request_no, r.part_no, r.id as req_id 
       FROM request_documents rd
       JOIN requests r ON rd.request_id = r.id
       WHERE rd.due_date < ? AND rd.status IN ('Waiting Upload', 'Waiting Reporter', 'Rejected')
       AND r.is_cancelled = 0`,
      [todayStr]
    );

    for (let doc of overdueDocs) {
      // Calculate delay days
      const diffTime = Math.abs(new Date() - new Date(doc.due_date));
      const delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      await db.query('UPDATE request_documents SET delay_days = ? WHERE id = ?', [delayDays, doc.id]);

      // Every 7 days, trigger email reminder
      if (delayDays % 7 === 0) {
        const overdueRecipient = await formatDepartmentRecipient(doc.department);
        await logNotification(
          doc.req_id,
          'Email',
          overdueRecipient,
          `🚨 [แจ้งเตือนเอกสารล่าช้า] เอกสาร ${doc.document_name} ล่าช้ากว่ากำหนดส่ง ${delayDays} วัน`,
          `เรียน แผนก ${doc.department},\n\nเอกสาร "${doc.document_name}" สำหรับใบแจ้งจัดทำชิ้นส่วน ${doc.request_no} ยังไม่ได้รับการอัปโหลดเข้าสู่ระบบ ซึ่งล่าช้ากว่าวันกำหนดส่ง (${formatDateForDisplay(doc.due_date)}) มาแล้วจำนวน ${delayDays} วัน\n\nกรุณาเข้าแนบเอกสารเร่งด่วน: http://localhost:5173/requests/${doc.req_id}`
        );
      }
    }

    // 2. Check for requests that are 1 month before APQP last OTS, and have pending documents
    // Trigger email notification to outstanding departments
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    const oneMonthStr = oneMonthFromNow.toISOString().split('T')[0];

    const criticalRequests = await db.query(
      `SELECT id, request_no, part_no, apqp_last_ots FROM requests 
       WHERE apqp_last_ots <= ? AND status NOT IN ('Completed', 'Cancelled') AND is_cancelled = 0`,
      [oneMonthStr]
    );

    for (let r of criticalRequests) {
      const pendingDocs = await db.query(
        `SELECT DISTINCT department FROM request_documents 
         WHERE request_id = ? AND status NOT IN ('Approved', 'Downloaded', 'No Required')`,
        [r.id]
      );

      if (pendingDocs.length > 0) {
        const departmentsList = pendingDocs.map(d => d.department).join(', ');
        const pendingRecipients = await formatDepartmentRecipients(pendingDocs.map(d => d.department));
        await logNotification(
          r.id,
          'Email',
          pendingRecipients,
          `⚠️ [แจ้งเตือนเร่งด่วน] เหลือเวลาอีก 1 เดือนก่อนกำหนด APQP last OTS ใบจัดทำ ${r.request_no}`,
          `เรียน หัวหน้าและทีมงานแผนก ${departmentsList},\n\nใบแจ้งจัดทำชิ้นส่วนเลขที่ ${r.request_no} (Part No. ${r.part_no}) มีกำหนดวัน APQP last OTS คือวันที่ ${formatDateForDisplay(r.apqp_last_ots)} (เหลือเวลาอีกประมาณ 1 เดือน)\n\nปัจจุบันพบว่าแผนกของท่านยังส่งเอกสารในระบบไม่ครบถ้วน กรุณาอัปโหลดเอกสารทั้งหมดให้เรียบร้อยโดยเร็วที่สุด\n\nตรวจสอบเอกสารที่ค้าง: http://localhost:5173/requests/${r.id}`
        );
      }
    }

    res.json({ message: 'ตรวจสอบวันครบกำหนดสำเร็จ', status: 'Checked' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบวันครบกำหนด', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
