/* =====================================================================
   English terms for the exported yearbook (PDF, PNG, DOCX).
   Edit the display text only; keep the codes on the left (undergrad, master, ...).
   ===================================================================== */
window.KY_TERMS = window.KY_TERMS || {};
window.KY_TERMS.en = {
  langName: 'English',
  roles: {
    undergrad: 'Undergraduate student',
    master: "Master's student",
    phd: 'PhD student',
    postdoc: 'Postdoctoral researcher',
    researcher: 'Researcher',
    lecturer: 'Lecturer',
    assoc_prof: 'Associate Professor',
    prof: 'Professor',
    staff: 'Staff',
    visiting: 'Visiting member',
    other: 'Other',
  },
  reasons: {
    graduated: 'Graduated',
    transferred: 'Moved to another lab',
    contract_end: 'End of contract',
    other: 'Other',
  },
  contacts: { email: 'Email', phone: 'Phone', address: 'Address', custom: 'Other contact' },
  labels: {
    born: 'Born',
    hometown: 'Hometown',
    period: 'Period',
    role: 'Role',
    research: 'Research',
    workplace: 'Current position',
    since: 'since',
    updated: 'updated',
    address: 'Address',
    family: 'Family',
    note: 'Notes',
    present: 'present',
    reason: 'Reason for leaving',
    members: 'members',
    page: 'Page',
  },
  formatDate(dt, mode) {
    const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (mode === 'year') return dt.y ? String(dt.y) : '';
    if (mode === 'daymonth') return dt.d && dt.m ? `${M[dt.m - 1]} ${dt.d}` : '';
    if (dt.d && dt.m) return `${M[dt.m - 1]} ${dt.d}, ${dt.y}`;
    return dt.y ? String(dt.y) : '';
  },
  defaults: {
    header: '<b>{lab}</b><br><small>{unit}</small>',
    footer: '{page}',
    coverSub: 'Member yearbook',
  },
};
