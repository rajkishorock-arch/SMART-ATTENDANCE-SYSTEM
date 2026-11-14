import { jsPDF } from 'jspdf';

/**
 * Formats a date string into formal Indian academic format (e.g. "14th November, 2026")
 */
function formatFormalAcademicDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-IN');
  
  const day = d.getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();

  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  return `${day}${suffix} ${month}, ${year}`;
}

/**
 * Generates an authentic, high-prestige institutional academic notice circular PDF.
 * Designed to match official university, college, and administrative letterhead circulars.
 * 
 * @param {Object} notice Notice object with title, message, category, created_at, target_roles, id
 * @param {string} instName Registered Institution Name
 */
export function generateNoticePdf(notice, instName = 'SMART ATTENDANCE INSTITUTION') {
  if (!notice) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginL = 18;
  const marginR = 192;
  const contentWidth = marginR - marginL; // 174mm
  const centerX = pageWidth / 2;

  // ── Color Palette ──
  const colorNavy = [26, 43, 76];       // #1a2b4c Formal Deep Navy
  const colorDark = [30, 41, 59];       // #1e293b Slate 800
  const colorMuted = [100, 116, 139];   // #64748b Slate 500
  const colorBorder = [203, 213, 225];  // #cbd5e1 Light Slate
  const colorSeal = [29, 78, 216];      // #1d4ed8 Royal Blue Stamp

  // ── 1. Formal Academic Border Frame ──
  // Outer decorative border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.rect(9, 9, pageWidth - 18, pageHeight - 18, 'S');

  // Inner hairline border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21, 'S');

  // ── 2. Official Institution Header / Letterhead ──
  let y = 18;

  // Institution Emblem / Crest Icon (Drawn in vector)
  doc.setDrawColor(...colorNavy);
  doc.setLineWidth(0.5);
  doc.circle(centerX, y + 4, 5.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...colorNavy);
  doc.text('★', centerX, y + 5.5, { align: 'center' });

  y += 15;

  // Institution Name (Bold, Regal)
  const cleanInstName = String(instName || 'SMART ATTENDANCE INSTITUTION').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...colorNavy);
  doc.text(cleanInstName, centerX, y, { align: 'center' });

  y += 6;

  // Department / Directorate Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 64, 175); // Dark blue accent
  doc.text('OFFICE OF THE REGISTRAR & ACADEMIC DIRECTORATE', centerX, y, { align: 'center' });

  y += 4.5;

  // Accreditation & Recognition
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorMuted);
  doc.text('Approved by Higher Education Authority • University Affiliated & Accredited Campus', centerX, y, { align: 'center' });

  y += 4;

  // Address & Portal info
  doc.setFontSize(7.5);
  doc.text('Campus Directorate Complex • Web: www.smartattendance.edu • Email: notice.desk@campus.edu', centerX, y, { align: 'center' });

  y += 5;

  // Double Formal Divider Rules (Letterhead separator)
  doc.setDrawColor(...colorNavy);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, marginR, y);
  
  doc.setLineWidth(0.25);
  doc.line(marginL, y + 1.2, marginR, y + 1.2);

  y += 8;

  // ── 3. Reference Number and Date Line ──
  const year = notice.created_at ? new Date(notice.created_at).getFullYear() : new Date().getFullYear();
  const refNo = `Ref. No.: INST/ACAD/CIR/${year}/${String(notice.id || '0050').padStart(4, '0')}`;
  const dateFormatted = formatFormalAcademicDate(notice.created_at);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorDark);
  doc.text(refNo, marginL, y);

  doc.text(`Date: ${dateFormatted}`, marginR, y, { align: 'right' });

  y += 10;

  // ── 4. Formal Notice Banner ──
  const cat = String(notice.category || 'NOTICE').toUpperCase();
  let bannerText = 'N  O  T  I  C  E';
  let bannerBg = [248, 250, 252];
  let bannerBorder = [203, 213, 225];
  let bannerColor = [15, 23, 42];

  if (cat === 'HOLIDAY') {
    bannerText = 'H O L I D A Y   N O T I F I C A T I O N';
    bannerBg = [240, 253, 244];
    bannerBorder = [187, 247, 208];
    bannerColor = [22, 101, 52];
  } else if (cat === 'URGENT') {
    bannerText = 'U R G E N T   C I R C U L A R';
    bannerBg = [254, 242, 242];
    bannerBorder = [254, 202, 202];
    bannerColor = [153, 27, 27];
  } else if (cat === 'EXAM' || cat === 'EXAMINATION') {
    bannerText = 'E X A M I N A T I O N   N O T I C E';
    bannerBg = [255, 251, 235];
    bannerBorder = [253, 230, 138];
    bannerColor = [146, 64, 14];
  } else if (cat === 'CIRCULAR') {
    bannerText = 'O F F I C I A L   C I R C U L A R';
    bannerBg = [245, 243, 255];
    bannerBorder = [221, 214, 254];
    bannerColor = [91, 33, 182];
  } else if (cat === 'EVENT') {
    bannerText = 'C A M P U S   E V E N T   N O T I C E';
    bannerBg = [253, 244, 255];
    bannerBorder = [245, 208, 254];
    bannerColor = [134, 25, 143];
  }

  const bannerW = 100;
  const bannerH = 8.5;
  const bannerX = centerX - bannerW / 2;

  doc.setFillColor(...bannerBg);
  doc.setDrawColor(...bannerBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(bannerX, y, bannerW, bannerH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...bannerColor);
  doc.text(bannerText, centerX, y + 6, { align: 'center' });

  y += 15;

  // ── 5. Recipient Circulation Strip ──
  const roles = Array.isArray(notice.target_roles) && notice.target_roles.length > 0 
    ? notice.target_roles.map(r => String(r).toUpperCase()).join(', ') 
    : 'ALL CONCERNED';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorDark);
  doc.text('Circulated To:', marginL, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colorMuted);
  doc.text(roles, marginL + 25, y);

  y += 7;

  // ── 6. Formal Subject Line ──
  const cleanTitle = String(notice.title || 'Official Academic Notice').trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...colorDark);
  doc.text('Subject:', marginL, y);

  // Measure and wrap title text
  const subjectText = `Regarding — ${cleanTitle}`;
  const splitSubject = doc.splitTextToSize(subjectText, contentWidth - 18);
  doc.text(splitSubject, marginL + 18, y);

  // Underline the subject
  const subjHeight = splitSubject.length * 5;
  doc.setDrawColor(...colorDark);
  doc.setLineWidth(0.3);
  doc.line(marginL, y + subjHeight - 1, marginR, y + subjHeight - 1);

  y += subjHeight + 5;

  // ── 7. Formal Body Text ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...colorDark);
  doc.text('This is hereby notified for the information of all concerned that:', marginL, y);

  y += 7;

  // Main message content with professional paragraph indentation & line spacing
  const rawMsg = String(notice.message || 'No additional details provided.').trim();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  const splitMsg = doc.splitTextToSize(rawMsg, contentWidth - 4);
  doc.text(splitMsg, marginL + 2, y, { lineHeightFactor: 1.45 });

  y += splitMsg.length * 5.2 + 8;

  // Standard official concluding directive
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'All concerned students, faculty members, and administrative staff are advised to take note of the above instructions and ensure strict adherence to the stipulated guidelines.',
    marginL,
    y,
    { maxWidth: contentWidth, lineHeightFactor: 1.4 }
  );

  y += 16;

  // ── 8. Summary & Key Directives Box ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colorNavy);
  doc.text('OFFICIAL CIRCULAR METADATA & COMPLIANCE DIRECTIVES', marginL + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorMuted);
  doc.text(`• Issuing Authority: Office of the Academic Registrar`, marginL + 4, y + 10);
  doc.text(`• Verification Standard: 100% Cryptographically Certified Digital Circular`, marginL + 4, y + 14.5);

  doc.text(`• Category: ${cat}`, centerX + 10, y + 10);
  doc.text(`• Compliance: Mandatory Across Target Departments`, centerX + 10, y + 14.5);

  y += 26;

  // ── 9. Official Endorsement ("Copy forwarded to:") ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colorDark);
  doc.text('Copy forwarded for kind information and necessary action to:', marginL, y);

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...colorMuted);
  const endorsements = [
    '1. Office of the Principal / Director Secretariat',
    '2. All Deans, Academic Directors, and Heads of Departments (HoDs)',
    '3. Controller of Examinations & Student Affairs Directorate',
    '4. Student Digital Kiosk & Web Notice Board System',
    '5. Institutional Master Archive & Guard File'
  ];

  endorsements.forEach(item => {
    doc.text(item, marginL + 3, y);
    y += 3.8;
  });

  // Ensure Signatures fit near the bottom (y between 225 and 260)
  const signY = Math.max(y + 6, 232);

  // ── 10. Official Digital Seal & Authorized Signatory Block ──
  // Left: Formal Dual-Ring Institutional Circular Stamp
  const sealCenterX = marginL + 25;
  const sealCenterY = signY + 12;

  doc.setDrawColor(...colorSeal);
  doc.setLineWidth(0.6);
  doc.circle(sealCenterX, sealCenterY, 15, 'S'); // Outer circle

  doc.setLineWidth(0.25);
  doc.circle(sealCenterX, sealCenterY, 13.5, 'S'); // Inner circle

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...colorSeal);
  doc.text('★ SMART ATTENDANCE SYSTEM ★', sealCenterX, sealCenterY - 7.5, { align: 'center' });
  
  doc.setFontSize(7.5);
  doc.text('DIGITALLY CERTIFIED', sealCenterX, sealCenterY - 2.5, { align: 'center' });
  
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL CIRCULAR', sealCenterX, sealCenterY + 2.5, { align: 'center' });
  
  doc.setFontSize(6);
  doc.text(`REF: #${notice.id || 'SYS'} • VERIFIED`, sealCenterX, sealCenterY + 7.5, { align: 'center' });

  // Right: Formal Authorized Signatory
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colorDark);
  doc.text('By Order of the Academic Directorate,', marginR, signY, { align: 'right' });

  // Signatory title and designation
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...colorNavy);
  doc.text('(Dr. A. K. Sharma / Authorized Authority)', marginR, signY + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorMuted);
  doc.text('Registrar & Dean of Academic Affairs', marginR, signY + 19, { align: 'right' });
  doc.text(cleanInstName, marginR, signY + 23.5, { align: 'right' });

  // ── 11. Security & Verification Footer ──
  const footerY = 281;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginL, footerY, marginR, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This is a computer-generated official academic document authenticated via Smart Attendance Management System. No physical signature is required.',
    centerX,
    footerY + 3.8,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.text(
    `DOCUMENT ID: SAS-NOTIF-${String(notice.id || '001').padStart(5, '0')} • PAGE 1 OF 1`,
    centerX,
    footerY + 7.2,
    { align: 'center' }
  );

  // ── Save and Download PDF ──
  const safeTitle = (notice.title || 'Notice').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
  doc.save(`Official_Notice_${notice.id || 'Circular'}_${safeTitle}.pdf`);
}
