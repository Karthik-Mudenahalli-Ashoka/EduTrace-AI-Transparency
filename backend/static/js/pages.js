/* ── Page Renderers ──────────────────────────────────── */

// ═══════════════════════════════════════════════════════
// AUTH PAGE
// ═══════════════════════════════════════════════════════
function renderAuthPage() {
  return `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div style="text-align:center;margin-bottom:20px">
          <div class="navbar-logo" style="width:48px;height:48px;font-size:1.2rem;margin:0 auto 12px">ET</div>
          <h1>EduTrace</h1>
          <p class="auth-subtitle">AI Usage Transparency Platform</p>
        </div>
        <div id="auth-error"></div>
        <div id="auth-form-container"></div>
      </div>
    </div>`;
}

let authMode = 'login';
let authRole = 'student';

function initAuthPage() {
  renderAuthForm();
}

function renderAuthForm() {
  const container = document.getElementById('auth-form-container');
  if (!container) return;

  if (authMode === 'login') {
    container.innerHTML = `
      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>Email</label>
          <input class="input" type="email" id="auth-email" placeholder="you@university.edu" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="input" type="password" id="auth-password" placeholder="••••••••" required>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%" type="submit">Sign In</button>
        <div class="auth-toggle">
          Don't have an account? <a onclick="switchAuthMode('register')">Register</a>
        </div>
      </form>`;
  } else {
    container.innerHTML = `
      <form onsubmit="handleRegister(event)">
        <div class="form-group">
          <label>Full Name</label>
          <input class="input" type="text" id="auth-name" placeholder="Your Name" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input class="input" type="email" id="auth-email" placeholder="you@university.edu" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input class="input" type="password" id="auth-password" placeholder="••••••••" required>
        </div>
        <div class="form-group">
          <label>Role</label>
          <div class="role-selector">
            <button type="button" class="role-btn ${authRole === 'student' ? 'active' : ''}" onclick="setAuthRole('student')">🎓 Student</button>
            <button type="button" class="role-btn ${authRole === 'professor' ? 'active' : ''}" onclick="setAuthRole('professor')">👨‍🏫 Professor</button>
          </div>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%" type="submit">Create Account</button>
        <div class="auth-toggle">
          Already have an account? <a onclick="switchAuthMode('login')">Sign In</a>
        </div>
      </form>`;
  }
}

function switchAuthMode(mode) {
  authMode = mode;
  document.getElementById('auth-error').innerHTML = '';
  renderAuthForm();
}

function setAuthRole(role) {
  authRole = role;
  renderAuthForm();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  try {
    const data = await api.login({ email, password });
    api.setToken(data.access_token);
    store.set('user', data.user);
    store.navigate('dashboard');
  } catch (err) {
    document.getElementById('auth-error').innerHTML = `<div class="auth-error">${err.message}</div>`;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('auth-name').value;
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  try {
    const data = await api.register({ name, email, password, role: authRole });
    api.setToken(data.access_token);
    store.set('user', data.user);
    store.navigate('dashboard');
  } catch (err) {
    document.getElementById('auth-error').innerHTML = `<div class="auth-error">${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════
function renderStudentDashboard() {
  return `
    ${renderNavbar()}
    <div class="app-container">
      <aside class="sidebar">
        <div class="sidebar-nav">
          <div class="sidebar-link active">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Dashboard
          </div>
          <div class="sidebar-link" onclick="store.navigate('enroll')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Enroll in Course
          </div>
        </div>
      </aside>
      <main class="main-content">
        <div class="container" style="padding:0;max-width:1400px">
          <div class="page-header">
            <h1>Dashboard</h1>
            <p>Welcome back! Select an assignment to continue your work.</p>
          </div>
          <div id="dashboard-content"><div class="loading-text"><span class="spinner"></span> Loading assignments...</div></div>
        </div>
      </main>
    </div>`;
}

async function initStudentDashboard() {
  try {
    const assignments = await api.getAssignments();
    const submissions = await api.getSubmissions();
    const subMap = {};
    submissions.forEach(s => subMap[s.assignment_id] = s);
    
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    if (assignments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No assignments yet</h3>
          <p>You'll see assignments here once your professor creates them and you're enrolled in their course.</p>
          <button class="btn btn-primary mt-md" onclick="store.navigate('enroll')">Enroll in a Course</button>
        </div>`;
    } else {
      container.innerHTML = `<div class="grid grid-2">${assignments.map(a => renderAssignmentCard(a, true, subMap[a.id])).join('')}</div>`;
    }
  } catch (err) {
    document.getElementById('dashboard-content').innerHTML = `<div class="auth-error">${err.message}</div>`;
  }
}

async function startAssignment(assignmentId) {
  try {
    const submission = await api.createSubmission(assignmentId);
    const assignment = await api.getAssignment(assignmentId);
    store.navigate('workspace', { currentSubmission: submission, currentAssignment: assignment });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════
// PROFESSOR DASHBOARD
// ═══════════════════════════════════════════════════════
function renderProfessorDashboard() {
  return `
    ${renderNavbar()}
    <div class="app-container">
      <aside class="sidebar">
        <div class="sidebar-nav">
          <div class="sidebar-link active" onclick="switchProfTab(this,'submissions')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Student Submissions
          </div>
          <div class="sidebar-link" onclick="switchProfTab(this,'assignments')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            My Assignments
          </div>
          <div class="sidebar-link" onclick="switchProfTab(this,'gradebook')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"></path></svg>
            Gradebook
          </div>
          <div class="sidebar-link" onclick="store.navigate('create-assignment')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            Create Assignment
          </div>
        </div>
      </aside>
      <main class="main-content">
        <div class="container" style="padding:0;max-width:1400px">
          <div class="page-header flex justify-between items-center">
            <div>
              <h1>Professor Dashboard</h1>
              <p>Review student submissions and AI usage reports</p>
            </div>
            <div class="flex gap-sm">
              <button class="btn btn-secondary" onclick="scanAllSubmissions()" id="scan-btn">🔍 Quick Scan Integrity</button>
              <button class="btn btn-primary" onclick="store.navigate('create-assignment')">+ New Assignment</button>
            </div>
          </div>
          <div id="prof-tab-content"><div class="loading-text"><span class="spinner"></span> Loading...</div></div>
        </div>
      </main>
    </div>`;
}

async function initProfessorDashboard() {
  await loadProfSubmissions();
}

function switchProfTab(el, tab) {
  document.querySelectorAll('.sidebar-link').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'submissions') loadProfSubmissions();
  else if (tab === 'assignments') loadProfAssignments();
  else if (tab === 'gradebook') loadGradebook();
}

async function loadProfSubmissions() {
  const container = document.getElementById('prof-tab-content');
  try {
    const submissions = await api.getSubmissions();
    if (submissions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No submissions yet</h3><p>Student submissions will appear here once they submit their work.</p></div>';
    } else {
      container.innerHTML = `<div class="grid grid-2">${submissions.map(s => renderSubmissionCard(s)).join('')}</div>`;
    }
  } catch (err) { container.innerHTML = `<div class="auth-error">${err.message}</div>`; }
}

async function scanAllSubmissions() {
  const btn = document.getElementById('scan-btn');
  if (!btn) return;
  btn.innerHTML = '<span class="spinner"></span> Scanning...';
  btn.disabled = true;
  
  const cards = document.querySelectorAll('.card');
  for (const card of cards) {
    const subId = card.getAttribute('onclick')?.match(/\\d+/)?.[0];
    if (!subId) continue;
    let header = card.querySelector('.integrity-badge-container');
    if (header && !header.innerHTML) {
      header.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span>';
    }
  }

  try {
    const submissions = await api.getSubmissions();
    for (const sub of submissions) {
      if (sub.status !== 'submitted') continue;
      
      const logs = await api.getKeystrokes(sub.id);
      let typed = 0; let pasted = 0;
      logs.forEach(l => {
        if (l.event_type === 'type') typed += l.char_count;
        if (l.event_type === 'paste') pasted += l.char_count;
      });
      const currentLength = sub.final_content ? sub.final_content.length : 0;
      let percentage = 0;
      if (currentLength > 0) {
        let effectiveTyped = Math.min(typed, currentLength);
        let effectivePasted = Math.max(0, currentLength - effectiveTyped);
        effectivePasted = Math.min(effectivePasted, pasted);
        const effectiveTotal = effectiveTyped + effectivePasted;
        if (effectiveTotal > 0) {
          percentage = Math.round((effectivePasted / effectiveTotal) * 100);
        }
      }
      
      const color = percentage >= 70 ? 'var(--danger)' : percentage >= 40 ? 'var(--warning)' : 'var(--success)';
      
      const card = Array.from(document.querySelectorAll('.card')).find(c => c.getAttribute('onclick') === `viewSubmission(${sub.id})`);
      if (card) {
        let header = card.querySelector('.integrity-badge-container');
        if (header) {
          header.innerHTML = `<span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${percentage}% AI</span>`;
        }
      }
    }
  } catch(e) { console.error(e); }
  
  btn.innerHTML = '🔍 Quick Scan Integrity';
  btn.disabled = false;
}

async function loadProfAssignments() {
  const container = document.getElementById('prof-tab-content');
  try {
    const assignments = await api.getAssignments();
    if (assignments.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No assignments created</h3><p>Create your first assignment to get started.</p></div>';
    } else {
      container.innerHTML = `<div class="grid grid-2">${assignments.map(a => renderAssignmentCard(a, false)).join('')}</div>`;
    }
  } catch (err) { container.innerHTML = `<div class="auth-error">${err.message}</div>`; }
}

async function handleDeleteAssignment(id) {
  if (!confirm('Are you sure you want to delete this assignment?')) return;
  try {
    await api.deleteAssignment(id);
    showToast('Assignment deleted', 'success');
    loadProfAssignments();
  } catch (err) { showToast(err.message, 'error'); }
}

async function loadGradebook() {
  const container = document.getElementById('prof-tab-content');
  container.innerHTML = '<div class="loading-text"><span class="spinner"></span> Loading Gradebook...</div>';
  try {
    const submissions = await api.getSubmissions();
    if (submissions.length === 0) {
      container.innerHTML = '<div class="empty-state"><h3>No student data yet</h3></div>';
      return;
    }
    
    const courses = {};
    submissions.forEach(s => {
      const c = s.course_name || 'Uncategorized';
      if (!courses[c]) courses[c] = [];
      courses[c].push(s);
    });

    let html = '';
    
    for (const [courseName, subs] of Object.entries(courses)) {
      html += `
        <div style="margin-bottom:32px" class="fade-in">
          <h3 style="margin-bottom:16px;color:var(--text-primary);display:flex;align-items:center;gap:8px">
            <svg width="24" height="24" fill="none" stroke="var(--accent)" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            ${courseName}
          </h3>
          <div class="card" style="padding:0;overflow:hidden;background:#fff">
            <table style="width:100%;border-collapse:collapse;text-align:left">
              <thead style="background:#f8f9ff;border-bottom:1px solid var(--border)">
                <tr>
                  <th style="padding:16px;font-size:0.85rem;color:var(--text-muted);text-transform:uppercase">Student</th>
                  <th style="padding:16px;font-size:0.85rem;color:var(--text-muted);text-transform:uppercase">Assignment</th>
                  <th style="padding:16px;font-size:0.85rem;color:var(--text-muted);text-transform:uppercase">Status</th>
                  <th style="padding:16px;font-size:0.85rem;color:var(--text-muted);text-transform:uppercase">Grade</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      subs.forEach(s => {
        const gradeStr = getGradeDisplay(s.grade);
        const statusBadge = s.status === 'submitted' ? '<span class="badge badge-primary">Submitted</span>' : 
                           s.status === 'reviewed' ? '<span class="badge badge-success">Graded</span>' : '<span class="badge badge-neutral">Draft</span>';
        
        html += `
          <tr style="border-bottom:1px solid var(--border)">
            <td style="padding:16px;font-weight:600;color:var(--text-primary)">${s.student_name}</td>
            <td style="padding:16px;color:var(--accent);font-weight:500">${s.assignment_title}</td>
            <td style="padding:16px">${statusBadge}</td>
            <td style="padding:16px">${gradeStr}</td>
          </tr>
        `;
      });
      
      html += `</tbody></table></div></div>`;
    }
    container.innerHTML = html;
  } catch(e) {
    container.innerHTML = `<div class="auth-error">${e.message}</div>`;
  }
}

async function viewSubmission(submissionId) {
  try {
    const submission = await api.getSubmission(submissionId);
    store.navigate('review', { currentSubmission: submission });
  } catch (err) { showToast(err.message, 'error'); }
}

// ═══════════════════════════════════════════════════════
// CREATE ASSIGNMENT PAGE
// ═══════════════════════════════════════════════════════
function renderCreateAssignment() {
  return `
    ${renderNavbar()}
    <div class="app-container">
      <aside class="sidebar">
        <div class="sidebar-nav">
          <div class="sidebar-link" onclick="store.navigate('dashboard')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </div>
        </div>
      </aside>
      <main class="main-content">
        <div class="container" style="padding:0;max-width:800px">
          <div class="page-header">
            <h1>Create Assignment</h1>
            <p>Set up a new assignment for your students</p>
          </div>
          <div class="card">
            <form onsubmit="handleCreateAssignment(event)">
              <div class="form-group">
                <label>Title</label>
                <input class="input" id="ca-title" placeholder="Assignment title" required>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea class="input" id="ca-desc" rows="4" placeholder="Describe the assignment..."></textarea>
              </div>
              <div class="form-group">
                <label>Type</label>
                <select class="select" id="ca-type">
                  <option value="python">Python (Code)</option>
                  <option value="document">Document (Report)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Course Name</label>
                <input class="input" id="ca-course" placeholder="CS 301 - Data Structures" required>
              </div>
              <div class="form-group">
                <label>Due Date (Optional)</label>
                <input class="input" type="datetime-local" id="ca-due">
              </div>
              <div class="flex gap-sm" style="margin-top:32px">
                <button class="btn btn-secondary" type="button" onclick="store.navigate('dashboard')">Cancel</button>
                <button class="btn btn-primary" type="submit">Create Assignment</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>`;
}

async function handleCreateAssignment(e) {
  e.preventDefault();
  try {
    const due = document.getElementById('ca-due').value;
    await api.createAssignment({
      title: document.getElementById('ca-title').value,
      description: document.getElementById('ca-desc').value,
      type: document.getElementById('ca-type').value,
      course_name: document.getElementById('ca-course').value,
      due_date: due ? new Date(due).toISOString() : null,
    });
    showToast('Assignment created!', 'success');
    store.navigate('dashboard');
  } catch (err) { showToast(err.message, 'error'); }
}

// ═══════════════════════════════════════════════════════
// ENROLL PAGE
// ═══════════════════════════════════════════════════════
function renderEnrollPage() {
  return `
    ${renderNavbar()}
    <div class="app-container">
      <aside class="sidebar">
        <div class="sidebar-nav">
          <div class="sidebar-link" onclick="store.navigate('dashboard')">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </div>
        </div>
      </aside>
      <main class="main-content">
        <div class="container" style="padding:0;max-width:800px">
          <div class="page-header">
            <h1>Enroll in a Course</h1>
            <p>Select a professor and enter the course name to join their class</p>
          </div>
          <div class="card">
            <form onsubmit="handleEnroll(event)">
              <div class="form-group">
                <label>Professor</label>
                <select class="select" id="enroll-prof" required><option value="">Loading...</option></select>
              </div>
              <div class="form-group">
                <label>Course Name</label>
                <input class="input" id="enroll-course" placeholder="CS 301 - Data Structures" required>
              </div>
              <div class="flex gap-sm" style="margin-top:32px">
                <button class="btn btn-secondary" type="button" onclick="store.navigate('dashboard')">Cancel</button>
                <button class="btn btn-primary" type="submit">Enroll</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>`;
}

async function initEnrollPage() {
  try {
    const professors = await api.getProfessors();
    const select = document.getElementById('enroll-prof');
    if (!select) return;
    select.innerHTML = '<option value="">Select a professor</option>' +
      professors.map(p => `<option value="${p.id}">${p.name} (${p.email})</option>`).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleEnroll(e) {
  e.preventDefault();
  try {
    await api.enroll({
      professor_id: parseInt(document.getElementById('enroll-prof').value),
      course_name: document.getElementById('enroll-course').value,
    });
    showToast('Enrolled successfully!', 'success');
    store.navigate('dashboard');
  } catch (err) { showToast(err.message, 'error'); }
}
