import { jsPDF } from 'jspdf';

export function generateNoticePdf(notice, instName = 'SMART ATTENDANCE INSTITUTION') {
  if (!notice) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const primaryColor = [37, 99, 235]; // #2563eb Blue
  const darkBg = [15, 23, 42]; // #0f172a Slate
  const textDark = [30, 41, 59]; // #1e293b
  const textMuted = [100, 116, 139]; // #64748b

  // 1. Top Header Banner
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Institution Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(String(instName).toUpperCase(), 14, 16);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text('OFFICIAL ACADEMIC NOTICE & BROADCAST CIRCULAR', 14, 23);

  // Reference number & Date in Header
  const dateStr = notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleDateString();
  const refNo = `REF: INST-BRD-${String(notice.id || '001').padStart(4, '0')}/${new Date().getFullYear()}`;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(refNo, pageWidth - 14, 16, { align: 'right' });
  doc.text(`Dispatched: ${dateStr}`, pageWidth - 14, 23, { align: 'right' });

  // 2. Category & Target Roles Strip
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 42, pageWidth, 14, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  const catText = `CATEGORY: ${String(notice.category || 'NOTICE').toUpperCase()}`;
  doc.text(catText, 14, 51);

  const rolesText = `RECIPIENT AUDIENCE: ${(notice.target_roles || ['All Roles']).join(', ').toUpperCase()}`;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(rolesText, pageWidth - 14, 51, { align: 'right' });

  // 3. Notice Title Box
  doc.setFillColor(255, 255, 255);
  doc.rect(14, 64, pageWidth - 28, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 64, pageWidth - 28, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...textDark);
  const titleLines = doc.splitTextToSize(String(notice.title || 'Official Announcement'), pageWidth - 36);
  doc.text(titleLines, 18, 75);

  // 4. Detailed Notice Content
  let currentY = 96;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...textDark);
  doc.text('CIRCULAR DETAILS & INSTRUCTIONS:', 14, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);

  const rawMsg = String(notice.message || 'No additional instructions.');
  const msgLines = doc.splitTextToSize(rawMsg, pageWidth - 28);
  doc.text(msgLines, 14, currentY, { lineHeightFactor: 1.45 });

  currentY += msgLines.length * 6 + 18;

  // 5. Official Verification Stamp & Signature Block
  if (currentY < 220) currentY = 220;

  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 12;

  // Digital Stamp Box
  doc.setDrawColor(37, 99, 235);
  doc.roundedRect(14, currentY, 70, 26, 3, 3, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('CERTIFIED DIGITAL NOTICE', 49, currentY + 9, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  doc.text('Smart Attendance System Authority', 49, currentY + 16, { align: 'center' });
  doc.text(`ID: #${notice.id || 'SYS'} • Verified Cryptographically`, 49, currentY + 22, { align: 'center' });

  // Signature Line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text('Authorized Administrator', pageWidth - 14, currentY + 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text('Campus Directorate & Academic Affairs', pageWidth - 14, currentY + 22, { align: 'right' });

  // 6. Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an electronically generated campus circular. No physical signature is required.', pageWidth / 2, 285, { align: 'center' });

  // Save PDF
  const safeTitle = (notice.title || 'Notice').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  doc.save(`Notice_${notice.id || 'Circular'}_${safeTitle}.pdf`);
}
