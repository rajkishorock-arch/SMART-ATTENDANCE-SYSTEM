import { jsPDF } from 'jspdf';

/**
 * Generate an official, structured Leave Application & Review Summary PDF Document.
 * @param {Object} req Leave request object
 * @param {string} instName Institution name
 */
export function generateLeavePdf(req, instName = 'SMART ATTENDANCE SYSTEM') {
  if (!req) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [14, 165, 233]; // #0ea5e9 Cyber Blue
  const darkBg = [15, 23, 42]; // #0f172a Deep Slate
  const textDark = [30, 41, 59]; // #1e293b Slate 800
  const textMuted = [100, 116, 139]; // #64748b Slate 500

  // ── Header Banner ──
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Institution Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(String(instName).toUpperCase(), 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('OFFICIAL LEAVE APPLICATION SLIP & AUDIT RECORD', 14, 24);

  // Document Reference Badge
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(`REF ID: #LEAVE-${req.id || 'N/A'}`, pageWidth - 14, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Issued: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 14, 24, { align: 'right' });

  // Divider Line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(0, 42, pageWidth, 42);

  let y = 52;

  // ── Section 1: Student Information ──
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 28, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(14, y, pageWidth - 28, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textDark);
  doc.text('STUDENT INFORMATION', 18, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Name: `, 18, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(`${req.student_name || 'Student'}`, 35, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Roll No: `, 110, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(`${req.student_roll || 'N/A'}`, 128, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Department: `, 18, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(`${req.student_dep || 'N/A'}`, 42, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Applied On: `, 110, y + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  const formattedCreated = req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A';
  doc.text(`${formattedCreated}`, 132, y + 22);

  y += 36;

  // ── Section 2: Leave Application Details ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text('LEAVE APPLICATION DETAILS', 14, y);
  y += 6;

  // Key-Value Table Box
  const details = [
    ['Leave Category:', req.leave_type || 'General / Medical'],
    ['Subject / Course:', req.subject_name ? `${req.subject_name} (${req.subject_code || ''})` : 'All Subjects (General Leave)'],
    ['From Date:', req.start_date || 'N/A'],
    ['To Date:', req.end_date || 'N/A'],
  ];

  doc.setFontSize(9.5);
  details.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text(label, 18, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(String(val), 60, y);
    y += 7;
  });

  y += 2;

  // Reason Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...textDark);
  doc.text('Reason for Leave:', 18, y);
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.rect(18, y, pageWidth - 36, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(18, y, pageWidth - 36, 22, 'S');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitReason = doc.splitTextToSize(req.reason || 'No specific reason detailed.', pageWidth - 42);
  doc.text(splitReason, 22, y + 6);

  y += 30;

  // ── Section 3: Official Decision & Status ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text('APPROVAL & REVIEW STATUS', 14, y);
  y += 8;

  const status = (req.status || 'PENDING').toUpperCase();
  let statusBg = [254, 243, 199]; // Yellow background
  let statusBorder = [245, 158, 11]; // Yellow border
  let statusText = [180, 83, 9]; // Dark yellow text
  let statusLabel = '⏳ PENDING REVIEW';

  if (status === 'APPROVED') {
    statusBg = [209, 250, 229];
    statusBorder = [16, 185, 129];
    statusText = [4, 120, 87];
    statusLabel = '✅ APPROVED';
  } else if (status === 'REJECTED') {
    statusBg = [254, 226, 226];
    statusBorder = [239, 68, 68];
    statusText = [185, 28, 28];
    statusLabel = '❌ REJECTED';
  }

  // Status Banner Box
  doc.setFillColor(...statusBg);
  doc.rect(14, y, pageWidth - 28, 26, 'F');
  doc.setDrawColor(...statusBorder);
  doc.setLineWidth(0.8);
  doc.rect(14, y, pageWidth - 28, 26, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...statusText);
  doc.text(statusLabel, 20, y + 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  
  if (status === 'APPROVED' || status === 'REJECTED') {
    const revBy = req.reviewed_by ? `Reviewed by Staff ID #${req.reviewed_by}` : 'Reviewed by Institutional Admin';
    const revAt = req.reviewed_at ? ` on ${new Date(req.reviewed_at).toLocaleString()}` : '';
    doc.text(`${revBy}${revAt}`, 20, y + 18);
  } else {
    doc.text('This leave application is currently under review by class teacher / administration.', 20, y + 18);
  }

  y += 36;

  // ── Footer & Digital Verification Seal ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Note: This is an officially generated digital summary record from Smart Attendance System.', 14, y);
  doc.text('Verification Code: SAS-LV-' + (req.id || '0') + '-' + Math.floor(1000 + Math.random() * 9000), pageWidth - 14, y, { align: 'right' });

  // Save PDF
  const filename = `Leave_Request_${req.id || 'Summary'}_${req.student_roll || 'Record'}.pdf`;
  doc.save(filename);
}
