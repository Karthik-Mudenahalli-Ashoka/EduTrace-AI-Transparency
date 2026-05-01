/* ── API Client for EduTrace ─────────────────────────── */
const API_BASE = '/api';

const api = {
  token: localStorage.getItem('edutrace_token') || null,

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('edutrace_token', token);
    else localStorage.removeItem('edutrace_token');
  },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    console.log(`[API] ${method} ${path} token=${this.token ? 'yes(' + this.token.substring(0,20) + '...)' : 'no'}`);
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    console.log(`[API] ${method} ${path} → ${res.status}`);
    if (res.status === 401 && !path.includes('/auth/')) {
      // Only clear auth for non-auth endpoints
      console.warn('[API] 401 on authenticated request, clearing session');
      this.setToken(null);
      localStorage.removeItem('edutrace_user');
      // Don't reload - let the caller handle it
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  delete(path) { return this.request('DELETE', path); },

  // Auth
  register(data) { return this.post('/auth/register', data); },
  login(data) { return this.post('/auth/login', data); },
  getMe() { return this.get('/auth/me'); },
  getProfessors() { return this.get('/auth/professors'); },
  getStudents() { return this.get('/auth/students'); },

  // Enrollments
  enroll(data) { return this.post('/enrollments', data); },
  getEnrollments() { return this.get('/enrollments'); },

  // Assignments
  createAssignment(data) { return this.post('/assignments', data); },
  getAssignments() { return this.get('/assignments'); },
  getAssignment(id) { return this.get(`/assignments/${id}`); },
  deleteAssignment(id) { return this.delete(`/assignments/${id}`); },

  // Submissions
  createSubmission(assignmentId) { return this.post('/submissions', { assignment_id: assignmentId }); },
  getSubmissions() { return this.get('/submissions'); },
  getSubmission(id) { return this.get(`/submissions/${id}`); },
  updateSubmission(id, data) { return this.patch(`/submissions/${id}`, data); },

  // Keystroke logs
  logKeystrokes(logs) { return this.post('/keystrokes', { logs }); },
  getKeystrokes(submissionId) { return this.get(`/keystrokes/${submissionId}`); },

  // AI
  aiChat(data) { return this.post('/ai/chat', data); },
  getAIInteractions(submissionId) { return this.get(`/ai/interactions/${submissionId}`); },
  generateSummary(submissionId, apiKey) { return this.post(`/ai/summary/${submissionId}`, { api_key: apiKey }); },
  getSummary(submissionId) { return this.get(`/ai/summary/${submissionId}`); },
  summaryChat(data) { return this.post('/ai/summary-chat', data); },
  getSummaryChatHistory(summaryId) { return this.get(`/ai/summary-chat/${summaryId}`); },
  runExternalScan(id, apiKey) { return this.post(`/ai/external-scan/${id}`, { api_key: apiKey }); },

  // Code execution
  executeCode(code) { return this.post('/execute', { code }); },
};
