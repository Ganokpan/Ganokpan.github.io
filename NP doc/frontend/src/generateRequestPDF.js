import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helper: format date to DD-MM-YYYY ─────────────────────────────────────
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

const fmtNum = (val) => (val !== null && val !== undefined && val !== '') ? Number(val).toLocaleString() : '-';

// ─── Color Palette ─────────────────────────────────────────────────────────
const COLOR = {
  headerBg:   [15,  23,  42],   // dark navy
  headerText: [255, 255, 255],
  sectionBg:  [30,  58,  138],  // deep blue
  sectionText:[255, 255, 255],
  altRow:     [241, 245, 249],   // light slate
  border:     [100, 116, 139],
  labelBg:    [226, 232, 240],
  valueBg:    [255, 255, 255],
  accentRed:  [220,  38,  38],
  accentGold: [217, 119,   6],
};

let activeFont = 'helvetica';

async function loadThaiFont(doc) {
  try {
    const res = await fetch('https://fonts.gstatic.com/s/sarabun/v12/Dt8yR2GP4e0AJ3JFd0sz_g.ttf');
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    doc.addFileToVFS('Sarabun-Regular.ttf', base64);
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
    doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'bold');
    return true;
  } catch (err) {
    console.warn('Could not load Thai font dynamically, falling back to helvetica:', err);
    return false;
  }
}

// ─── Draw a key-value pair cell ─────────────────────────────────────────────
function drawCell(doc, x, y, w, h, label, value, opts = {}) {
  const lw = opts.labelWidth || w * 0.38;
  const vw = w - lw;

  // Label bg
  doc.setFillColor(...COLOR.labelBg);
  doc.rect(x, y, lw, h, 'F');
  doc.setDrawColor(...COLOR.border);
  doc.rect(x, y, lw, h, 'D');

  // Value bg
  doc.setFillColor(...COLOR.valueBg);
  doc.rect(x + lw, y, vw, h, 'F');
  doc.rect(x + lw, y, vw, h, 'D');

  // Label text
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.setFont(activeFont, 'bold');
  doc.text(label, x + 2, y + h / 2 + 1.5);

  // Value text
  doc.setFont(activeFont, 'normal');
  doc.setTextColor(0, 0, 0);
  const valStr = String(value || '-');
  const maxW = vw - 4;
  const lines = doc.splitTextToSize(valStr, maxW);
  doc.text(lines[0], x + lw + 2, y + h / 2 + 1.5);
}

// ─── Section header bar ─────────────────────────────────────────────────────
function sectionBar(doc, x, y, w, h, title) {
  doc.setFillColor(...COLOR.sectionBg);
  doc.rect(x, y, w, h, 'F');
  doc.setFontSize(8.5);
  doc.setFont(activeFont, 'bold');
  doc.setTextColor(...COLOR.sectionText);
  doc.text(title, x + 3, y + h / 2 + 2.5);
  doc.setTextColor(0, 0, 0);
}

// ─── Main export function ────────────────────────────────────────────────────
export async function generateRequestPDF(req) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const hasThaiFont = await loadThaiFont(doc);
  activeFont = hasThaiFont ? 'Sarabun' : 'helvetica';
  
  const PW = 210;   // page width
  const PH = 297;   // page height
  const MX = 10;    // margin x
  const CW = PW - MX * 2;  // content width
  let Y = MX;

  // ── PAGE 1 ────────────────────────────────────────────────────────────────

  // Header Banner
  doc.setFillColor(...COLOR.headerBg);
  doc.rect(MX, Y, CW, 18, 'F');

  doc.setFontSize(14);
  doc.setFont(activeFont, 'bold');
  doc.setTextColor(...COLOR.headerText);
  doc.text('REQUEST FOR PARTS MAKING', MX + CW / 2, Y + 7, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont(activeFont, 'normal');
  doc.text('CNI - C.N.I AUTOPARTS CO., LTD.   |   ใบแจ้งจัดทำชิ้นส่วน', MX + CW / 2, Y + 13, { align: 'center' });

  // Doc No badge top-right
  doc.setFillColor(...COLOR.accentGold);
  doc.roundedRect(PW - MX - 48, Y + 1, 47, 8, 1.5, 1.5, 'F');
  doc.setFontSize(7.5);
  doc.setFont(activeFont, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`No: ${req.request_no}  Rev.${req.revision}`, PW - MX - 47 + 23, Y + 6, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  Y += 20;

  // ── SECTION 1: BASIC INFO ────────────────────────────────────────────────
  sectionBar(doc, MX, Y, CW, 6, '1.  GENERAL INFORMATION  |  ข้อมูลทั่วไป');
  Y += 6;

  const rh = 6.5; // row height
  const hcw = CW / 2;  // half col width

  // Row 1
  drawCell(doc, MX,        Y, hcw, rh, 'Request No.', req.request_no, { labelWidth: hcw * 0.40 });
  drawCell(doc, MX + hcw,  Y, hcw, rh, 'Date', fmtDate(req.date), { labelWidth: hcw * 0.35 });
  Y += rh;

  // Row 2
  drawCell(doc, MX,        Y, hcw, rh, 'Request Type', req.request_type, { labelWidth: hcw * 0.40 });
  drawCell(doc, MX + hcw,  Y, hcw, rh, 'Revision', `Rev. ${req.revision}`, { labelWidth: hcw * 0.35 });
  Y += rh;

  // Row 3 - Customer (full width)
  drawCell(doc, MX, Y, CW, rh, 'Customer Name', req.customer_name, { labelWidth: CW * 0.20 });
  Y += rh;

  // Row 4
  drawCell(doc, MX,       Y, hcw, rh, 'Part Name', req.part_name, { labelWidth: hcw * 0.40 });
  drawCell(doc, MX + hcw, Y, hcw, rh, 'Part No.', req.part_no, { labelWidth: hcw * 0.35 });
  Y += rh;

  // Row 5
  drawCell(doc, MX,       Y, hcw, rh, 'Model Code', req.model_code, { labelWidth: hcw * 0.40 });
  drawCell(doc, MX + hcw, Y, hcw, rh, 'Model Name', req.model_name, { labelWidth: hcw * 0.35 });
  Y += rh;

  // Row 6
  const qcw = CW / 4;
  drawCell(doc, MX,           Y, qcw, rh, 'RFQ Vol./Year', fmtNum(req.rfq_volume) + ' pcs.', { labelWidth: qcw * 0.55 });
  drawCell(doc, MX + qcw,     Y, qcw, rh, 'Sample Q\'ty', fmtNum(req.sample_part_qty) + ' pcs.', { labelWidth: qcw * 0.52 });
  drawCell(doc, MX + qcw * 2, Y, qcw, rh, 'Model Life', req.model_life + ' yr(s)', { labelWidth: qcw * 0.50 });
  drawCell(doc, MX + qcw * 3, Y, qcw, rh, 'SOP Plan', req.sop_plan, { labelWidth: qcw * 0.50 });
  Y += rh;

  // Row 7 - ERP Info
  drawCell(doc, MX,       Y, hcw, rh, 'ERP FG No.', req.erp_fg_no, { labelWidth: hcw * 0.40 });
  drawCell(doc, MX + hcw, Y, hcw, rh, 'ERP Die No.', req.erp_die_no || '-', { labelWidth: hcw * 0.35 });
  Y += rh;

  // Row 8 - Tooling (conditionally shown)
  if (req.erp_die_no) {
    drawCell(doc, MX,       Y, hcw, rh, 'Tooling/Die Leadtime', (req.tooling_die_leadtime || '-') + ' days', { labelWidth: hcw * 0.50 });
    drawCell(doc, MX + hcw, Y, hcw, rh, 'Guarantee Tooling', (req.guarantee_tooling || '-') + ' strokes', { labelWidth: hcw * 0.45 });
    Y += rh;
  }

  drawCell(doc, MX, Y, CW, rh, 'Packaging', req.packaging, { labelWidth: CW * 0.20 });
  Y += rh;

  // Changing Point / Remark (full width, taller)
  const remarkH = 14;
  doc.setFillColor(...COLOR.labelBg);
  doc.rect(MX, Y, CW * 0.20, remarkH, 'F');
  doc.rect(MX, Y, CW * 0.20, remarkH, 'D');
  doc.setFillColor(...COLOR.valueBg);
  doc.rect(MX + CW * 0.20, Y, CW * 0.80, remarkH, 'F');
  doc.rect(MX + CW * 0.20, Y, CW * 0.80, remarkH, 'D');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Changing Point / Remark', MX + 2, Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const remarkLines = doc.splitTextToSize(req.remark || '-', CW * 0.80 - 4);
  doc.text(remarkLines.slice(0, 3), MX + CW * 0.20 + 2, Y + 4);
  Y += remarkH;

  // ── SECTION 2: DATES / MILESTONES ─────────────────────────────────────────
  Y += 2;
  sectionBar(doc, MX, Y, CW, 6, '2.  KEY DATES & MILESTONES  |  วันสำคัญตามแผน');
  Y += 6;

  const dcw = CW / 4;
  const dateLabels = [
    ['Delivery Date',       fmtDate(req.delivery_date)],
    ['APQP Last OTS',       fmtDate(req.apqp_last_ots)],
    ['OTS Approved',        fmtDate(req.ots_approved)],
    ['Hatsu / Line-in',     fmtDate(req.hatsu_line_in)],
  ];
  dateLabels.forEach(([lbl, val], i) => {
    drawCell(doc, MX + dcw * i, Y, dcw, rh, lbl, val, { labelWidth: dcw * 0.55 });
  });
  Y += rh;

  drawCell(doc, MX,       Y, hcw, rh, 'Mass Production', fmtDate(req.mass_production), { labelWidth: hcw * 0.40 });
  drawCell(doc, MX + hcw, Y, hcw, rh, 'Created By', req.creator_name || '-', { labelWidth: hcw * 0.35 });
  Y += rh;

  // ── SECTION 3: RAW MATERIALS TABLE ────────────────────────────────────────
  Y += 2;
  sectionBar(doc, MX, Y, CW, 6, '3.  RAW MATERIALS  |  วัตถุดิบ');
  Y += 6;

  if (req.raw_materials && req.raw_materials.length > 0) {
    const rmHead = [['Sub', 'Part No.', 'Part Name', "Q'ty/Unit", 'Source', 'Outsource Supplier', 'MOQ', 'T', 'W', 'L', 'Q/Strip']];
    const rmBody = req.raw_materials.map(rm => [
      rm.sub_item,
      rm.part_no || '-',
      rm.part_name || '-',
      rm.qty_unit,
      rm.in_house ? 'In-House' : 'Outsource',
      rm.outsource_supplier || '-',
      rm.outsource_moq || '-',
      rm.spec_t,
      rm.spec_w,
      rm.spec_l,
      rm.qty_per_strip
    ]);

    autoTable(doc, {
      head: rmHead,
      body: rmBody,
      startY: Y,
      margin: { left: MX, right: MX },
      styles: { font: activeFont, fontSize: 7, cellPadding: 1.5, lineColor: COLOR.border, lineWidth: 0.2 },
      headStyles: { fillColor: COLOR.sectionBg, textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: COLOR.altRow },
      columnStyles: {
        0: { cellWidth: 8,  halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 28 },
        6: { cellWidth: 10, halign: 'right' },
        7: { cellWidth: 10, halign: 'right' },
        8: { cellWidth: 10, halign: 'right' },
        9: { cellWidth: 10, halign: 'right' },
        10: { cellWidth: 10, halign: 'right' },
      },
      didDrawPage: (data) => { Y = data.cursor.y; }
    });
    Y = doc.lastAutoTable.finalY + 2;
  } else {
    doc.setFontSize(8);
    doc.setFont(activeFont, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('- ไม่มีข้อมูลวัตถุดิบ -', MX + CW / 2, Y + 5, { align: 'center' });
    Y += 10;
  }

  // ── SECTION 4: PROCESS TABLE ─────────────────────────────────────────────
  // Check if we need a new page
  if (Y > PH - 60) {
    doc.addPage();
    Y = MX;
  }

  Y += 2;
  sectionBar(doc, MX, Y, CW, 6, '4.  PROCESS / MC  |  กระบวนการผลิต');
  Y += 6;

  if (req.processes && req.processes.length > 0) {
    const procHead = [['Process No.', 'Process Name / Operation', 'Machine (MC)', 'Remark']];
    const procBody = req.processes.map(p => [
      p.process_no || '-',
      p.process_name || '-',
      p.mc || '-',
      p.remark || '-'
    ]);

    autoTable(doc, {
      head: procHead,
      body: procBody,
      startY: Y,
      margin: { left: MX, right: MX },
      styles: { font: activeFont, fontSize: 7.5, cellPadding: 2, lineColor: COLOR.border, lineWidth: 0.2 },
      headStyles: { fillColor: COLOR.sectionBg, textColor: 255, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: COLOR.altRow },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 70 },
        2: { cellWidth: 50 },
        3: { cellWidth: 45 },
      },
      didDrawPage: (data) => { Y = data.cursor.y; }
    });
    Y = doc.lastAutoTable.finalY + 2;
  } else {
    doc.setFontSize(8);
    doc.setFont(activeFont, 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('- ไม่มีข้อมูลกระบวนการผลิต -', MX + CW / 2, Y + 5, { align: 'center' });
    Y += 10;
  }

  // ── SECTION 5: SIGNATURE BLOCK ────────────────────────────────────────────
  if (Y > PH - 45) {
    doc.addPage();
    Y = MX;
  }

  Y += 4;
  sectionBar(doc, MX, Y, CW, 6, '5.  APPROVALS & SIGNATURES  |  ลายมือชื่ออนุมัติ');
  Y += 8;

  const sigW = CW / 3;
  const sigH = 24;
  const sigLabels = ['ผู้แจ้งจัดทำ (MK Staff)', 'อนุมัติโดย MK Manager', 'รับทราบโดย NP Staff'];

  sigLabels.forEach((label, i) => {
    const sx = MX + sigW * i;
    doc.setFillColor(250, 250, 255);
    doc.setDrawColor(...COLOR.border);
    doc.rect(sx, Y, sigW, sigH, 'FD');

    // signature line
    doc.setDrawColor(...COLOR.border);
    doc.line(sx + 10, Y + sigH - 8, sx + sigW - 10, Y + sigH - 8);

    doc.setFontSize(7.5);
    doc.setFont(activeFont, 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(label, sx + sigW / 2, Y + 6, { align: 'center' });

    doc.setFont(activeFont, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('ลายมือชื่อ / Signature', sx + sigW / 2, Y + sigH - 5, { align: 'center' });
    doc.text('วันที่ / Date: ___________', sx + sigW / 2, Y + sigH + 2, { align: 'center' });
  });

  Y += sigH + 10;

  // ── FOOTER on all pages ────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = PH - 7;
    doc.setFillColor(...COLOR.headerBg);
    doc.rect(MX, fy - 2, CW, 8, 'F');
    doc.setFontSize(7);
    doc.setFont(activeFont, 'normal');
    doc.setTextColor(180, 180, 180);
    doc.text(
      `CNI Request for Parts Making System  |  Printed: ${fmtDate(new Date())}  |  Doc No: ${req.request_no}  Rev.${req.revision}`,
      MX + CW / 2, fy + 2, { align: 'center' }
    );
    doc.text(`Page ${p} / ${totalPages}`, PW - MX - 2, fy + 2, { align: 'right' });
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────
  doc.save(`ใบแจ้งจัดทำ_${req.request_no}_Rev${req.revision}.pdf`);
}
