import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, CheckCircle, AlertCircle, Clock, 
  User, LogOut, Download, Check, X, Eye, 
  Trash2, Send, List, Settings, RefreshCw, Calendar, FileDown, Layers,
  ShieldCheck, AlertTriangle, HelpCircle, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { generateRequestPDF } from './generateRequestPDF';

const API_BASE = 'http://localhost:5000/api';

function App() {
  // Authentication & Simulation States
  // Restore session from localStorage on initial load
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('np_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [simulatedRole, setSimulatedRole] = useState(() => {
    try { return localStorage.getItem('np_simulated_role') || null; } catch { return null; }
  });
  const [simulatedUser, setSimulatedUser] = useState(() => {
    try {
      const saved = localStorage.getItem('np_simulated_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [errorMsg, setErrorMsg] = useState('');

  // App Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, create-request, master-templates, notifications-log, manage-users, manage-departments, manage-customers
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // Data States
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Dynamic Master Data States
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form States - User CRUD
  const [userFormId, setUserFormId] = useState(null);
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormName, setUserFormName] = useState('');
  const [userFormRole, setUserFormRole] = useState('PD');
  const [userFormDept, setUserFormDept] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');

  // Form States - Department CRUD
  const [deptFormId, setDeptFormId] = useState(null);
  const [deptFormName, setDeptFormName] = useState('');
  const [deptFormEmailGroup, setDeptFormEmailGroup] = useState('');

  // Form States - Customer CRUD
  const [customerFormId, setCustomerFormId] = useState(null);
  const [customerFormName, setCustomerFormName] = useState('');
  const [customerFormNote, setCustomerFormNote] = useState('');

  // CRUD Modal visibility flags
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editRequestModal, setEditRequestModal] = useState(false);

  // Edit Request Form State
  const [editReqForm, setEditReqForm] = useState({});
  const [editFile2d, setEditFile2d] = useState(null);
  const [editFile3d, setEditFile3d] = useState(null);
  const [editFileStandard, setEditFileStandard] = useState(null);
  const [editFileOther, setEditFileOther] = useState(null);

  // Form States - Create Request
  const [reqNo, setReqNo] = useState('');
  const [reqType, setReqType] = useState('Sample Part 1');
  const [customerName, setCustomerName] = useState('SIAM KUBOTA CORPORATION CO., LTD. (SKC-A)');
  const [partName, setPartName] = useState('');
  const [partNo, setPartNo] = useState('');
  const [partNoSuggestions, setPartNoSuggestions] = useState([]);
  const [showPartNoSuggestions, setShowPartNoSuggestions] = useState(false);
  const [loadingPartNoSuggestions, setLoadingPartNoSuggestions] = useState(false);
  const [modelCode, setModelCode] = useState('');
  const [rfqVolume, setRfqVolume] = useState('');
  const [modelName, setModelName] = useState('');
  const [sampleQty, setSampleQty] = useState('');
  const [modelLife, setModelLife] = useState('');
  const [remark, setRemark] = useState('');
  const [sopPlan, setSOPPlan] = useState('');
  const [toolingLeadtime, setToolingLeadtime] = useState('');
  const [toolingBy, setToolingBy] = useState('C.N.I');
  const [guaranteeTooling, setGuaranteeTooling] = useState('');
  const [erpFgNo, setErpFgNo] = useState('');
  const [erpDieNo, setErpDieNo] = useState('');
  const [apqpLastOts, setApqpLastOts] = useState('');
  const [otsApproved, setOtsApproved] = useState('');
  const [hatsuLineIn, setHatsuLineIn] = useState('');
  const [massProd, setMassProd] = useState('');
  const [packaging, setPackaging] = useState('COMMON CURRENT MODEL');
  
  // File inputs state
  const [file2d, setFile2d] = useState(null);
  const [file3d, setFile3d] = useState(null);
  const [fileStandard, setFileStandard] = useState(null);
  const [fileOther, setFileOther] = useState(null);
  const [fileProcess, setFileProcess] = useState(null);

  // Dynamic Raw Materials Form State
  const [rawMaterials, setRawMaterials] = useState([
    { sub_item: 1, part_no: '', part_name: '', qty_unit: 1, in_house: false, outsource_supplier: '', outsource_moq: '', spec_t: 0, spec_w: 0, spec_l: 0, qty_per_strip: 1 }
  ]);

  // Form States - NP Kickoff
  const [kickoffDate, setKickoffDate] = useState(new Date().toISOString().split('T')[0]);
  const [npSelectedDocs, setNpSelectedDocs] = useState([]);

  // Form States - Document Upload Modal
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  // Reject Modal State
  const [rejectingDocId, setRejectingDocId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Master Template Form
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplateDepts, setSelectedTemplateDepts] = useState([]);
  const [newTemplateApqp, setNewTemplateApqp] = useState(false);

  // Glassmorphism Alert / Confirm Modal State
  const [modalAlert, setModalAlert] = useState(null);
  // modalAlert shape: { title, message, type ('info'|'success'|'warning'|'danger'|'confirm'), resolve }

  const showAlert = (title, message, type = 'info') =>
    new Promise((resolve) => setModalAlert({ title, message, type: type === 'confirm' ? 'info' : type, isConfirm: false, resolve }));

  const showConfirm = (title, message) =>
    new Promise((resolve) => setModalAlert({ title, message, type: 'confirm', isConfirm: true, resolve }));

  const handleModalClose = (result) => {
    if (modalAlert?.resolve) modalAlert.resolve(result);
    setModalAlert(null);
  };

  // Seed users list for simulated login
  const seedUsers = [
    { username: 'admin', name: 'Administrator System', role: 'Admin', department: 'Admin' },
    { username: 'mk_staff1', name: 'Yanika (MK Staff)', role: 'MK_Staff', department: 'MK' },
    { username: 'mk_manager', name: 'MK Manager', role: 'MK_Manager', department: 'MK' },
    { username: 'np_staff1', name: 'Charoenrat (NP Staff)', role: 'NP_Staff', department: 'NP' },
    { username: 'pd_staff1', name: 'Pornchai (PD1 Reporter)', role: 'PD', department: 'PD1' },
    { username: 'pd_staff2', name: 'Amnat (PD4 Reporter)', role: 'PD', department: 'PD4' },
    { username: 'checker1', name: 'Checker Team Leader A', role: 'Checker', department: 'PD1' },
    { username: 'checker2', name: 'Checker Team Leader B', role: 'Checker', department: 'PD4' },
    { username: 'approved1', name: 'Somponlert (PU Manager)', role: 'Approved', department: 'PU' },
    { username: 'approved2', name: 'Approved PD1 Manager', role: 'Approved', department: 'PD1' },
    { username: 'incharge1', name: 'Pipat (TD/Incharge Engineer)', role: 'Incharge', department: 'TD' },
    { username: 'np_manager', name: 'NP Manager', role: 'NP_Manager', department: 'NP' }
  ];

  // Fetch initial data (always fetch on mount so data is ready after session restore)
  useEffect(() => {
    fetchRequests();
    fetchTemplates();
    fetchNotifications();
    fetchDepartments();
    fetchUsers();
    fetchCustomers();
  }, []);

  // When currentUser is restored from localStorage (page refresh), re-fetch requests
  // to ensure the list is populated correctly
  useEffect(() => {
    if (currentUser) {
      fetchRequests();
      fetchNotifications();
    }
  }, [currentUser?.id]);

  // Sync simulated user when current user changes
  useEffect(() => {
    if (currentUser) {
      setSimulatedUser(currentUser);
      setSimulatedRole(currentUser.role);
    }
  }, [currentUser]);

  useEffect(() => {
    const query = partNo.trim();
    if (activeTab !== 'create-request' || query.length < 2) {
      setPartNoSuggestions([]);
      setLoadingPartNoSuggestions(false);
      return;
    }

    let cancelled = false;
    setLoadingPartNoSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/requests/part-no-suggestions?q=${encodeURIComponent(query)}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setPartNoSuggestions(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching Part No suggestions:', err);
          setPartNoSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPartNoSuggestions(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [partNo, activeTab]);

  // Fetch Requests
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/requests`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      if (res.ok) {
        const data = await res.json();
        setDocumentTemplates(data);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/departments`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (!customerName && data.length > 0) {
          setCustomerName(data[0].name);
        }
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  // Fetch Request Detail
  const fetchRequestDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedRequest(data);
        setSelectedRequestId(id);
        setActiveTab('request-detail');

        // Prepopulate kickoff document list with all active templates
        if (data.status === 'NP Setting Documents') {
          const defaultDocs = documentTemplates
            .filter(t => t.status === 'Active')
            .map(t => ({
              document_name: t.document_name,
              department: t.department,
              is_apqp: t.is_apqp,
              period: t.is_apqp ? '4 Weeks' : '2 Weeks', // default assignments
              due_date: '',
              selected: true
            }));
          setNpSelectedDocs(defaultDocs);
        }
      }
    } catch (err) {
      console.error('Error fetching request detail:', err);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (res.ok) {
        const user = await res.json();
        // Save session to localStorage for persistence across page refreshes
        localStorage.setItem('np_current_user', JSON.stringify(user));
        localStorage.setItem('np_simulated_user', JSON.stringify(user));
        localStorage.setItem('np_simulated_role', user.role);
        setCurrentUser(user);
        setSimulatedUser(user);
        setSimulatedRole(user.role);
        setActiveTab('dashboard');
        // Re-fetch data after login to ensure fresh data
        fetchRequests();
        fetchNotifications();
      } else {
        const data = await res.json();
        setErrorMsg(data.message || 'เข้าสู่ระบบล้มเหลว');
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านได้ กรุณาเปิด backend server');
    }
  };

  // Switch role simulator (only for admin)
  const handleRoleSimulation = (roleName) => {
    // First try to find a matching user from the real DB list (has proper id)
    const dbUser = usersList.find(u => u.role === roleName);
    const fallback = seedUsers.find(u => u.role === roleName);
    const matched = dbUser || fallback;
    if (matched) {
      setSimulatedUser(matched);
      setSimulatedRole(roleName);
    }
  };

  // Logout - clear session from localStorage and memory
  const handleLogout = () => {
    localStorage.removeItem('np_current_user');
    localStorage.removeItem('np_simulated_user');
    localStorage.removeItem('np_simulated_role');
    setCurrentUser(null);
    setSimulatedUser(null);
    setSimulatedRole(null);
    setActiveTab('dashboard');
  };

  // Dynamic Raw materials controls
  const handleAddRawMaterial = () => {
    setRawMaterials([
      ...rawMaterials,
      { 
        sub_item: rawMaterials.length + 1, 
        part_no: '', 
        part_name: '', 
        qty_unit: 1, 
        in_house: false, 
        outsource_supplier: '', 
        outsource_moq: '', 
        spec_t: 0, 
        spec_w: 0, 
        spec_l: 0, 
        qty_per_strip: 1 
      }
    ]);
  };

  const handleRemoveRawMaterial = (index) => {
    const updated = rawMaterials.filter((_, i) => i !== index).map((rm, idx) => ({
      ...rm,
      sub_item: idx + 1
    }));
    setRawMaterials(updated);
  };

  const handleRawMaterialChange = (index, field, value) => {
    const updated = [...rawMaterials];
    updated[index][field] = value;
    setRawMaterials(updated);
  };

  const handlePartNoChange = (value) => {
    setPartNo(value);
    setShowPartNoSuggestions(value.trim().length >= 2);
  };

  const handleSelectPartNoSuggestion = (suggestion) => {
    setPartNo(suggestion.part_no);
    setShowPartNoSuggestions(false);
  };

  // Submit Request creation (MK Staff)
  const handleCreateRequest = async (e) => {
    e.preventDefault();

    // Check drawing validation
    if (!file2d && !file3d) {
      await showAlert('ข้อมูลไม่ครบ', 'กรุณาแนบแบบวาดชิ้นส่วน (2D Drawing หรือ 3D Drawing หรือทั้งสองอย่าง) หากไม่แนบจะไม่สามารถยื่นเรื่องได้', 'warning');
      return;
    }

    // ERP Die No validation
    if (erpDieNo && erpDieNo.trim() !== '') {
      if (!toolingLeadtime || !guaranteeTooling) {
        await showAlert('ข้อมูลไม่ครบ', 'เนื่องจากกรอกข้อมูล ERP Die No. คุณจำเป็นต้องกรอกข้อมูล Tooling and Die leadtime และ Guarantee tooling', 'warning');
        return;
      }
    }

    // Delivery date must be identical to APQP last OTS
    const finalDeliveryDate = apqpLastOts;

    const dataPayload = {
      request_no: reqNo,
      date: new Date().toISOString().split('T')[0],
      from_user_id: simulatedUser?.id || 2, // fallback to yanika
      request_type: reqType,
      customer_name: customerName,
      part_name: partName,
      part_no: partNo,
      model_code: modelCode,
      rfq_volume: parseInt(rfqVolume) || 0,
      model_name: modelName,
      sample_part_qty: parseInt(sampleQty) || 0,
      model_life: parseInt(modelLife) || 0,
      remark: remark,
      sop_plan: sopPlan,
      tooling_die_leadtime: toolingLeadtime ? parseInt(toolingLeadtime) : null,
      tooling_die_by: toolingBy,
      delivery_date: finalDeliveryDate,
      guarantee_tooling: guaranteeTooling ? parseInt(guaranteeTooling) : null,
      erp_fg_no: erpFgNo,
      erp_die_no: erpDieNo || null,
      apqp_last_ots: apqpLastOts,
      ots_approved: otsApproved,
      hatsu_line_in: hatsuLineIn,
      mass_production: massProd,
      packaging: packaging,
      raw_materials: rawMaterials,
      creator_name: simulatedUser?.name || ''
    };

    const formData = new FormData();
    formData.append('data', JSON.stringify(dataPayload));
    if (file2d) formData.append('drawing_2d', file2d);
    if (file3d) formData.append('drawing_3d', file3d);
    if (fileStandard) formData.append('standard_doc', fileStandard);
    if (fileOther) formData.append('other_doc', fileOther);
    if (fileProcess) formData.append('process_file', fileProcess);

    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        body: formData
      });
      const resData = await res.json();
      if (res.ok) {
        await showAlert('บันทึกสำเร็จ', 'ยื่นใบแจ้งจัดทำชิ้นส่วนเข้าระบบเรียบร้อยแล้ว! ส่งเรื่องขออนุมัติจากผู้จัดการ MK', 'success');
        fetchRequests();
        fetchNotifications();
        setActiveTab('dashboard');
        
        // Reset form
        setReqNo('');
        setPartNo('');
        setPartName('');
        setModelCode('');
        setRfqVolume('');
        setModelName('');
        setSampleQty('');
        setModelLife('');
        setRemark('');
        setSOPPlan('');
        setToolingLeadtime('');
        setGuaranteeTooling('');
        setErpFgNo('');
        setErpDieNo('');
        setApqpLastOts('');
        setOtsApproved('');
        setHatsuLineIn('');
        setMassProd('');
        setFile2d(null);
        setFile3d(null);
        setFileProcess(null);
        setRawMaterials([{ sub_item: 1, part_no: '', part_name: '', qty_unit: 1, in_house: false, outsource_supplier: '', outsource_moq: '', spec_t: 0, spec_w: 0, spec_l: 0, qty_per_strip: 1 }]);
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) {
      await showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อบันทึกข้อมูล', 'danger');
    }
  };

  // Approve MK (MK Manager / Admin)
  const handleApproveMK = async (reqId) => {
    const ok = await showConfirm('ยืนยันอนุมัติ', 'ยืนยันอนุมัติใบแจ้งจัดทำชิ้นส่วนฉบับนี้เพื่อส่งต่อแผนกที่เกี่ยวข้อง?');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/requests/${reqId}/approve-mk`, {
        method: 'PUT'
      });
      if (res.ok) {
        await showAlert('อนุมัติสำเร็จ', 'อนุมัติเรียบร้อย! ส่งการแจ้งเตือนทาง Email Group ไปยังแผนก NP, ECN, FM, PU', 'success');
        fetchRequests();
        fetchNotifications();
        fetchRequestDetail(reqId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel Request (MK Staff / Admin / NP / Incharge)
  const handleCancelRequest = async (reqId) => {
    const ok = await showConfirm('ยืนยันการยกเลิก', 'ต้องการยกเลิกใบแจ้งจัดทำฉบับนี้หรือไม่?\nข้อมูลจะถูกเก็บประวัติไว้ในระบบ แต่มีสถานะยกเลิก');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/requests/${reqId}/cancel`, { method: 'PUT' });
      if (res.ok) {
        await showAlert('ยกเลิกสำเร็จ', 'ยกเลิกใบแจ้งจัดทำชิ้นส่วนสำเร็จ', 'success');
        fetchRequests();
        if (selectedRequestId === reqId) fetchRequestDetail(reqId);
      }
    } catch (err) { console.error(err); }
  };

  // Edit Request
  const handleOpenEditRequest = () => {
    if (!selectedRequest) return;
    const r = selectedRequest;
    setEditReqForm({
      request_type: r.request_type || '',
      customer_name: r.customer_name || '',
      part_name: r.part_name || '',
      part_no: r.part_no || '',
      model_code: r.model_code || '',
      model_name: r.model_name || '',
      rfq_volume: r.rfq_volume ?? '',
      sample_part_qty: r.sample_part_qty ?? '',
      model_life: r.model_life ?? '',
      remark: r.remark || '',
      sop_plan: r.sop_plan || '',
      tooling_die_leadtime: r.tooling_die_leadtime || '',
      tooling_die_by: r.tooling_die_by || 'C.N.I',
      guarantee_tooling: r.guarantee_tooling || '',
      erp_fg_no: r.erp_fg_no || '',
      erp_die_no: r.erp_die_no || '',
      apqp_last_ots: r.apqp_last_ots ? String(r.apqp_last_ots).split('T')[0] : '',
      ots_approved: r.ots_approved ? String(r.ots_approved).split('T')[0] : '',
      hatsu_line_in: r.hatsu_line_in ? String(r.hatsu_line_in).split('T')[0] : '',
      mass_production: r.mass_production ? String(r.mass_production).split('T')[0] : '',
      packaging: r.packaging || 'COMMON CURRENT MODEL',
    });
    setEditFile2d(null); setEditFile3d(null); setEditFileStandard(null); setEditFileOther(null);
    setEditRequestModal(true);
  };

  const handleSaveRequestEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(editReqForm).forEach(([k, v]) => formData.append(k, v ?? ''));
    if (editFile2d) formData.append('drawing_2d', editFile2d);
    if (editFile3d) formData.append('drawing_3d', editFile3d);
    if (editFileStandard) formData.append('standard_doc', editFileStandard);
    if (editFileOther) formData.append('other_doc', editFileOther);
    try {
      const res = await fetch(`${API_BASE}/requests/${selectedRequest.id}`, {
        method: 'PUT', body: formData
      });
      const resData = await res.json();
      if (res.ok) {
        await showAlert('บันทึกสำเร็จ', 'แก้ไขใบแจ้งจัดทำเรียบร้อยแล้ว', 'success');
        setEditRequestModal(false);
        fetchRequestDetail(selectedRequest.id);
        fetchRequests();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) {
      console.error(err);
      await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'danger');
    }
  };

  // Kickoff Document setup (NP Staff / Admin)
  const handleKickoffSubmit = async (e) => {
    e.preventDefault();
    const checkedDocs = npSelectedDocs.filter(d => d.selected);
    if (checkedDocs.length === 0) {
      await showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกเอกสารที่ต้องการให้แผนกต่างๆ แนบอย่างน้อย 1 รายการ', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/requests/${selectedRequest.id}/kickoff`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kick_off_date: kickoffDate,
          selected_documents: checkedDocs
        })
      });
      if (res.ok) {
        await showAlert('Kick-off สำเร็จ', 'เริ่มต้น Kick-off สำเร็จ! แจ้งเตือนไปยังแผนกผู้รับผิดชอบทาง Email และ Telegram', 'success');
        fetchRequests();
        fetchNotifications();
        fetchRequestDetail(selectedRequest.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Change individual doc properties during NP kickoff config
  const handleNpDocChange = (index, field, value) => {
    const updated = [...npSelectedDocs];
    updated[index][field] = value;
    setNpSelectedDocs(updated);
  };

  // Document Upload (PD Reporter / Admin)
  const handleUploadClick = (docId) => {
    setUploadingDocId(docId);
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      await showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกไฟล์เอกสารที่ต้องการแนบ', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('attachment', uploadFile);
    formData.append('attached_by', simulatedUser?.id || 1);

    try {
      const res = await fetch(`${API_BASE}/documents/${uploadingDocId}/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await showAlert('อัปโหลดสำเร็จ', 'อัปโหลดไฟล์แนบและส่งเสนออนุมัติตามขั้นตอนสำเร็จ', 'success');
        setUploadingDocId(null);
        setUploadFile(null);
        fetchRequestDetail(selectedRequest.id);
        fetchNotifications();
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approve actions (Checker, Approved, Incharge, NP Manager)
  const handleDocApprove = async (docId, approvalType) => {
    const confirmed = await showConfirm('ยืนยันการอนุมัติ', 'ต้องการอนุมัติเอกสารแนบฉบับนี้หรือไม่?');
    if (!confirmed) return;
    try {
      const userId = simulatedUser?.id ?? null;
      const endpoint = `${API_BASE}/documents/${docId}/${approvalType}-approve`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (res.ok) {
        await showAlert('บันทึกสำเร็จ', 'บันทึกผลการอนุมัติในระบบเรียบร้อยแล้ว', 'success');
        fetchRequestDetail(selectedRequest.id);
        fetchRequests();
        fetchNotifications();
      } else {
        const errData = await res.json().catch(() => ({}));
        await showAlert('เกิดข้อผิดพลาด', errData.message || `ไม่สามารถบันทึกการอนุมัติได้ (HTTP ${res.status})`, 'danger');
      }
    } catch (err) {
      console.error(err);
      await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'danger');
    }
  };

  // Reject Actions (Deletes file, resets, Reject status)
  const handleDocRejectClick = (docId) => {
    setRejectingDocId(docId);
    setRejectReason('');
  };

  const handleDocRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      await showAlert('กรุณาระบุเหตุผล', 'กรุณาระบุเหตุผลการตีกลับเอกสาร', 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/documents/${rejectingDocId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reject_reason: rejectReason })
      });
      if (res.ok) {
        await showAlert('ตีกลับสำเร็จ', 'ตีกลับเอกสารแนบเรียบร้อยแล้ว ลบไฟล์แนบเก่าออกจากระบบและแจ้งเตือนผู้ใช้งาน', 'success');
        setRejectingDocId(null);
        fetchRequestDetail(selectedRequest.id);
        fetchRequests();
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Master Template management (NP / Admin)
  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    try {
      const deptString = selectedTemplateDepts.join(', ');
      const res = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_name: newTemplateName,
          department: deptString,
          is_apqp: newTemplateApqp
        })
      });
      if (res.ok) {
        await showAlert('เพิ่มสำเร็จ', 'เพิ่มเอกสารหลักเรียบร้อยแล้ว', 'success');
        setNewTemplateName('');
        setSelectedTemplateDepts([]);
        setNewTemplateApqp(false);
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleDeptCheckbox = (deptName) => {
    setSelectedTemplateDepts(prev =>
      prev.includes(deptName) ? prev.filter(d => d !== deptName) : [...prev, deptName]
    );
  };

  const handleToggleTemplateStatus = async (template) => {
    const newStatus = template.status === 'Active' ? 'Disabled' : 'Active';
    const action = newStatus === 'Disabled' ? 'ปิดการใช้งาน' : 'เปิดใช้งาน';
    const confirmed = await showConfirm(`ยืนยัน${action}`, `ต้องการ${action}เอกสาร "${template.document_name}" หรือไม่?`);
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE}/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_name: template.document_name,
          department: template.department,
          is_apqp: template.is_apqp,
          status: newStatus
        })
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetUserForm = () => {
    setUserFormId(null); setUserFormUsername(''); setUserFormPassword('');
    setUserFormName(''); setUserFormRole('PD'); setUserFormDept(''); setUserFormEmail('');
  };

  // Handle Save User
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userFormUsername || !userFormName || !userFormDept || !userFormRole) {
      await showAlert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warning');
      return;
    }
    const payload = {
      username: userFormUsername, password: userFormPassword,
      name: userFormName, role: userFormRole,
      department: userFormDept, email: userFormEmail
    };
    try {
      let res;
      if (userFormId) {
        res = await fetch(`${API_BASE}/users/${userFormId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        if (!userFormPassword) {
          await showAlert('ข้อมูลไม่ครบ', 'กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่', 'warning');
          return;
        }
        res = await fetch(`${API_BASE}/users`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const resData = await res.json();
      if (res.ok) {
        await showAlert('บันทึกสำเร็จ', userFormId ? 'แก้ไขข้อมูลผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้ใหม่สำเร็จ', 'success');
        resetUserForm();
        setShowUserModal(false);
        fetchUsers();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) {
      console.error(err);
      await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'danger');
    }
  };

  // Handle Edit User Click → open modal
  const handleEditUserClick = (u) => {
    setUserFormId(u.id); setUserFormUsername(u.username); setUserFormPassword('');
    setUserFormName(u.name); setUserFormRole(u.role);
    setUserFormDept(u.department); setUserFormEmail(u.email || '');
    setShowUserModal(true);
  };

  // Handle Delete User
  const handleDeleteUser = async (userId) => {
    const ok = await showConfirm('ยืนยันการลบ', 'ต้องการลบผู้ใช้งานรายนี้ใช่หรือไม่?');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok) {
        await showAlert('ลบสำเร็จ', 'ลบผู้ใช้งานเรียบร้อยแล้ว', 'success');
        fetchUsers();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) { console.error(err); }
  };

  const resetDeptForm = () => { setDeptFormId(null); setDeptFormName(''); setDeptFormEmailGroup(''); };

  // Handle Save Department
  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptFormName.trim()) return;
    try {
      let res;
      if (deptFormId) {
        res = await fetch(`${API_BASE}/departments/${deptFormId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: deptFormName, email_group: deptFormEmailGroup })
        });
      } else {
        res = await fetch(`${API_BASE}/departments`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: deptFormName, email_group: deptFormEmailGroup })
        });
      }
      const resData = await res.json();
      if (res.ok) {
        await showAlert('บันทึกสำเร็จ', deptFormId ? 'แก้ไขแผนกสำเร็จ' : 'เพิ่มแผนกสำเร็จ', 'success');
        resetDeptForm();
        setShowDeptModal(false);
        fetchDepartments();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) {
      console.error(err);
      await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'danger');
    }
  };

  // Handle Delete Department
  const handleDeleteDept = async (deptId) => {
    const ok = await showConfirm('ยืนยันการลบ', 'ต้องการลบแผนกนี้ใช่หรือไม่?');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/departments/${deptId}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok) {
        await showAlert('ลบสำเร็จ', 'ลบแผนกสำเร็จ', 'success');
        fetchDepartments();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) { console.error(err); }
  };

  const resetCustomerForm = () => { setCustomerFormId(null); setCustomerFormName(''); setCustomerFormNote(''); };

  // Handle Save Customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerFormName.trim()) return;
    const payload = { name: customerFormName, note: customerFormNote };
    try {
      let res;
      if (customerFormId) {
        res = await fetch(`${API_BASE}/customers/${customerFormId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/customers`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const resData = await res.json();
      if (res.ok) {
        await showAlert('บันทึกสำเร็จ', customerFormId ? 'แก้ไขข้อมูลลูกค้าสำเร็จ' : 'เพิ่มลูกค้าสำเร็จ', 'success');
        resetCustomerForm();
        setShowCustomerModal(false);
        fetchCustomers();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) {
      console.error(err);
      await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'danger');
    }
  };

  const handleEditCustomerClick = (customer) => {
    setCustomerFormId(customer.id); setCustomerFormName(customer.name);
    setCustomerFormNote(customer.note || '');
    setShowCustomerModal(true);
  };

  const handleDeleteCustomer = async (customerId) => {
    const ok = await showConfirm('ยืนยันการลบ', 'ต้องการลบลูกค้ารายนี้ใช่หรือไม่?');
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok) {
        await showAlert('ลบสำเร็จ', 'ลบลูกค้าสำเร็จ', 'success');
        fetchCustomers();
      } else {
        await showAlert('เกิดข้อผิดพลาด', resData.message, 'danger');
      }
    } catch (err) { console.error(err); }
  };

  // Run Simulated Deadline Cron check
  const handleTriggerCron = async () => {
    try {
      const res = await fetch(`${API_BASE}/cron/check-deadlines`);
      if (res.ok) {
        const data = await res.json();
        await showAlert('ตรวจสอบสำเร็จ', `ตรวจสอบวันส่งเรียบร้อย! ${data.message}`, 'success');
        fetchNotifications();
        fetchRequests();
        if (selectedRequest) {
          fetchRequestDetail(selectedRequest.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Request Checklist to Excel file using SheetJS
  const handleExportChecklistExcel = async (req) => {
    if (!req.documents || req.documents.length === 0) {
      await showAlert('ข้อมูลไม่ครบ', 'ใบแจ้งนี้ยังไม่มีการกำหนดรายการเอกสารแนบ (ต้องรอ Kick-off ก่อน)', 'warning');
      return;
    }

    const data = req.documents.map((d, index) => ({
      'No.': index + 1,
      'Document Name': d.document_name,
      'Responsible Department': d.department,
      'APQP Target?': d.is_apqp ? 'Yes' : 'No',
      'Submission Period': d.period,
      'Due Date': fmtDate(d.due_date),
      'Attachment Status': d.status,
      'Delay Days': d.delay_days || 0,
      'Uploaded File': d.file_name || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Document Summary');
    
    // Set headers design
    XLSX.writeFile(workbook, `Document_Checklist_${req.request_no}_Rev${req.revision}.xlsx`);
  };

  const fmtDate = (val) => {
    if (!val) return '-';
    try {
      if (typeof val === 'string') {
        const dateOnly = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dateOnly) {
          return `${dateOnly[3]}-${dateOnly[2]}-${dateOnly[1]}`;
        }
      }
      const d = new Date(val);
      if (isNaN(d)) return val;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return val;
    }
  };

  const handlePrintRequest = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${requestId}`);
      if (!res.ok) {
        await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลรายละเอียดเพื่อพิมพ์เอกสารได้', 'danger');
        return;
      }
      const req = await res.json();
      
      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (!printWindow) {
        await showAlert('คำเตือน', 'กรุณาอนุญาตให้เปิดป็อปอัป (Popup) เพื่อพิมพ์เอกสาร', 'warning');
        return;
      }
      
      let html = `
        <html>
        <head>
          <title>ใบแจ้งจัดทำชิ้นส่วน ${req.request_no} Rev.${req.revision}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
            body {
              font-family: 'Sarabun', sans-serif;
              margin: 15mm 10mm;
              color: #000;
              font-size: 13px;
              line-height: 1.4;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .header-table td {
              border: 1px solid #000;
              padding: 10px;
              vertical-align: middle;
            }
            .logo-cell {
              width: 15%;
              text-align: center;
              font-weight: bold;
              font-size: 20px;
            }
            .title-cell {
              width: 60%;
              text-align: center;
            }
            .title-cell h1 {
              font-size: 16px;
              margin: 0 0 5px 0;
              font-weight: bold;
            }
            .title-cell p {
              margin: 0;
              font-size: 12px;
            }
            .no-cell {
              width: 25%;
              font-size: 11px;
            }
            
            .section-title {
              font-weight: bold;
              background-color: #f2f2f2;
              border: 1px solid #000;
              padding: 5px 10px;
              margin-top: 15px;
              margin-bottom: 5px;
              font-size: 13px;
            }

            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .info-table td {
              border: 1px solid #000;
              padding: 6px 8px;
              width: 25%;
              vertical-align: top;
            }
            .info-table td.label {
              background-color: #fafafa;
              font-weight: bold;
              width: 20%;
            }
            .info-table td.value {
              width: 30%;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .data-table th, .data-table td {
              border: 1px solid #000;
              padding: 6px;
              font-size: 12px;
              text-align: center;
            }
            .data-table th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .data-table td.left {
              text-align: left;
            }
            
            .remark-box {
              border: 1px solid #000;
              padding: 10px;
              min-height: 60px;
              margin-bottom: 15px;
              white-space: pre-wrap;
            }
            
            .signature-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            .signature-table td {
              border: 1px solid #000;
              width: 33.33%;
              height: 80px;
              text-align: center;
              vertical-align: bottom;
              padding-bottom: 10px;
              font-size: 12px;
            }
            .signature-title {
              font-weight: bold;
              vertical-align: top !important;
              padding: 5px !important;
              height: auto !important;
              background-color: #fafafa;
            }
            
            @media print {
              body {
                margin: 5mm;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-cell">CNI</td>
              <td class="title-cell">
                <h1>REQUEST FOR PARTS MAKING</h1>
                <p>ใบแจ้งจัดทำชิ้นส่วน</p>
              </td>
              <td class="no-cell">
                <strong>Doc No:</strong> ${req.request_no}<br/>
                <strong>Revision:</strong> ${req.revision}<br/>
                <strong>Date:</strong> ${fmtDate(req.date)}
              </td>
            </tr>
          </table>

          <div class="section-title">1. GENERAL INFORMATION (ข้อมูลทั่วไป)</div>
          <table class="info-table">
            <tr>
              <td class="label">Customer Name</td>
              <td class="value">${req.customer_name || '-'}</td>
              <td class="label">Request Type</td>
              <td class="value">${req.request_type || '-'}</td>
            </tr>
            <tr>
              <td class="label">Part Name</td>
              <td class="value">${req.part_name || '-'}</td>
              <td class="label">Part No.</td>
              <td class="value">${req.part_no || '-'}</td>
            </tr>
            <tr>
              <td class="label">Model Code</td>
              <td class="value">${req.model_code || '-'}</td>
              <td class="label">Model Name</td>
              <td class="value">${req.model_name || '-'}</td>
            </tr>
            <tr>
              <td class="label">RFQ Volume/Year</td>
              <td class="value">${req.rfq_volume ? Number(req.rfq_volume).toLocaleString() + ' pcs' : '-'}</td>
              <td class="label">Sample Q'ty</td>
              <td class="value">${req.sample_part_qty ? Number(req.sample_part_qty).toLocaleString() + ' pcs' : '-'}</td>
            </tr>
            <tr>
              <td class="label">Model Life</td>
              <td class="value">${req.model_life ? req.model_life + ' years' : '-'}</td>
              <td class="label">SOP Plan</td>
              <td class="value">${req.sop_plan || '-'}</td>
            </tr>
            <tr>
              <td class="label">ERP FG No.</td>
              <td class="value">${req.erp_fg_no || '-'}</td>
              <td class="label">ERP Die No.</td>
              <td class="value">${req.erp_die_no || '-'}</td>
            </tr>
            <tr>
              <td class="label">Tooling Leadtime</td>
              <td class="value">${req.tooling_die_leadtime ? req.tooling_die_leadtime + ' days' : '-'}</td>
              <td class="label">Guarantee Tooling</td>
              <td class="value">${req.guarantee_tooling ? Number(req.guarantee_tooling).toLocaleString() + ' strokes' : '-'}</td>
            </tr>
            <tr>
              <td class="label">Packaging</td>
              <td class="value" colspan="3">${req.packaging || '-'}</td>
            </tr>
          </table>

          <div class="section-title">Changing Point / Remark (ข้อมูลปรับเปลี่ยนจากลูกค้า / หมายเหตุ)</div>
          <div class="remark-box">${req.remark || '-'}</div>

          <div class="section-title">2. KEY DATES & MILESTONES (วันสำคัญตามแผน)</div>
          <table class="info-table">
            <tr>
              <td class="label">APQP Last OTS</td>
              <td class="value">${fmtDate(req.apqp_last_ots)}</td>
              <td class="label">OTS Approved</td>
              <td class="value">${fmtDate(req.ots_approved)}</td>
            </tr>
            <tr>
              <td class="label">Hatsu / Line-in</td>
              <td class="value">${fmtDate(req.hatsu_line_in)}</td>
              <td class="label">Mass Production</td>
              <td class="value">${fmtDate(req.mass_production)}</td>
            </tr>
            <tr>
              <td class="label">Delivery Date</td>
              <td class="value">${fmtDate(req.delivery_date)}</td>
              <td class="label">Created By</td>
              <td class="value">${req.creator_name || '-'}</td>
            </tr>
          </table>

          <div class="section-title">3. RAW MATERIALS (วัตถุดิบ)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Sub</th>
                <th>Part No.</th>
                <th>Part Name</th>
                <th>Q'ty/Unit</th>
                <th>Source</th>
                <th>Supplier</th>
                <th>MOQ</th>
                <th>T</th>
                <th>W</th>
                <th>L</th>
                <th>Q/Strip</th>
              </tr>
            </thead>
            <tbody>
              ${req.raw_materials && req.raw_materials.length > 0 ? 
                req.raw_materials.map(rm => `
                  <tr>
                    <td>${rm.sub_item}</td>
                    <td class="left">${rm.part_no || '-'}</td>
                    <td class="left">${rm.part_name || '-'}</td>
                    <td>${rm.qty_unit || 0}</td>
                    <td>${rm.in_house ? 'In-House' : 'Outsource'}</td>
                    <td class="left">${rm.outsource_supplier || '-'}</td>
                    <td>${rm.outsource_moq || '-'}</td>
                    <td>${rm.spec_t || 0}</td>
                    <td>${rm.spec_w || 0}</td>
                    <td>${rm.spec_l || 0}</td>
                    <td>${rm.qty_per_strip || 0}</td>
                  </tr>
                `).join('') : `<tr><td colspan="11">- ไม่มีข้อมูลวัตถุดิบ -</td></tr>`
              }
            </tbody>
          </table>

          <div class="section-title">4. PROCESS / M/C (กระบวนการผลิต)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 15%">Process No.</th>
                <th style="width: 45%">Process Name / Operation</th>
                <th style="width: 20%">Machine (M/C)</th>
                <th style="width: 20%">Remark</th>
              </tr>
            </thead>
            <tbody>
              ${req.processes && req.processes.length > 0 ? 
                req.processes.map(p => `
                  <tr>
                    <td>${p.process_no || '-'}</td>
                    <td class="left">${p.process_name || '-'}</td>
                    <td>${p.mc || '-'}</td>
                    <td class="left">${p.remark || '-'}</td>
                  </tr>
                `).join('') : `<tr><td colspan="4">- ไม่มีข้อมูลกระบวนการผลิต -</td></tr>`
              }
            </tbody>
          </table>

          <div class="section-title">5. APPROVALS & SIGNATURES (ลายมือชื่ออนุมัติ)</div>
          <table class="signature-table">
            <tr>
              <td class="signature-title">ผู้แจ้งจัดทำ (MK Staff)</td>
              <td class="signature-title">อนุมัติโดย MK Manager</td>
              <td class="signature-title">รับทราบโดย NP Staff</td>
            </tr>
            <tr>
              <td>
                <br/><br/>
                ___________________________<br/>
                วันที่ / Date: ______________
              </td>
              <td>
                <br/><br/>
                ___________________________<br/>
                วันที่ / Date: ______________
              </td>
              <td>
                <br/><br/>
                ___________________________<br/>
                วันที่ / Date: ______________
              </td>
            </tr>
          </table>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      await showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเปิดหน้าต่างพิมพ์', 'danger');
    }
  };

  const handleExportPDFById = async (requestId) => {
    try {
      const res = await fetch(`${API_BASE}/requests/${requestId}`);
      if (!res.ok) {
        await showAlert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลรายละเอียดเพื่อออก PDF ได้', 'danger');
        return;
      }
      const req = await res.json();
      await generateRequestPDF(req);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      await showAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการดาวน์โหลด PDF', 'danger');
    }
  };

  // Checking permissions helper
  const canCreateRequest = () => {
    return ['Admin', 'MK_Staff'].includes(simulatedRole);
  };

  const canApproveMK = () => {
    return ['Admin', 'MK_Manager'].includes(simulatedRole);
  };

  const canSetupNP = () => {
    return ['Admin', 'NP_Staff', 'NP_Manager'].includes(simulatedRole) || simulatedUser?.department === 'NP';
  };

  // Parse comma-separated department string into an array of dept names
  const parseDepts = (deptStr) =>
    String(deptStr || '').split(',').map(d => d.trim()).filter(Boolean);

  // NP, IT, Admin users can upload/check/approve for all templates
  const isSuperDept = () =>
    ['Admin', 'NP_Staff', 'NP_Manager'].includes(simulatedRole) ||
    ['NP', 'IT', 'Admin'].includes(simulatedUser?.department);

  const canUploadDoc = (docDept) => {
    if (isSuperDept()) return true;
    const depts = parseDepts(docDept);
    return depts.includes(simulatedUser?.department);
  };

  const canCheckDoc = (docDept) => {
    if (simulatedRole === 'Admin') return true;
    if (isSuperDept()) return true;
    const depts = parseDepts(docDept);
    return simulatedRole === 'Checker' && depts.includes(simulatedUser?.department);
  };

  const canApproveDoc = (docDept) => {
    if (simulatedRole === 'Admin') return true;
    const depts = parseDepts(docDept);
    return simulatedRole === 'Approved' && depts.includes(simulatedUser?.department);
  };

  const canInchargeApprove = () => {
    return ['Admin', 'Incharge'].includes(simulatedRole);
  };

  const canNPManagerApprove = () => {
    return ['Admin', 'NP_Manager'].includes(simulatedRole);
  };

  // Super-editors: Admin + NP + Incharge (can edit until NP kickoff)
  const SUPER_EDITOR_ROLES = ['Admin', 'Incharge', 'NP_Staff', 'NP_Manager'];

  const canEditRequestInfo = (req) => {
    if (!req || req.is_cancelled) return false;
    if (SUPER_EDITOR_ROLES.includes(simulatedRole))
      return !['In Progress', 'Completed', 'Cancelled'].includes(req.status);
    if (['MK_Manager', 'MK_Staff'].includes(simulatedRole))
      return req.status === 'Waiting MK Manager Approval';
    return false;
  };

  const canEditRequestFiles = (req) => {
    if (!req || req.is_cancelled || req.status === 'Completed') return false;
    return [...SUPER_EDITOR_ROLES, 'MK_Staff', 'MK_Manager'].includes(simulatedRole);
  };

  const canCancelReq = (req) => {
    if (!req || req.is_cancelled || req.status === 'Completed') return false;
    return [...SUPER_EDITOR_ROLES, 'MK_Staff', 'MK_Manager'].includes(simulatedRole);
  };

  // Login view if not logged in
  if (!currentUser) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-logo">
            <div className="logo-icon">CNI</div>
          </div>
          <h2>REQUEST FOR PARTS MAKING</h2>
          <p>ระบบรวบรวมใบแจ้งจัดทำและติดตามความคืบหน้าการแนบเอกสาร</p>
          
          {errorMsg && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">ชื่อผู้ใช้งาน (Username)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ระบุชื่อผู้ใช้งาน เช่น admin, mk_staff1" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">รหัสผ่าน (Password)</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="ระบุรหัสผ่าน" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary">เข้าสู่ระบบ (Login)</button>
          </form>
          
          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#cbd5e1', textAlign: 'left' }}>รายชื่อบัญชีทดสอบในระบบ (User / Pass):</div>
            <div style={{ maxHeight: '110px', overflowY: 'auto', textAlign: 'left', paddingRight: '5px' }}>
              <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '0.7rem' }}>
                <li style={{ marginBottom: '2px' }}>• Admin: <strong>admin</strong> / admin123</li>
                <li style={{ marginBottom: '2px' }}>• MK Staff: <strong>mk_staff1</strong> / mk123</li>
                <li style={{ marginBottom: '2px' }}>• MK Manager: <strong>mk_manager</strong> / mk123</li>
                <li style={{ marginBottom: '2px' }}>• NP Staff: <strong>np_staff1</strong> / np123</li>
                <li style={{ marginBottom: '2px' }}>• PD1 Reporter: <strong>pd_staff1</strong> / pd123</li>
                <li style={{ marginBottom: '2px' }}>• PD1 Checker: <strong>checker1</strong> / checker123</li>
                <li style={{ marginBottom: '2px' }}>• PU Manager (Approved): <strong>approved1</strong> / approved123</li>
                <li style={{ marginBottom: '2px' }}>• Incharge Engineer: <strong>incharge1</strong> / incharge123</li>
                <li style={{ marginBottom: '2px' }}>• NP Manager: <strong>np_manager</strong> / np123</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Page content
  return (
    <div className="app-container">
      {/* Admin Simulator Header Controls */}
      {currentUser.role === 'Admin' && (
        <div className="admin-simulator-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={16} className="spin-hover" />
            <span><strong>โหมดแอดมิน:</strong> คุณสามารถจำลองเปลี่ยนสิทธิ์เพื่อทดสอบการแนบ/อนุมัติเอกสารของแผนกต่างๆ ได้ทันที</span>
          </div>
          <div className="simulator-controls">
            <span>บทบาทปัจจุบันที่จำลอง:</span>
            <select 
              className="simulator-select"
              value={simulatedRole}
              onChange={(e) => handleRoleSimulation(e.target.value)}
            >
              {seedUsers.map(u => (
                <option key={u.role} value={u.role}>{u.name} ({u.role})</option>
              ))}
            </select>
            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={handleTriggerCron}>
              <RefreshCw size={12} /> ตรวจสอบวันหมดเขต (Simulate Cron)
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="main-header">
        <div className="brand-section">
          <div className="logo-icon">CNI</div>
          <div className="brand-text">
            <h1>REQUEST FOR PARTS MAKING</h1>
            <span>ใบแจ้งจัดทำชิ้นส่วน & ตรวจติดตามเอกสาร</span>
          </div>
        </div>

        <nav>
          <ul className="nav-menu">
            <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setSelectedRequest(null); fetchRequests(); }}>
              <List size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              รายการใบแจ้งจัดทำ
            </li>
            {canCreateRequest() && (
              <li className={`nav-item ${activeTab === 'create-request' ? 'active' : ''}`} onClick={() => setActiveTab('create-request')}>
                <Plus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                แจ้งจัดทำชิ้นส่วนใหม่
              </li>
            )}
            {canSetupNP() && (
              <li className={`nav-item ${activeTab === 'master-templates' ? 'active' : ''}`} onClick={() => setActiveTab('master-templates')}>
                <Layers size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                จัดการรายการเอกสารหลัก
              </li>
            )}
            {(simulatedRole === 'Admin' || simulatedUser?.department === 'NP') && (
              <>
                <li className={`nav-item ${activeTab === 'manage-users' ? 'active' : ''}`} onClick={() => { setActiveTab('manage-users'); fetchUsers(); fetchDepartments(); }}>
                  <User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  จัดการผู้ใช้งาน
                </li>
                <li className={`nav-item ${activeTab === 'manage-departments' ? 'active' : ''}`} onClick={() => { setActiveTab('manage-departments'); fetchDepartments(); }}>
                  <Settings size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  จัดการแผนก
                </li>
                <li className={`nav-item ${activeTab === 'manage-customers' ? 'active' : ''}`} onClick={() => { setActiveTab('manage-customers'); fetchCustomers(); }}>
                  <User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  รายชื่อลูกค้า
                </li>
              </>
            )}
            <li className={`nav-item ${activeTab === 'notifications-log' ? 'active' : ''}`} onClick={() => { setActiveTab('notifications-log'); fetchNotifications(); }}>
              <Send size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              ประวัติส่งเมล / Telegram
            </li>
          </ul>
        </nav>

        <div className="user-profile">
          <div className="user-info-text" onClick={() => setShowProfileModal(true)} style={{ cursor: 'pointer', textAlign: 'right' }} title="คลิกเพื่อดูข้อมูลบัญชีของคุณ">
            <span className="user-name">{simulatedUser?.name || ''}</span>
            <span className="user-role-badge">{simulatedRole || ''} [{simulatedUser?.department || ''}]</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            ออกระบบ
          </button>
        </div>
      </header>

      {/* Main body */}
      <main className="main-content">
        
        {/* TAB 1: DASHBOARD & REQUESTS LIST */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Dashboard Summary Widgets */}
            <div className="dashboard-grid">
              <div className="summary-card">
                <div className="card-icon-wrapper bg-blue">
                  <FileText size={24} />
                </div>
                <div className="card-info">
                  <h3>ใบจัดทำทั้งหมด</h3>
                  <p>{requests.filter(r => !r.is_cancelled).length}</p>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon-wrapper bg-teal">
                  <CheckCircle size={24} />
                </div>
                <div className="card-info">
                  <h3>เสร็จสมบูรณ์</h3>
                  <p>{requests.filter(r => r.status === 'Completed').length}</p>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon-wrapper bg-amber">
                  <Clock size={24} />
                </div>
                <div className="card-info">
                  <h3>กำลังรวบรวมเอกสาร</h3>
                  <p>{requests.filter(r => r.status === 'In Progress').length}</p>
                </div>
              </div>
              <div className="summary-card">
                <div className="card-icon-wrapper bg-red">
                  <AlertCircle size={24} />
                </div>
                <div className="card-info">
                  <h3>ล่าช้ากว่ากำหนด (Delay)</h3>
                  <p>{requests.filter(r => r.has_delay === 'Delay').length}</p>
                </div>
              </div>
            </div>

            {/* List Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="section-title">รายการใบแจ้งจัดทำชิ้นส่วนในระบบ</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="badge badge-completed">อนุมัติเสร็จสมบูรณ์</span>
                <span className="badge badge-in-progress">กำลังรันเอกสาร</span>
                <span className="badge badge-waiting-mk">รอผู้จัดการอนุมัติ</span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="cni-table">
                <thead>
                  <tr>
                    <th>เลขที่เอกสาร</th>
                    <th>Revision</th>
                    <th>Part No.</th>
                    <th>Part Name</th>
                    <th>Model Code</th>
                    <th>วันที่บันทึก</th>
                    <th>ความคืบหน้า (%)</th>
                    <th>สถานะรวม</th>
                    <th>กำหนดส่ง OTS</th>
                    <th>ISO DAR</th>
                    <th>การกระทำ</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{ opacity: r.is_cancelled ? 0.6 : 1 }}>
                      <td>
                        <strong>{r.request_no}</strong>
                        {r.is_cancelled && <span style={{ color: 'red', fontSize: '0.75rem', display: 'block' }}>(ยกเลิกแล้ว)</span>}
                      </td>
                      <td><span className="badge badge-draft">Rev {r.revision}</span></td>
                      <td>{r.part_no}</td>
                      <td>{r.part_name}</td>
                      <td>{r.model_code}</td>
                      <td>{fmtDate(r.date)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="progress-container" style={{ width: '80px' }}>
                            <div className="progress-bar" style={{ width: `${r.completion_percentage}%` }}></div>
                          </div>
                          <span className="progress-text">{r.completion_percentage}%</span>
                        </div>
                      </td>
                      <td>
                        {r.status === 'Draft' && <span className="badge badge-draft">ร่าง</span>}
                        {r.status === 'Waiting MK Manager Approval' && <span className="badge badge-waiting-mk">รออนุมัติ (MK Manager)</span>}
                        {r.status === 'NP Setting Documents' && <span className="badge badge-waiting-np">ประชุมกำหนดเอกสาร (NP)</span>}
                        {r.status === 'In Progress' && (
                          <span className={`badge ${r.has_delay === 'Delay' ? 'badge-plan-delay' : 'badge-plan-on-plan'}`}>
                            {r.has_delay === 'Delay' ? 'Delay' : 'On plan'}
                          </span>
                        )}
                        {r.status === 'Completed' && <span className="badge badge-completed">เอกสารอนุมัติครบ</span>}
                        {r.status === 'Cancelled' && <span className="badge badge-cancelled">ยกเลิกโครงการ</span>}
                      </td>
                      <td>{fmtDate(r.apqp_last_ots)}</td>
                      <td>
                        {r.iso_dar_status === 'Waiting ISO DAR Registration' ? (
                          <span className="badge badge-waiting-mk" style={{ fontSize: '0.7rem' }}>รอขึ้นทะเบียน DAR</span>
                        ) : (
                          <span className="badge badge-draft">-</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-action-group">
                          <button className="btn-icon" title="ดูรายละเอียดและแนบเอกสาร" onClick={() => fetchRequestDetail(r.id)}>
                            <Eye size={16} />
                          </button>
                          <button className="btn-icon" title="พิมพ์ใบแจ้งจัดทำ (Print)" onClick={() => handlePrintRequest(r.id)}>
                            <FileText size={16} style={{ color: 'var(--primary-color)' }} />
                          </button>
                          <button className="btn-icon" title="ดาวน์โหลดใบแจ้งจัดทำ (PDF)" onClick={() => handleExportPDFById(r.id)}>
                            <FileDown size={16} style={{ color: 'var(--danger)' }} />
                          </button>
                          {r.status === 'Waiting MK Manager Approval' && canApproveMK() && (
                            <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleApproveMK(r.id)}>
                              <Check size={12} /> อนุมัติใบแจ้ง
                            </button>
                          )}
                          {!r.is_cancelled && r.status !== 'Completed' && canCreateRequest() && (
                            <button className="btn-icon" title="ยกเลิกใบแจ้งจัดทำ" style={{ color: 'red' }} onClick={() => handleCancelRequest(r.id)}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        ไม่พบข้อมูลใบแจ้งจัดทำชิ้นส่วนในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CREATE REQUEST FORM (MK STAFF ONLY) */}
        {activeTab === 'create-request' && (
          <div className="form-card">
            <h2 className="section-title">บันทึกใบแจ้งจัดทำชิ้นส่วน (Request for Parts Making)</h2>
            <form onSubmit={handleCreateRequest}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">เลขที่ใบแจ้งจัดทำชิ้นส่วน (Request No.) <span className="required">*</span></label>
                  <input type="text" className="form-control" placeholder="เช่น N6701005" value={reqNo} onChange={e => setReqNo(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ประเภท (Request for) <span className="required">*</span></label>
                  <select className="form-control" value={reqType} onChange={e => setReqType(e.target.value)}>
                    <option value="Sample Part 1">Sample Part 1</option>
                    <option value="Sample Part 2">Sample Part 2</option>
                    <option value="Pre-Production 1">Pre-Production 1</option>
                    <option value="Mass Production">Mass Production</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ลูกค้า (Customer Name) <span className="required">*</span></label>
                  <select className="form-control" value={customerName} onChange={e => setCustomerName(e.target.value)} required>
                    <option value="">-- เลือกลูกค้า --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {customers.find(c => c.name === customerName)?.note && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Note: {customers.find(c => c.name === customerName)?.note}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Part Name <span className="required">*</span></label>
                  <input type="text" className="form-control" placeholder="เช่น COVER(COMP)" value={partName} onChange={e => setPartName(e.target.value)} required />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Part No. <span className="required">*</span></label>
                  <div className="autocomplete-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="เช่น W952G-S610-1"
                      value={partNo}
                      onChange={e => handlePartNoChange(e.target.value)}
                      onFocus={() => setShowPartNoSuggestions(partNo.trim().length >= 2)}
                      onBlur={() => setTimeout(() => setShowPartNoSuggestions(false), 150)}
                      autoComplete="off"
                      required
                    />
                    {showPartNoSuggestions && (loadingPartNoSuggestions || partNoSuggestions.length > 0) && (
                      <div className="autocomplete-menu">
                        {loadingPartNoSuggestions && (
                          <div className="autocomplete-status">Searching Part No...</div>
                        )}
                        {!loadingPartNoSuggestions && partNoSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.part_no}
                            type="button"
                            className="autocomplete-option"
                            onMouseDown={() => handleSelectPartNoSuggestion(suggestion)}
                          >
                            <span className="autocomplete-main">{suggestion.part_no}</span>
                            <span className="autocomplete-meta">
                              {suggestion.part_name || 'No part name'} | Rev.{suggestion.revision}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>* หากมี Part No เดิมในระบบ ระบบจะคำนวณ Revision ใหม่ให้อัตโนมัติ (Revเดิม + 1)</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Model Code <span className="required">*</span></label>
                  <input type="text" className="form-control" placeholder="เช่น KRK194" value={modelCode} onChange={e => setModelCode(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">RFQ Volume (Pcs./Year) <span className="required">*</span></label>
                  <input type="number" className="form-control" placeholder="เช่น 3503" value={rfqVolume} onChange={e => setRfqVolume(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Model Name <span className="required">*</span></label>
                  <input type="text" className="form-control" placeholder="เช่น ROTARY" value={modelName} onChange={e => setModelName(e.target.value)} required />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Sample Part Q'ty (Pcs) <span className="required">*</span></label>
                  <input type="number" className="form-control" placeholder="เช่น 3" value={sampleQty} onChange={e => setSampleQty(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Model Life (Years) <span className="required">*</span></label>
                  <input type="number" className="form-control" placeholder="เช่น 5" value={modelLife} onChange={e => setModelLife(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">SOP PLAN <span className="required">*</span></label>
                  <input type="text" className="form-control" placeholder="เช่น AUG'2024" value={sopPlan} onChange={e => setSOPPlan(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ERP FG No. <span className="required">*</span></label>
                  <input type="text" className="form-control" placeholder="เช่น FG300100366" value={erpFgNo} onChange={e => setErpFgNo(e.target.value)} required />
                </div>
              </div>

              <div className="form-grid" style={{ backgroundColor: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                <div className="form-group">
                  <label className="form-label">ERP Die No.</label>
                  <input type="text" className="form-control" placeholder="เว้นว่างได้หากไม่มี" value={erpDieNo} onChange={e => setErpDieNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tooling and Die Leadtime (Days) {erpDieNo && <span className="required">*</span>}</label>
                  <input type="number" className="form-control" placeholder="เช่น 45" value={toolingLeadtime} onChange={e => setToolingLeadtime(e.target.value)} required={erpDieNo ? true : false} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tooling & Die By</label>
                  <select className="form-control" value={toolingBy} onChange={e => setToolingBy(e.target.value)}>
                    <option value="C.N.I">C.N.I</option>
                    <option value="CUSTOMER SUPPLY">CUSTOMER SUPPLY</option>
                    <option value="CENTRALIZED">CENTRALIZED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Guarantee Tooling (Strokes) {erpDieNo && <span className="required">*</span>}</label>
                  <input type="number" className="form-control" placeholder="เช่น 500000" value={guaranteeTooling} onChange={e => setGuaranteeTooling(e.target.value)} required={erpDieNo ? true : false} />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">APQP last OTS (วันกำหนด OTS ล่าสุด) <span className="required">*</span></label>
                  <input type="date" className="form-control" value={apqpLastOts} onChange={e => setApqpLastOts(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">OTS Approved Date <span className="required">*</span></label>
                  <input type="date" className="form-control" value={otsApproved} onChange={e => setOtsApproved(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Hatsu #1 Line In <span className="required">*</span></label>
                  <input type="date" className="form-control" value={hatsuLineIn} onChange={e => setHatsuLineIn(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mass Production Date <span className="required">*</span></label>
                  <input type="date" className="form-control" value={massProd} onChange={e => setMassProd(e.target.value)} required />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Delivery Date (วันกำหนดส่งมอบสินค้า)</label>
                  <input type="text" className="form-control" value={apqpLastOts ? fmtDate(apqpLastOts) : 'จะคำนวณอัตโนมัติให้ตรงกับ APQP last OTS'} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">บรรจุภัณฑ์ (Packaging details) <span className="required">*</span></label>
                  <input type="text" className="form-control" value={packaging} onChange={e => setPackaging(e.target.value)} required />
                </div>
              </div>

              <div className="form-group full-width" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Changing Point Remark (ข้อมูลปรับเปลี่ยนจากลูกค้า - Long Text) <span className="required">*</span></label>
                <textarea className="form-control" rows="3" placeholder="ระบุการเปลี่ยนแปลงหรือข้อมูลที่ได้ตกลงกับลูกค้า..." value={remark} onChange={e => setRemark(e.target.value)} required></textarea>
              </div>

              {/* RAW MATERIALS DYNAMIC LIST */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="section-title">Raw Material List (วัตถุดิบชิ้นส่วนย่อย)</h3>
                  <button type="button" className="btn btn-secondary" onClick={handleAddRawMaterial}>
                    <Plus size={16} /> เพิ่มรายการวัตถุดิบ
                  </button>
                </div>

                <div className="table-responsive" style={{ maxHeight: '350px' }}>
                  <table className="cni-table">
                    <thead>
                      <tr>
                        <th>Sub No.</th>
                        <th>Part No.</th>
                        <th>Part Name</th>
                        <th>Qty/Unit</th>
                        <th>In-House</th>
                        <th>Outsource (Supplier / MOQ)</th>
                        <th>Size Specs (T x W x L)</th>
                        <th>Qty / Strip</th>
                        <th>ลบ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rawMaterials.map((rm, index) => (
                        <tr key={index}>
                          <td>{rm.sub_item}</td>
                          <td>
                            <input type="text" className="form-control" style={{ width: '130px' }} value={rm.part_no} onChange={e => handleRawMaterialChange(index, 'part_no', e.target.value)} required />
                          </td>
                          <td>
                            <input type="text" className="form-control" style={{ width: '130px' }} value={rm.part_name} onChange={e => handleRawMaterialChange(index, 'part_name', e.target.value)} required />
                          </td>
                          <td>
                            <input type="number" className="form-control" style={{ width: '60px' }} value={rm.qty_unit} onChange={e => handleRawMaterialChange(index, 'qty_unit', parseInt(e.target.value) || 1)} required />
                          </td>
                          <td>
                            <input type="checkbox" checked={rm.in_house} onChange={e => handleRawMaterialChange(index, 'in_house', e.target.checked)} />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <input type="text" className="form-control" style={{ width: '80px' }} placeholder="Supplier" value={rm.outsource_supplier} onChange={e => handleRawMaterialChange(index, 'outsource_supplier', e.target.value)} disabled={rm.in_house} />
                              <input type="number" className="form-control" style={{ width: '70px' }} placeholder="MOQ" value={rm.outsource_moq} onChange={e => handleRawMaterialChange(index, 'outsource_moq', parseInt(e.target.value) || '')} disabled={rm.in_house} />
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                              <input type="number" step="0.001" className="form-control" style={{ width: '60px' }} placeholder="T" value={rm.spec_t} onChange={e => handleRawMaterialChange(index, 'spec_t', parseFloat(e.target.value) || 0)} required />
                              <span>x</span>
                              <input type="number" step="0.001" className="form-control" style={{ width: '60px' }} placeholder="W" value={rm.spec_w} onChange={e => handleRawMaterialChange(index, 'spec_w', parseFloat(e.target.value) || 0)} required />
                              <span>x</span>
                              <input type="number" step="0.001" className="form-control" style={{ width: '60px' }} placeholder="L" value={rm.spec_l} onChange={e => handleRawMaterialChange(index, 'spec_l', parseFloat(e.target.value) || 0)} required />
                            </div>
                          </td>
                          <td>
                            <input type="number" className="form-control" style={{ width: '70px' }} value={rm.qty_per_strip} onChange={e => handleRawMaterialChange(index, 'qty_per_strip', parseInt(e.target.value) || 1)} required />
                          </td>
                          <td>
                            <button type="button" className="btn-icon" style={{ color: 'red' }} onClick={() => handleRemoveRawMaterial(index)} disabled={rawMaterials.length === 1}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* UPLOADS DRAWING & PROCESS EXCEL */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 className="section-title">แนบไฟล์ Drawing และ Process List</h3>
                <div className="drawing-grid">
                  <div className={`drawing-card ${file2d ? 'attached' : ''}`}>
                    <span className="form-label">2D Drawing (บังคับแนบอย่างน้อย 2D หรือ 3D)</span>
                    <input type="file" onChange={e => setFile2d(e.target.files[0])} />
                    {file2d && <span style={{ fontSize: '0.75rem', color: 'green' }}>✓ {file2d.name}</span>}
                  </div>
                  <div className={`drawing-card ${file3d ? 'attached' : ''}`}>
                    <span className="form-label">3D Drawing (บังคับแนบอย่างน้อย 2D หรือ 3D)</span>
                    <input type="file" onChange={e => setFile3d(e.target.files[0])} />
                    {file3d && <span style={{ fontSize: '0.75rem', color: 'green' }}>✓ {file3d.name}</span>}
                  </div>
                  <div className={`drawing-card ${fileStandard ? 'attached' : ''}`}>
                    <span className="form-label">Standard Document (ตัวเลือก)</span>
                    <input type="file" onChange={e => setFileStandard(e.target.files[0])} />
                  </div>
                  <div className={`drawing-card ${fileOther ? 'attached' : ''}`}>
                    <span className="form-label">Other Document (ตัวเลือก)</span>
                    <input type="file" onChange={e => setFileOther(e.target.files[0])} />
                  </div>
                </div>

                <div className="form-group" style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
                  <label className="form-label"><strong>อัปโหลดไฟล์ Excel ขั้นตอนกระบวนการผลิต (Process & M/C)</strong></label>
                  <input type="file" accept=".xlsx, .xls" onChange={e => setFileProcess(e.target.files[0])} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>* ระบบจะนำเข้าตารางข้อมูลโดยอัตโนมัติจากไฟล์ Excel (ชีตแรกมีคอลัมน์ Process, M/C, Remark)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกและส่งขออนุมัติ</button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: MASTER TEMPLATES (NP ONLY) */}
        {activeTab === 'master-templates' && (
          <div className="form-card">
            <h2 className="section-title">จัดการรายการเอกสารประกอบหลัก (Document Template Master)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              กำหนดเช็คลิสต์เอกสารมาตรฐานในบริษัท เพื่อนำไปใช้เป็นตัวเลือกหลักในการเลือกส่งเอกสารของแต่ละใบแจ้งจัดทำ (ไม่มีการลบ แต่ปิดใช้งานได้เพื่อเก็บประวัติ)
            </p>

            <form onSubmit={handleAddTemplate} style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label className="form-label">ชื่อเอกสารประกอบ (Document Name)</label>
                  <input type="text" className="form-control" placeholder="เช่น Part Submission Warrant (PSW)" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: 1, alignSelf: 'center', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: 0 }}>
                  <input type="checkbox" id="isApqpCheck" checked={newTemplateApqp} onChange={e => setNewTemplateApqp(e.target.checked)} />
                  <label htmlFor="isApqpCheck" className="form-label" style={{ cursor: 'pointer', margin: 0 }}>เป็นเอกสารทีม APQP</label>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  แผนกรับผิดชอบ (เลือกได้หลายแผนก)
                  {selectedTemplateDepts.length > 0 && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-color)' }}>
                      เลือกแล้ว: {selectedTemplateDepts.join(', ')}
                    </span>
                  )}
                </label>
                <div className="dept-checkbox-grid">
                  {departments.map(d => (
                    <label key={d.id} className="dept-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTemplateDepts.includes(d.name)}
                        onChange={() => handleToggleDeptCheckbox(d.name)}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary"><Plus size={16} /> เพิ่มเอกสาร</button>
              </div>
            </form>

            <div className="table-responsive">
              <table className="cni-table">
                <thead>
                  <tr>
                    <th>ชื่อเอกสารหลัก</th>
                    <th>แผนกที่ต้องแนบ</th>
                    <th>ประเภท Flow</th>
                    <th>สถานะการใช้</th>
                    <th>ปรับเปลี่ยนสถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {documentTemplates.map(t => (
                    <tr key={t.id} style={{ opacity: t.status === 'Disabled' ? 0.5 : 1 }}>
                      <td><strong>{t.document_name}</strong></td>
                      <td>
                        <div className="dept-badges-wrap">
                          {parseDepts(t.department).length > 0
                            ? parseDepts(t.department).map(dp => (
                                <span key={dp} className="badge badge-draft" style={{ fontSize: '0.75rem' }}>{dp}</span>
                              ))
                            : <span className="badge" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
                          }
                        </div>
                      </td>
                      <td>
                        {t.is_apqp ? (
                          <span className="badge badge-waiting-incharge" style={{ fontSize: '0.75rem' }}>APQP Flow (PD -&gt; Incharge -&gt; NP Mgr)</span>
                        ) : (
                          <span className="badge badge-waiting-mk" style={{ fontSize: '0.75rem' }}>Normal Flow (PD -&gt; Chk -&gt; Appv -&gt; Incharge)</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${t.status === 'Active' ? 'badge-completed' : 'badge-cancelled'}`}>
                          {t.status === 'Active' ? 'เปิดใช้งาน (Active)' : 'ปิดการใช้งาน (Disabled)'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`btn ${t.status === 'Active' ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleTemplateStatus(t)}
                        >
                          {t.status === 'Active' ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS LOG CENTER */}
        {activeTab === 'notifications-log' && (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title">ระบบจำลองประวัติการส่ง Email และ Telegram Notifications</h2>
              <button className="btn btn-secondary" onClick={fetchNotifications}><RefreshCw size={16} /> รีเฟรช</button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              หน้านี้แสดงบันทึกการส่งการแจ้งเตือนจากระบบ เพื่ออำนวยความสะดวกในการทดสอบฟังก์ชันส่งเมลและส่งโทรเลขกลุ่ม
            </p>

            <div className="notification-log-panel" style={{ maxHeight: '600px' }}>
              {notifications.map(n => (
                <div className="notification-log-item" key={n.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <div>
                      <span className={`notification-tag ${n.type === 'Telegram' ? 'telegram' : ''}`}>{n.type}</span>
                      <strong>ผู้รับ: {n.recipient}</strong>
                    </div>
                    <span className="notification-time">{fmtDate(n.sent_at)}</span>
                  </div>
                  <div style={{ color: '#ffd700', fontWeight: 'bold', margin: '0.25rem 0' }}>หัวเรื่อง: {n.subject}</div>
                  <pre style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '0.75rem', marginTop: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                    {n.message}
                  </pre>
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>ยังไม่มีประวัติการส่งข้อความแจ้งเตือน</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MANAGE USERS CRUD */}
        {activeTab === 'manage-users' && (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>จัดการผู้ใช้งาน</h2>
              <button className="btn btn-primary" onClick={() => { resetUserForm(); setShowUserModal(true); }}>
                <Plus size={16} /> เพิ่มผู้ใช้ใหม่
              </button>
            </div>
            <div className="table-responsive">
              <table className="cni-table">
                <thead>
                  <tr>
                    <th>ชื่อผู้ใช้ (Username)</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>แผนก</th>
                    <th>บทบาท</th>
                    <th>อีเมล</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.name}</td>
                      <td><span className="badge badge-draft">{u.department}</span></td>
                      <td><span className="user-role-badge" style={{ textTransform: 'none' }}>{u.role}</span></td>
                      <td>{u.email || '-'}</td>
                      <td>
                        <div className="btn-action-group">
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditUserClick(u)}>
                            แก้ไข
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteUser(u.id)} disabled={u.username === 'admin'}>
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: MANAGE DEPARTMENTS CRUD */}
        {activeTab === 'manage-departments' && (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>จัดการแผนก (Department Master)</h2>
              <button className="btn btn-primary" onClick={() => { resetDeptForm(); setShowDeptModal(true); }}>
                <Plus size={16} /> เพิ่มแผนกใหม่
              </button>
            </div>
            <div className="table-responsive" style={{ maxWidth: '900px' }}>
              <table className="cni-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>ชื่อแผนก</th>
                    <th>Email Group</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d, index) => (
                    <tr key={d.id}>
                      <td width="80">{index + 1}</td>
                      <td><strong>{d.name}</strong></td>
                      <td>{d.email_group || '-'}</td>
                      <td width="180">
                        <div className="btn-action-group">
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => { setDeptFormId(d.id); setDeptFormName(d.name); setDeptFormEmailGroup(d.email_group || ''); setShowDeptModal(true); }}>
                            แก้ไข
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteDept(d.id)} disabled={d.name === 'Admin'}>
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: MANAGE CUSTOMERS CRUD */}
        {activeTab === 'manage-customers' && (
          <div className="form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>รายชื่อลูกค้า (Customer Master)</h2>
              <button className="btn btn-primary" onClick={() => { resetCustomerForm(); setShowCustomerModal(true); }}>
                <Plus size={16} /> เพิ่มลูกค้าใหม่
              </button>
            </div>
            <div className="table-responsive">
              <table className="cni-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>ชื่อลูกค้า</th>
                    <th>Note</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, index) => (
                    <tr key={customer.id}>
                      <td width="80">{index + 1}</td>
                      <td><strong>{customer.name}</strong></td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{customer.note || '-'}</td>
                      <td width="180">
                        <div className="btn-action-group">
                          <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditCustomerClick(customer)}>
                            แก้ไข
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteCustomer(customer.id)}>
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>ยังไม่มีข้อมูลลูกค้า</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: REQUEST DETAIL & TRACKING HUB */}
        {activeTab === 'request-detail' && selectedRequest && (
          <div>
            <div className="detail-header">
              <div>
                <h2>ใบแจ้งจัดทำชิ้นส่วนเลขที่: {selectedRequest.request_no}</h2>
                <span className="badge badge-draft">Revision {selectedRequest.revision}</span>
                <span className="badge badge-completed" style={{ marginLeft: '10px' }}>
                  ความคืบหน้ารวม {selectedRequest.completion_percentage}%
                </span>
                {selectedRequest.is_cancelled && (
                  <span className="badge badge-cancelled" style={{ marginLeft: '10px', backgroundColor: '#fee2e2', color: '#991b1b' }}>ยกเลิกแล้ว</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setActiveTab('dashboard')}>
                  ย้อนกลับ
                </button>
                {(canEditRequestInfo(selectedRequest) || canEditRequestFiles(selectedRequest)) && (
                  <button className="btn btn-primary" style={{ backgroundColor: '#0369a1' }} onClick={handleOpenEditRequest}>
                    ✏️ แก้ไขข้อมูล
                  </button>
                )}
                {canCancelReq(selectedRequest) && (
                  <button className="btn btn-danger" onClick={() => handleCancelRequest(selectedRequest.id)}>
                    🚫 ยกเลิกใบแจ้ง
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => handleExportChecklistExcel(selectedRequest)}>
                  <FileDown size={16} /> ส่งออกสรุปรายการเอกสาร (Excel)
                </button>
                <button className="btn btn-primary" style={{ backgroundColor: '#dc2626' }} onClick={() => handleExportPDFById(selectedRequest.id)}>
                  <FileDown size={16} /> ส่งออกใบแจ้งจัดทำ (PDF)
                </button>
                <button className="btn btn-secondary" style={{ backgroundColor: '#475569', color: 'white' }} onClick={() => handlePrintRequest(selectedRequest.id)}>
                  พิมพ์เอกสาร (Print)
                </button>
              </div>
            </div>

            <div className="detail-body">
              {/* Form Metadata Section */}
              <div className="info-grid">
                <div className="info-item">
                  <h4>ผู้แจ้งจัดทำ</h4>
                  <p>{selectedRequest.creator_name}</p>
                </div>
                <div className="info-item">
                  <h4>ประเภทใบงาน</h4>
                  <p>{selectedRequest.request_type}</p>
                </div>
                <div className="info-item">
                  <h4>Part No.</h4>
                  <p>{selectedRequest.part_no}</p>
                </div>
                <div className="info-item">
                  <h4>Part Name</h4>
                  <p>{selectedRequest.part_name}</p>
                </div>
                <div className="info-item">
                  <h4>Model Code / Name</h4>
                  <p>{selectedRequest.model_code} / {selectedRequest.model_name}</p>
                </div>
                <div className="info-item">
                  <h4>RFQ Volume / Year</h4>
                  <p>{selectedRequest.rfq_volume.toLocaleString()} Pcs.</p>
                </div>
                <div className="info-item">
                  <h4>Sample Part Q'ty</h4>
                  <p>{selectedRequest.sample_part_qty} Pcs.</p>
                </div>
                <div className="info-item">
                  <h4>SOP Plan</h4>
                  <p>{selectedRequest.sop_plan}</p>
                </div>
                {selectedRequest.erp_die_no && (
                  <>
                    <div className="info-item">
                      <h4>ERP Die No.</h4>
                      <p>{selectedRequest.erp_die_no}</p>
                    </div>
                    <div className="info-item">
                      <h4>Die Leadtime / Strokes</h4>
                      <p>{selectedRequest.tooling_die_leadtime} Days / {selectedRequest.guarantee_tooling} strokes</p>
                    </div>
                  </>
                )}
                <div className="info-item">
                  <h4>APQP last OTS</h4>
                  <p>{fmtDate(selectedRequest.apqp_last_ots)}</p>
                </div>
                <div className="info-item">
                  <h4>Delivery Date</h4>
                  <p>{fmtDate(selectedRequest.delivery_date)}</p>
                </div>
              </div>

              {/* Changing point Long remark */}
              <div style={{ backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                <strong>Changing point details (ข้อมูลปรับเปลี่ยนจากลูกค้า):</strong>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', marginTop: '0.5rem', color: '#334155' }}>
                  {selectedRequest.remark}
                </p>
              </div>

              {/* Drawings Attachments Viewer */}
              <div>
                <h3 className="section-title">ไฟล์แนบเทคนิคและแบบวาดชิ้นส่วน</h3>
                <div className="drawing-grid" style={{ marginBottom: '2rem' }}>
                  {selectedRequest.drawing_2d_path ? (
                    <a href={`http://localhost:5000${selectedRequest.drawing_2d_path}`} target="_blank" rel="noreferrer" className="drawing-card attached" style={{ textDecoration: 'none', color: '#065f46' }}>
                      <strong>2D Drawing</strong>
                      <span>คลิกเพื่อดูไฟล์</span>
                    </a>
                  ) : (
                    <div className="drawing-card"><strong>2D Drawing</strong><span>-</span></div>
                  )}

                  {selectedRequest.drawing_3d_path ? (
                    <a href={`http://localhost:5000${selectedRequest.drawing_3d_path}`} target="_blank" rel="noreferrer" className="drawing-card attached" style={{ textDecoration: 'none', color: '#065f46' }}>
                      <strong>3D Drawing</strong>
                      <span>คลิกเพื่อดูไฟล์</span>
                    </a>
                  ) : (
                    <div className="drawing-card"><strong>3D Drawing</strong><span>-</span></div>
                  )}

                  {selectedRequest.standard_doc_path ? (
                    <a href={`http://localhost:5000${selectedRequest.standard_doc_path}`} target="_blank" rel="noreferrer" className="drawing-card attached" style={{ textDecoration: 'none', color: '#065f46' }}>
                      <strong>Standard Doc</strong>
                      <span>คลิกเพื่อดูไฟล์</span>
                    </a>
                  ) : (
                    <div className="drawing-card"><strong>Standard Doc</strong><span>-</span></div>
                  )}

                  {selectedRequest.other_doc_path ? (
                    <a href={`http://localhost:5000${selectedRequest.other_doc_path}`} target="_blank" rel="noreferrer" className="drawing-card attached" style={{ textDecoration: 'none', color: '#065f46' }}>
                      <strong>Other Doc</strong>
                      <span>คลิกเพื่อดูไฟล์</span>
                    </a>
                  ) : (
                    <div className="drawing-card"><strong>Other Doc</strong><span>-</span></div>
                  )}
                </div>
              </div>

              {/* Processes list */}
              {selectedRequest.processes && selectedRequest.processes.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 className="section-title">ขั้นตอนกระบวนการผลิต (Process & M/C List)</h3>
                  <div className="table-responsive" style={{ maxHeight: '250px' }}>
                    <table className="cni-table">
                      <thead>
                        <tr>
                          <th>Process Step / Name</th>
                          <th>M/C (เครื่องจักรที่ใช้)</th>
                          <th>Remark (หมายเหตุ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.processes.map((p, idx) => (
                          <tr key={idx}>
                            <td>{p.process_name}</td>
                            <td><span className="badge badge-draft">{p.mc}</span></td>
                            <td>{p.remark || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Raw Materials list */}
              {selectedRequest.raw_materials && selectedRequest.raw_materials.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 className="section-title">Raw Material Specification</h3>
                  <div className="table-responsive">
                    <table className="cni-table">
                      <thead>
                        <tr>
                          <th>Sub Item</th>
                          <th>Part No.</th>
                          <th>Part Name</th>
                          <th>Qty/Unit</th>
                          <th>In House?</th>
                          <th>Outsource Supplier / MOQ</th>
                          <th>Size Spec (T x W x L)</th>
                          <th>Qty/Strip</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.raw_materials.map((rm, idx) => (
                          <tr key={idx}>
                            <td>{rm.sub_item}</td>
                            <td><strong>{rm.part_no}</strong></td>
                            <td>{rm.part_name}</td>
                            <td>{rm.qty_unit}</td>
                            <td>{rm.in_house ? 'In-House' : 'Outsource'}</td>
                            <td>{rm.in_house ? '-' : `${rm.outsource_supplier} (MOQ: ${rm.outsource_moq || '-'})`}</td>
                            <td>{rm.spec_t} x {rm.spec_w} x {rm.spec_l}</td>
                            <td>{rm.qty_per_strip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- ACTION: NP CONFIGURE CHECKS KICKOFF --- */}
              {selectedRequest.status === 'NP Setting Documents' && canSetupNP() && (
                <div className="form-card" style={{ border: '2px solid var(--primary-color)' }}>
                  <h3 className="section-title">NP Document Checklist Setup & Kick-off</h3>
                  <form onSubmit={handleKickoffSubmit}>
                    <div className="form-group" style={{ maxWidth: '300px', marginBottom: '1.5rem' }}>
                      <label className="form-label">วันที่ประชุมตกลง Kick-off</label>
                      <input type="date" className="form-control" value={kickoffDate} onChange={e => setKickoffDate(e.target.value)} required />
                    </div>

                    <div className="table-responsive" style={{ marginBottom: '1.5rem' }}>
                      <table className="cni-table">
                        <thead>
                          <tr>
                            <th width="50">เลือก</th>
                            <th>ชื่อเอกสารแนบ</th>
                            <th>แผนกที่รับผิดชอบ</th>
                            <th>ประเภททีม APQP</th>
                            <th>ช่วงเวลากำหนดส่ง (Period)</th>
                            <th>วันที่ส่ง (Custom Date)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {npSelectedDocs.map((doc, idx) => (
                            <tr key={idx}>
                              <td>
                                <input 
                                  type="checkbox" 
                                  checked={doc.selected} 
                                  onChange={e => handleNpDocChange(idx, 'selected', e.target.checked)} 
                                />
                              </td>
                              <td>{doc.document_name}</td>
                              <td><span className="badge badge-draft">{doc.department}</span></td>
                              <td>{doc.is_apqp ? <span className="badge badge-waiting-incharge" style={{ fontSize: '0.7rem' }}>APQP Team</span> : <span className="badge badge-draft">ทั่วไป</span>}</td>
                              <td>
                                <select 
                                  className="form-control" 
                                  value={doc.period}
                                  onChange={e => handleNpDocChange(idx, 'period', e.target.value)}
                                  disabled={!doc.selected}
                                >
                                  <option value="2 Weeks">2 Weeks (14 วันจาก Kick-off)</option>
                                  <option value="4 Weeks">4 Weeks (28 วันจาก Kick-off)</option>
                                  <option value="6 Weeks">6 Weeks (42 วันจาก Kick-off)</option>
                                  <option value="OTS / OPS Approved">OTS / OPS Approved</option>
                                  <option value="1PP / Hatsu / Pre Mass Production">1PP / Hatsu / Pre Mass Production</option>
                                </select>
                              </td>
                              <td>
                                <input 
                                  type="date" 
                                  className="form-control" 
                                  value={doc.due_date} 
                                  onChange={e => handleNpDocChange(idx, 'due_date', e.target.value)}
                                  disabled={!doc.selected}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button type="submit" className="btn btn-primary">บันทึกส่งงานและเริ่มนับเวลา Kick-off</button>
                  </form>
                </div>
              )}

              {/* --- TAB 4B: DOCUMENTS ATTACHMENT TRACKING PROGRESS (IN PROGRESS) --- */}
              {['In Progress', 'Completed'].includes(selectedRequest.status) && (
                <div>
                  <h3 className="section-title">เอกสารแนบประกอบใบแจ้งจัดทำ</h3>
                  <div className="table-responsive">
                    <table className="cni-table">
                      <thead>
                        <tr>
                          <th>ชื่อเอกสาร</th>
                          <th>แผนกที่รับผิดชอบ</th>
                          <th>กำหนดส่ง</th>
                          <th>ไฟล์แนบ</th>
                          <th>สถานะเอกสาร</th>
                          <th>ล่าช้า (วัน)</th>
                          <th>ผู้ตรวจ Checker</th>
                          <th>ผู้อนุมัติ Approved</th>
                          <th>Incharge (วิศวกร)</th>
                          <th>NP Manager (APQP)</th>
                          <th>การดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRequest.documents && selectedRequest.documents.map(d => (
                          <tr key={d.id}>
                            <td>
                              <strong>{d.document_name}</strong>
                              {d.is_apqp && <span style={{ fontSize: '0.7rem', color: 'purple', display: 'block' }}>[ทีม APQP]</span>}
                            </td>
                            <td><span className="badge badge-draft">{d.department}</span></td>
                            <td>
                              <div>{fmtDate(d.due_date)}</div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({d.period})</span>
                            </td>
                            <td>
                              {d.file_path ? (
                                <a href={`http://localhost:5000${d.file_path}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary-color)' }}>
                                  <Download size={14} /> {d.file_name.substring(0, 15)}...
                                </a>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>ยังไม่ได้แนบ</span>
                              )}
                            </td>
                            <td>
                              {d.status === 'Waiting Upload' && <span className="badge badge-doc-waiting-upload">รออัปโหลด</span>}
                              {d.status === 'Waiting Checker' && <span className="badge badge-doc-waiting-checker">รอตรวจ (Checker)</span>}
                              {d.status === 'Waiting Approved' && <span className="badge badge-doc-waiting-approved">รออนุมัติ (Manager)</span>}
                              {d.status === 'Waiting Incharge' && <span className="badge badge-doc-waiting-incharge">รอตรวจ (Incharge)</span>}
                              {d.status === 'Waiting NP Manager' && <span className="badge badge-doc-waiting-np-manager">รออนุมัติ (NP Mgr)</span>}
                              {d.status === 'Approved' && <span className="badge badge-doc-approved">ผ่านอนุมัติแล้ว</span>}
                              {d.status === 'Rejected' && (
                                <span className="badge badge-doc-rejected" title={`เหตุผล: ${d.reject_reason}`}>
                                  ถูกปฏิเสธ ⚠️
                                </span>
                              )}
                            </td>
                            <td>
                              {d.delay_days > 0 ? (
                                <span className="badge badge-plan-delay">{d.delay_days} วัน</span>
                              ) : (
                                <span style={{ color: 'green' }}>On plan</span>
                              )}
                            </td>
                            
                            {/* Checker verify state */}
                            <td>{d.checker_approved_by ? '✅ ผ่าน' : '-'}</td>
                            {/* Manager approved state */}
                            <td>{d.approved_by ? '✅ ผ่าน' : '-'}</td>
                            {/* Incharge verify state */}
                            <td>{d.incharge_approved_by ? '✅ ผ่าน' : '-'}</td>
                            {/* NP Manager verify state */}
                            <td>{d.np_manager_approved_by ? '✅ ผ่าน' : '-'}</td>

                            <td>
                              <div className="btn-action-group">
                                {/* Upload button for PD */}
                                {['Waiting Upload', 'Rejected'].includes(d.status) && canUploadDoc(d.department) && (
                                  <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUploadClick(d.id)}>
                                    แนบเอกสาร
                                  </button>
                                )}

                                {/* Checker Approve */}
                                {d.status === 'Waiting Checker' && canCheckDoc(d.department) && (
                                  <>
                                    <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocApprove(d.id, 'checker')}>
                                      ผ่าน
                                    </button>
                                    <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocRejectClick(d.id)}>
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* Manager Approved */}
                                {d.status === 'Waiting Approved' && canApproveDoc(d.department) && (
                                  <>
                                    <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocApprove(d.id, 'manager')}>
                                      ผ่าน
                                    </button>
                                    <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocRejectClick(d.id)}>
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* Incharge Approve */}
                                {d.status === 'Waiting Incharge' && canInchargeApprove() && (
                                  <>
                                    <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocApprove(d.id, 'incharge')}>
                                      ผ่าน
                                    </button>
                                    <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocRejectClick(d.id)}>
                                      Reject
                                    </button>
                                  </>
                                )}

                                {/* NP Manager Approve */}
                                {d.status === 'Waiting NP Manager' && canNPManagerApprove() && (
                                  <>
                                    <button className="btn btn-success" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocApprove(d.id, 'np-manager')}>
                                      ผ่าน
                                    </button>
                                    <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDocRejectClick(d.id)}>
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* CRUD MODAL: MANAGE USER */}
      {showUserModal && (
        <div className="crud-modal-overlay">
          <div className="crud-modal-box sm">
            <div className="crud-modal-header">
              <h3>
                <User size={18} />
                {userFormId ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <button className="btn-icon" onClick={() => setShowUserModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="crud-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">ชื่อผู้ใช้ (Username) <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น somchai_pd" 
                    value={userFormUsername} 
                    onChange={e => setUserFormUsername(e.target.value)} 
                    required 
                    disabled={userFormId ? true : false}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">
                    {userFormId ? 'เปลี่ยนรหัสผ่าน (ใหม่)' : 'รหัสผ่าน (Password) *'}
                  </label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder={userFormId ? 'เว้นว่างไว้หากไม่ต้องการแก้ไข' : 'เช่น pd123'} 
                    value={userFormPassword} 
                    onChange={e => setUserFormPassword(e.target.value)} 
                    required={userFormId ? false : true}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อ-นามสกุล <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น สมชาย ใจดี" 
                    value={userFormName} 
                    onChange={e => setUserFormName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">บทบาท (Role) <span className="required">*</span></label>
                  <select 
                    className="form-control" 
                    value={userFormRole} 
                    onChange={e => setUserFormRole(e.target.value)}
                  >
                    <option value="PD">PD (Reporter/ผู้ปฏิบัติงานแนบเอกสาร)</option>
                    <option value="Checker">Checker (หัวหน้างานตรวจเอกสาร)</option>
                    <option value="Approved">Approved (ผู้จัดการแผนกอนุมัติเอกสาร)</option>
                    <option value="Incharge">Incharge (วิศวกรผู้รับผิดชอบใบแจ้ง)</option>
                    <option value="NP_Staff">NP Staff (เจ้าหน้าที่ New Part)</option>
                    <option value="NP_Manager">NP Manager (ผู้จัดการ New Part)</option>
                    <option value="MK_Staff">MK Staff (เจ้าหน้าที่แจ้งใบแจ้ง)</option>
                    <option value="MK_Manager">MK Manager (ผู้จัดการแผนก MK)</option>
                    <option value="Admin">Admin (สิทธิ์ดูแลระบบและทดสอบ)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">แผนกสังกัด (Department) <span className="required">*</span></label>
                  <select 
                    className="form-control" 
                    value={userFormDept} 
                    onChange={e => setUserFormDept(e.target.value)}
                    required
                  >
                    <option value="">-- เลือกแผนก --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">อีเมล (Email)</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    placeholder="เช่น somchai@cni.co.th" 
                    value={userFormEmail} 
                    onChange={e => setUserFormEmail(e.target.value)} 
                  />
                </div>
              </div>
              <div className="crud-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">{userFormId ? 'อัปเดตข้อมูล' : 'บันทึกผู้ใช้ใหม่'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRUD MODAL: MANAGE DEPARTMENT */}
      {showDeptModal && (
        <div className="crud-modal-overlay">
          <div className="crud-modal-box sm">
            <div className="crud-modal-header">
              <h3>
                <Layers size={18} />
                {deptFormId ? 'แก้ไขข้อมูลแผนก' : 'เพิ่มแผนกใหม่'}
              </h3>
              <button className="btn-icon" onClick={() => setShowDeptModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="crud-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">ชื่อแผนก (Department Name) <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="เช่น IT, Logistics, NB" 
                    value={deptFormName} 
                    onChange={e => setDeptFormName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Group</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น np_group@cni.co.th"
                    value={deptFormEmailGroup}
                    onChange={e => setDeptFormEmailGroup(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    สามารถใส่ได้หลายอีเมล โดยคั่นด้วยเครื่องหมายจุลภาค (,)
                  </small>
                </div>
              </div>
              <div className="crud-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeptModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">{deptFormId ? 'อัปเดตชื่อแผนก' : 'เพิ่มแผนก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRUD MODAL: MANAGE CUSTOMER */}
      {showCustomerModal && (
        <div className="crud-modal-overlay">
          <div className="crud-modal-box sm">
            <div className="crud-modal-header">
              <h3>
                <User size={18} />
                {customerFormId ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
              </h3>
              <button className="btn-icon" onClick={() => setShowCustomerModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCustomer}>
              <div className="crud-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">ชื่อลูกค้า (Customer Name) <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น SIAM KUBOTA CORPORATION CO., LTD. (SKC-A)"
                    value={customerFormName}
                    onChange={e => setCustomerFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Note</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="หมายเหตุเพิ่มเติมของลูกค้ารายนี้"
                    value={customerFormNote}
                    onChange={e => setCustomerFormNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="crud-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">{customerFormId ? 'อัปเดตข้อมูลลูกค้า' : 'เพิ่มลูกค้า'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CRUD MODAL: EDIT REQUEST */}
      {editRequestModal && selectedRequest && (
        <div className="crud-modal-overlay">
          <div className="crud-modal-box">
            <div className="crud-modal-header">
              <h3>
                <FileText size={18} />
                แก้ไขใบแจ้งจัดทำเลขที่: {selectedRequest.request_no}
              </h3>
              <button className="btn-icon" onClick={() => setEditRequestModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveRequestEdit}>
              <div className="crud-modal-body">
                {/* section 1: basic */}
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h4 style={{ color: '#0284c7', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>1. ข้อมูลพื้นฐาน</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">ประเภทงาน <span className="required">*</span></label>
                      <select
                        className="form-control"
                        value={editReqForm.request_type}
                        onChange={e => setEditReqForm({ ...editReqForm, request_type: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                        required
                      >
                        <option value="Sample Part 1">Sample Part 1 (สร้างชิ้นส่วนตัวอย่างระยะที่ 1)</option>
                        <option value="Sample Part 2">Sample Part 2 (สร้างชิ้นส่วนตัวอย่างระยะที่ 2)</option>
                        <option value="Mass Production Part">Mass Production Part (สร้างชิ้นส่วนสำหรับผลิตจริง)</option>
                        <option value="Other">Other (งานอื่นๆ)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ลูกค้า <span className="required">*</span></label>
                      <select
                        className="form-control"
                        value={editReqForm.customer_name}
                        onChange={e => setEditReqForm({ ...editReqForm, customer_name: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                        required
                      >
                        <option value="">-- เลือกบริษัทลูกค้า --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Part No. <span className="required">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.part_no}
                        onChange={e => setEditReqForm({ ...editReqForm, part_no: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Part Name <span className="required">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.part_name}
                        onChange={e => setEditReqForm({ ...editReqForm, part_name: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Model Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.model_code}
                        onChange={e => setEditReqForm({ ...editReqForm, model_code: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Model Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.model_name}
                        onChange={e => setEditReqForm({ ...editReqForm, model_name: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                </div>

                {/* section 2: quantity & SOP */}
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h4 style={{ color: '#0284c7', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>2. ข้อมูลปริมาณและแผนงาน</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">RFQ Volume (Pcs/Month)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editReqForm.rfq_volume}
                        onChange={e => setEditReqForm({ ...editReqForm, rfq_volume: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sample Part Qty (Pcs)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={editReqForm.sample_part_qty}
                        onChange={e => setEditReqForm({ ...editReqForm, sample_part_qty: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Model Life (Years)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.model_life}
                        onChange={e => setEditReqForm({ ...editReqForm, model_life: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SOP Plan</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editReqForm.sop_plan}
                        onChange={e => setEditReqForm({ ...editReqForm, sop_plan: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Packaging</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editReqForm.packaging}
                      onChange={e => setEditReqForm({ ...editReqForm, packaging: e.target.value })}
                      disabled={!canEditRequestInfo(selectedRequest)}
                    />
                  </div>
                </div>

                {/* section 3: ERP & Tooling */}
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h4 style={{ color: '#0284c7', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>3. ข้อมูล ERP และแม่พิมพ์ (Tooling & ERP)</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Tooling / Die By</label>
                      <select
                        className="form-control"
                        value={editReqForm.tooling_die_by}
                        onChange={e => setEditReqForm({ ...editReqForm, tooling_die_by: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      >
                        <option value="C.N.I">C.N.I (แม่พิมพ์ดำเนินการโดยบริษัท)</option>
                        <option value="Supplier">Supplier (แม่พิมพ์โดยผู้จัดหาภายนอก)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tooling/Die Leadtime (Months)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.tooling_die_leadtime}
                        onChange={e => setEditReqForm({ ...editReqForm, tooling_die_leadtime: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Guarantee Tooling (Shots)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.guarantee_tooling}
                        onChange={e => setEditReqForm({ ...editReqForm, guarantee_tooling: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ERP FG No.</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editReqForm.erp_fg_no}
                        onChange={e => setEditReqForm({ ...editReqForm, erp_fg_no: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ERP Die No.</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editReqForm.erp_die_no}
                      onChange={e => setEditReqForm({ ...editReqForm, erp_die_no: e.target.value })}
                      disabled={!canEditRequestInfo(selectedRequest)}
                    />
                  </div>
                </div>

                {/* section 4: APQP Dates */}
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                  <h4 style={{ color: '#0284c7', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>4. กำหนดเวลาขั้นคุ้มครองคุณภาพ (APQP Dates)</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">APQP Last OTS Plan / Delivery Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editReqForm.apqp_last_ots}
                        onChange={e => setEditReqForm({ ...editReqForm, apqp_last_ots: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">OTS Approved Plan</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editReqForm.ots_approved}
                        onChange={e => setEditReqForm({ ...editReqForm, ots_approved: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Hatsu Line In Plan</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editReqForm.hatsu_line_in}
                        onChange={e => setEditReqForm({ ...editReqForm, hatsu_line_in: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mass Production Plan</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editReqForm.mass_production}
                        onChange={e => setEditReqForm({ ...editReqForm, mass_production: e.target.value })}
                        disabled={!canEditRequestInfo(selectedRequest)}
                      />
                    </div>
                  </div>
                </div>

                {/* section 5: Files & Remarks */}
                <div>
                  <h4 style={{ color: '#0284c7', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>5. ไฟล์แนบและหมายเหตุ (Attachments & Remark)</h4>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        2D Drawing
                        {selectedRequest.drawing_2d_path && (
                          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#16a34a' }}>(มีไฟล์เดิมแนบอยู่)</span>
                        )}
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={e => setEditFile2d(e.target.files[0])}
                        disabled={!canEditRequestFiles(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        3D Drawing
                        {selectedRequest.drawing_3d_path && (
                          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#16a34a' }}>(มีไฟล์เดิมแนบอยู่)</span>
                        )}
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={e => setEditFile3d(e.target.files[0])}
                        disabled={!canEditRequestFiles(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        Standard Document
                        {selectedRequest.standard_doc_path && (
                          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#16a34a' }}>(มีไฟล์เดิมแนบอยู่)</span>
                        )}
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={e => setEditFileStandard(e.target.files[0])}
                        disabled={!canEditRequestFiles(selectedRequest)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Other Document
                        {selectedRequest.other_doc_path && (
                          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#16a34a' }}>(มีไฟล์เดิมแนบอยู่)</span>
                        )}
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        onChange={e => setEditFileOther(e.target.files[0])}
                        disabled={!canEditRequestFiles(selectedRequest)}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">หมายเหตุเพิ่มเติม (Remark)</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="ระบุหมายเหตุเพิ่มเติม..."
                      value={editReqForm.remark}
                      onChange={e => setEditReqForm({ ...editReqForm, remark: e.target.value })}
                      disabled={!canEditRequestInfo(selectedRequest)}
                    />
                  </div>
                </div>
              </div>
              <div className="crud-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditRequestModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ATTACH DOCUMENT FILE */}
      {uploadingDocId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>แนบไฟล์เอกสารประกอบ</h3>
              <button className="btn-icon" onClick={() => setUploadingDocId(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleDocumentSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">เลือกไฟล์เอกสารแนบ (เช่น PDF, Excel, Word)</label>
                <input type="file" className="form-control" onChange={e => setUploadFile(e.target.files[0])} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUploadingDocId(null)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">ส่งเสนออนุมัติ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT REASON ENTRY */}
      {rejectingDocId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>ปฏิเสธเอกสาร / ตีกลับแก้ไข</h3>
              <button className="btn-icon" onClick={() => setRejectingDocId(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleDocRejectSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">ระบุเหตุผลการตีกลับ (Reject Reason)</label>
                <textarea className="form-control" rows="3" placeholder="ระบุเหตุผลที่ผู้ใช้งานต้องนำไปแก้ไขปรับปรุงเอกสาร..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} required></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRejectingDocId(null)}>ยกเลิก</button>
                <button type="submit" className="btn btn-danger">ยืนยันตีกลับและลบไฟล์เดิม</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PROFILE MODAL VIEW (READ ONLY) */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>ข้อมูลบัญชีผู้ใช้งานของคุณ</h3>
              <button className="btn-icon" onClick={() => setShowProfileModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#64748b' }}>ชื่อ-นามสกุล:</span>
                <span style={{ fontWeight: '600' }}>{simulatedUser?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#64748b' }}>ชื่อผู้ใช้ (Username):</span>
                <span>{simulatedUser?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#64748b' }}>แผนกที่สังกัด:</span>
                <span className="badge badge-draft">{simulatedUser?.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600', color: '#64748b' }}>บทบาทในระบบ:</span>
                <span className="user-role-badge" style={{ textTransform: 'none' }}>{simulatedRole}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: '#64748b' }}>อีเมลติดต่อ:</span>
                <span>{simulatedUser?.email || '-'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem 2rem', textAlign: 'center', backgroundColor: '#f1f5f9', color: '#64748b', fontSize: '0.8rem' }}>
        &copy; {new Date().getFullYear()} CNI Request for Parts Making and APQP Tracker System. All rights reserved.
      </footer>

      {/* GLASSMORPHISM ALERT / CONFIRM MODAL */}
      {modalAlert && (
        <div className="glass-modal-overlay" onClick={() => !modalAlert.isConfirm && handleModalClose(false)}>
          <div className="glass-modal-box" onClick={e => e.stopPropagation()}>
            <div className={`glass-modal-icon icon-${modalAlert.type}`}>
              {modalAlert.type === 'success' && <ShieldCheck size={30} />}
              {modalAlert.type === 'danger' && <AlertCircle size={30} />}
              {modalAlert.type === 'warning' && <AlertTriangle size={30} />}
              {modalAlert.type === 'confirm' && <HelpCircle size={30} />}
              {modalAlert.type === 'info' && <Info size={30} />}
            </div>
            <div className="glass-modal-title">{modalAlert.title}</div>
            <div className="glass-modal-message">{modalAlert.message}</div>
            <div className="glass-modal-actions">
              {modalAlert.isConfirm ? (
                <>
                  <button
                    className="glass-modal-btn glass-modal-btn-secondary"
                    onClick={() => handleModalClose(false)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="glass-modal-btn glass-modal-btn-primary"
                    onClick={() => handleModalClose(true)}
                  >
                    ยืนยัน
                  </button>
                </>
              ) : (
                <button
                  className="glass-modal-btn glass-modal-btn-primary"
                  onClick={() => handleModalClose(true)}
                >
                  ตกลง
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
