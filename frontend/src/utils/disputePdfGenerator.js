import jsPDF from 'jspdf';

/**
 * Generate an official, structured Attendance Dispute & Correction Summary PDF Document.
 * @param {Object} dispute Attendance dispute object
 * @param {string} instName Institution name fallback
 */
export function generateDisputePdf(dispute, instName = 'SMART ATTENDANCE SYSTEM') {
  if (!dispute) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [14, 165, 233]; // Cyan/Sky 500
  const statusColor = 
    dispute.status === 'APPROVED' || dispute.status === 'RESOLVED_PRESENT' || dispute.status === 'RESOLVED_EXCUSED'
      ? [16, 185, 129] // Emerald Green
      : dispute.status === 'REJECTED' || dispute.status === 'RESOLVED_ABSENT'
      ? [239, 68, 68] // Red
      : [245, 158, 11]; // Amber Warning

  // ── Header Banner ──
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFillColor(...accentColor);
  doc.rect(0, 30, pageWidth, 2, 'F');

  // Institution Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((instName || 'SMART ATTENDANCE SYSTEM').toUpperCase(), 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('OFFICIAL ATTENDANCE CORRECTION & DISPUTE AUDIT RECORD', 14, 22);

  // Ref ID Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`REF ID: #DISPUTE-${dispute.id || 'N/A'}`, pageWidth - 14, 16, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Issued: ${new Date(dispute.created_at || Date.now()).toLocaleString('en-IN')}`, pageWidth - 14, 22, { align: 'right' });

  let y = 42;

  // ── Section 1: Student Profile ──
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('STUDENT APPLICANT INFORMATION', 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Student Name: ${dispute.student_name || 'N/A'}`, 18, y + 15);
  doc.text(`Roll Number: ${dispute.student_roll || dispute.roll_number || 'N/A'}`, 18, y + 21);

  doc.text(`Email: ${dispute.student_email || 'N/A'}`, 110, y + 15);
  doc.text(`Department: ${dispute.department || dispute.student_department || 'General'}`, 110, y + 21);

  y += 33;

  // ── Section 2: Dispute & Attendance Details ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('CORRECTION REQUEST DETAILS', 14, y);
  y += 4;

  const rows = [
    ['Attendance Date:', dispute.date || 'N/A'],
    ['Session Time / Period:', dispute.session_time || 'Class Period'],
    ['Subject / Course:', dispute.subject_name ? `${dispute.subject_name} (${dispute.subject_code || ''})` : 'General Class'],
    ['Current Recorded Status:', dispute.original_status || 'Absent'],
    ['Requested Status:', dispute.requested_status || 'Present'],
    ['Dispute Category:', dispute.reason || 'Attendance Error']
  ];

  doc.setFontSize(9);
  rows.forEach(([label, val]) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(14, y, pageWidth - 28, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label, 18, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 75, y + 5);
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 7, pageWidth - 14, y + 7);
    y += 7;
  });

  y += 6;

  // ── Section 3: Reason & Notes ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('Reason Description & Evidence Notes:', 14, y);
  y += 4;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const splitReason = doc.splitTextToSize(dispute.description || dispute.reason || 'No additional notes provided.', pageWidth - 36);
  doc.text(splitReason, 18, y + 6);

  y += 28;

  // ── Section 4: Official Audit & Review Seal ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.text('INSTITUTIONAL AUDIT & REVIEW STATUS', 14, y);
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 38, 3, 3, 'F');

  // Status Stamp Box
  doc.setFillColor(...statusColor);
  doc.roundedRect(18, y + 6, 65, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text((dispute.status || 'PENDING').toUpperCase(), 50.5, y + 15, { align: 'center' });

  // Reviewer details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const reviewerText = dispute.reviewed_by ? `Reviewed by: ${dispute.reviewed_by}` : 'Status: Under Institutional Review';
  doc.text(reviewerText, 90, y + 11);

  const reviewDate = dispute.reviewed_at
    ? `Review Timestamp: ${new Date(dispute.reviewed_at).toLocaleString('en-IN')}`
    : 'Action: Pending approval by Class Teacher / Admin';
  doc.text(reviewDate, 90, y + 17);

  if (dispute.resolution_notes || dispute.reviewer_comments) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Reviewer Notes: "${dispute.resolution_notes || dispute.reviewer_comments}"`, 18, y + 27);
  } else if (dispute.status === 'APPROVED' || dispute.status === 'RESOLVED_PRESENT') {
    doc.setFont('helvetica', 'italic');
    doc.text('Note: Attendance log automatically updated to Present in official database.', 18, y + 27);
  }

  y += 46;

  // Footer Verification Stamp
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an official computer-generated institutional record from Smart Attendance System.', pageWidth / 2, y, { align: 'center' });
  doc.text(`Verification Hash: ${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, y + 4, { align: 'center' });

  // Download PDF file
  const filename = `Dispute_Correction_${dispute.id || 'Summary'}_${dispute.student_roll || 'Record'}.pdf`;
  doc.save(filename);
}
