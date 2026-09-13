/**
 * Lightweight Bilingual Localization Dictionary (English & Hindi)
 * Designed for daily attendance operations, guidance messages, and role screens.
 */

export const translations = {
  en: {
    // Navigation & Roles
    app_title: 'Smart Attendance',
    home: 'Home',
    today: 'Today',
    scanner: 'Scanner',
    students: 'Students',
    teachers: 'Teachers',
    settings: 'Settings',
    control: 'Control',
    admin_pulse: 'Campus Pulse',
    teacher_hub: 'Classroom Command',
    student_portal: 'My Attendance',

    // Today & Session Workflow
    start_session: 'Start Attendance Session',
    pause_session: 'Pause Session',
    resume_session: 'Resume Session',
    end_session: 'End Session',
    session_live: 'Session Active',
    current_class: 'Current Class',
    upcoming_class: 'Next Upcoming Class',
    no_classes_today: 'No scheduled classes for today',
    session_summary: 'Session Wrap-up Summary',
    present_today: 'Present Today',
    absent_today: 'Absent Today',
    attendance_rate: 'Attendance Rate',
    total_enrolled: 'Total Enrolled',
    marked_present: 'Marked Present',
    absent_students: 'Absent Students',
    notify_absentees: 'Notify Absentees',
    notify_sent: 'Absent notification queued!',
    mark_manual: 'Mark Present',
    manual_entry: 'Manual Entry',

    // Scanner
    open_scanner: 'Open Face Scanner',
    searching_face: 'Position face in frame',
    face_locked: 'Face Locked • Hold Steady',
    verifying_liveness: 'Liveness Check • Blink Eyes',
    matching_face: 'Matching facial signature...',
    attendance_recorded: 'Attendance Recorded',
    already_marked: 'Already Marked Present',
    face_not_recognized: 'Face Not Recognized • Try Again',
    offline_queued: 'Saved Locally • Sync Pending',
    fallback_options: 'Having trouble? Use Manual Entry or QR Code',
    match_confidence: 'Match Confidence',

    // Offline & Sync
    synced_to_cloud: 'Synced to Cloud',
    saved_on_device: 'Saved on Device',
    sync_now: 'Sync Now',
    syncing: 'Syncing records...',
    all_synced: 'All records synced',
    offline_mode: 'Offline Mode (Local Storage Active)',
    pending_sync_count: '{count} records pending sync',
    unique_students_pending: '{students} student(s) · {records} record(s)',
    last_sync: 'Last synced at {time}',
    offline_guarantee: 'Internet unavailable. Attendance is safe on this device and will sync automatically.',
    online_sync_active: 'Internet Connected. Real-time cloud sync is active.',
    offline_storage_active: 'Internet unavailable. Attendance is safe on this device and will sync automatically once connected.',
    clear_queue: 'Clear Queue',
    clear_queue_confirm: 'Clear local pending attendance queue on this device?',
    queue_cleared: 'Local queue cleared.',

    // Student Dashboard
    my_attendance_rate: 'My Attendance Rate',
    today_status: "Today's Status",
    checked_in_at: 'Checked in at {time}',
    not_checked_in: 'Not Checked In Yet',
    request_correction: 'Request Correction',
    subject_wise: 'Subject-wise Attendance',
    safe_zone: 'Safe (Above 75%)',
    deficit_warning: 'Attendance Warning (Below 75%)',

    // Accessibility & Settings
    accessibility: 'Accessibility & Display',
    language: 'Language',
    large_text: 'Large Text',
    high_contrast: 'High Contrast Mode',
    reduced_motion: 'Reduced Motion',
    privacy_center: 'Privacy & Data Security',
    close: 'Close',
  },
  hi: {
    // Navigation & Roles
    app_title: 'स्मार्ट अटेंडेंस',
    home: 'होम',
    today: 'आज',
    scanner: 'स्कैनर',
    students: 'छात्र',
    teachers: 'शिक्षक',
    settings: 'सेटिंग्स',
    control: 'कंट्रोल',
    admin_pulse: 'कैंपस पल्स',
    teacher_hub: 'क्लासरूम कमांड',
    student_portal: 'मेरी उपस्थिति',

    // Today & Session Workflow
    start_session: 'अटेंडेंस सेशन शुरू करें',
    pause_session: 'सेशन रोकें',
    resume_session: 'सेशन जारी रखें',
    end_session: 'सेशन समाप्त करें',
    session_live: 'सेशन चालू है',
    current_class: 'वर्तमान क्लास',
    upcoming_class: 'अगली क्लास',
    no_classes_today: 'आज के लिए कोई क्लास शेड्यूल नहीं है',
    session_summary: 'सेशन सारांश रिपोर्ट',
    present_today: 'आज उपस्थित',
    absent_today: 'आज अनुपस्थित',
    attendance_rate: 'उपस्थिति प्रतिशत',
    total_enrolled: 'कुल नामांकित',
    marked_present: 'उपस्थित दर्ज',
    absent_students: 'अनुपस्थित छात्र',
    notify_absentees: 'अनुपस्थितों को अलर्ट भेजें',
    notify_sent: 'अलर्ट सफलतापूर्वक कतारबद्ध किया गया!',
    mark_manual: 'मैन्युअल उपस्थिति लगाएं',
    manual_entry: 'मैन्युअल एंट्री',

    // Scanner
    open_scanner: 'फेस स्कैनर खोलें',
    searching_face: 'चेहरा कैमरे के सामने लाएं',
    face_locked: 'चेहरा लॉक • स्थिर रहें',
    verifying_liveness: 'जीवंतता जांच • पलकें झपकाएं',
    matching_face: 'बायोमेट्रिक मिलान हो रहा है...',
    attendance_recorded: 'उपस्थिति दर्ज हो गई',
    already_marked: 'उपस्थिति पहले से दर्ज है',
    face_not_recognized: 'चेहरा नहीं पहचाना गया • पुनः प्रयास करें',
    offline_queued: 'डिवाइस में सुरक्षित • सिंक लंबित',
    fallback_options: 'समस्या आ रही है? मैन्युअल एंट्री या क्यूआर का उपयोग करें',
    match_confidence: 'मिलान सटीकता',

    // Offline & Sync
    synced_to_cloud: 'क्लाउड पर सिंक हो गया',
    saved_on_device: 'डिवाइस पर सुरक्षित',
    sync_now: 'अभी सिंक करें',
    syncing: 'सिंक हो रहा है...',
    all_synced: 'सभी रिकॉर्ड सिंक हैं',
    offline_mode: 'ऑफलाइन मोड (स्थानीय स्टोरेज सक्रिय)',
    pending_sync_count: '{count} रिकॉर्ड सिंक हेतु लंबित',
    unique_students_pending: '{students} छात्र · {records} रिकॉर्ड',
    last_sync: 'अंतिम सिंक: {time}',
    offline_guarantee: 'इंटरनेट उपलब्ध नहीं है। उपस्थिति इस डिवाइस में सुरक्षित है और ऑनलाइन आते ही सिंक हो जाएगी।',
    online_sync_active: 'इंटरनेट कनेक्टेड है। रियल-टाइम क्लाउड सिंक सक्रिय है।',
    offline_storage_active: 'इंटरनेट उपलब्ध नहीं है। उपस्थिति इस डिवाइस में सुरक्षित है और ऑनलाइन आते ही सिंक हो जाएगी।',
    clear_queue: 'क्यू साफ़ करें',
    clear_queue_confirm: 'क्या आप स्थानीय ऑफलाइन रिकॉर्ड्स हटाना चाहते हैं?',
    queue_cleared: 'ऑफलाइन क्यू साफ़ कर दिया गया है।',

    // Student Dashboard
    my_attendance_rate: 'मेरी उपस्थिति दर',
    today_status: 'आज की स्थिति',
    checked_in_at: '{time} बजे उपस्थिति दर्ज',
    not_checked_in: 'आज अभी तक दर्ज नहीं हुई',
    request_correction: 'सुधार का अनुरोध करें',
    subject_wise: 'विषयवार उपस्थिति',
    safe_zone: 'सुरक्षित (75% से अधिक)',
    deficit_warning: 'उपस्थिति चेतावनी (75% से कम)',

    // Accessibility & Settings
    accessibility: 'एक्सेसिबिलिटी और डिस्प्ले',
    language: 'भाषा',
    large_text: 'बड़ा टेक्स्ट (Large Text)',
    high_contrast: 'हाई कंट्रास्ट मोड',
    reduced_motion: 'कम मोशन (Reduced Motion)',
    privacy_center: 'गोपनीयता और डेटा सुरक्षा',
    close: 'बंद करें',
  },
};

export const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem('smart_attendance_lang') || 'en';
};

export const setStoredLanguage = (lang) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('smart_attendance_lang', lang);
  }
};

export const t = (key, lang = 'en', params = {}) => {
  const currentLang = translations[lang] ? lang : 'en';
  let str = translations[currentLang]?.[key] || translations['en']?.[key] || key;
  Object.keys(params).forEach((paramKey) => {
    str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
  });
  return str;
};
