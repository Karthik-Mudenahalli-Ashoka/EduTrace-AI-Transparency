/* ── Reusable UI Components ──────────────────────────── */

function getGradeDisplay(grade) {
  if (grade === null || grade === undefined) return '<span style="color:var(--text-muted)">-</span>';
  if (grade === -1) return '<span class="badge badge-neutral">Optional</span>';
  let letter = 'F';
  if (grade >= 90) letter = 'A';
  else if (grade >= 80) letter = 'B';
  else if (grade >= 70) letter = 'C';
  else if (grade >= 60) letter = 'D';
  
  let color = 'var(--danger)';
  if (grade >= 80) color = 'var(--success)';
  else if (grade >= 70) color = 'var(--warning)';
  
  return `<span style="font-weight:700;color:${color}">${letter} (${grade}%)</span>`;
}

function renderNavbar() {
  const user = store.get('user');
  if (!user) return '';
  return `
    <nav class="navbar">
      <div class="navbar-brand" style="cursor:pointer" onclick="store.navigate('dashboard')">
        <div class="navbar-logo">ET</div>
        <span>EduTrace</span>
      </div>
      </div>
      <div class="navbar-actions">
        <div class="navbar-user">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem">${user.name.charAt(0)}</div>
          <div style="display:flex;flex-direction:column;gap:0;">
            <span style="font-weight:600;font-size:0.85rem">${user.name}</span>
            <span class="navbar-role" style="font-size:0.65rem">${user.role}</span>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="store.logout()">Sign Out</button>
      </div>
    </nav>`;
}

function renderAssignmentCard(a, isStudent, submission = null) {
  const typeIcon = a.type === 'python' ? '🐍' : '📄';
  const typeBadge = a.type === 'python'
    ? '<span class="badge badge-primary">Python</span>'
    : '<span class="badge badge-warning">Document</span>';
  const due = a.due_date ? parseUTCDate(a.due_date).toLocaleDateString('en-US', { timeZone: 'America/New_York' }) : 'No deadline';

  let statusBadge = '';
  let gradeHtml = '';
  if (isStudent && submission) {
    if (submission.status === 'submitted') statusBadge = '<span class="badge badge-primary" style="margin-left:8px">Submitted</span>';
    else if (submission.status === 'reviewed') {
      statusBadge = '<span class="badge badge-success" style="margin-left:8px">Graded</span>';
      gradeHtml = `<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.85rem;color:var(--text-secondary)">Final Grade:</span>
        ${getGradeDisplay(submission.grade)}
      </div>`;
    } else {
      statusBadge = '<span class="badge badge-neutral" style="margin-left:8px">Draft</span>';
    }
  }

  const action = isStudent
    ? `<button class="btn btn-primary btn-sm" onclick="startAssignment(${a.id})">Open Workspace</button>`
    : `<button class="btn btn-danger btn-sm" onclick="handleDeleteAssignment(${a.id})">Delete</button>`;

  return `
    <div class="card card-hover fade-in">
      <div class="card-header">
        <span style="font-size:1.5rem">${typeIcon}</span>
        <div>${typeBadge}${statusBadge}</div>
      </div>
      <h3 class="card-title">${a.title}</h3>
      <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:16px;min-height:40px">${a.description || 'No description'}</p>
      <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">
        <div>👨‍🏫 ${a.professor_name}</div>
        <div>📚 ${a.course_name}</div>
        <div>📅 Due: ${due}</div>
      </div>
      <div style="display:flex;justify-content:flex-end">
        ${action}
      </div>
      ${gradeHtml}
    </div>`;
}

function renderSubmissionCard(s) {
  const statusBadge = {
    draft: '<span class="badge badge-neutral">Draft</span>',
    submitted: '<span class="badge badge-primary">Submitted</span>',
    reviewed: '<span class="badge badge-success">Reviewed</span>',
  }[s.status] || '';

  const typeBadge = s.assignment_type === 'python'
    ? '<span class="badge badge-primary" style="margin-left:6px">Python</span>'
    : '<span class="badge badge-warning" style="margin-left:6px">Document</span>';

  const submitted = s.submitted_at ? parseUTCDate(s.submitted_at).toLocaleString('en-US', { timeZone: 'America/New_York' }) : 'Not yet';

  return `
    <div class="card card-hover fade-in" style="cursor:pointer" onclick="viewSubmission(${s.id})">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>${statusBadge}${typeBadge}</div>
        <div class="integrity-badge-container"></div>
      </div>
      <h3 class="card-title" style="margin-bottom:6px">${s.assignment_title || 'Assignment'}</h3>
      <div style="font-size:.85rem;color:var(--text-secondary)">
        <div>👤 ${s.student_name}</div>
        <div>📚 ${s.course_name || ''}</div>
        <div>📅 Submitted: ${submitted}</div>
      </div>
    </div>`;
}

function renderModal(title, message, actions) {
  return `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal fade-in" onclick="event.stopPropagation()">
        <h2>${title}</h2>
        <p>${message}</p>
        <div class="modal-actions">${actions}</div>
      </div>
    </div>`;
}

function closeModal(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.remove();
  }
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:8px;font-size:.85rem;font-weight:600;z-index:9999;animation:fadeIn .3s ease-out;color:#fff;background:${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--accent)'}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}
