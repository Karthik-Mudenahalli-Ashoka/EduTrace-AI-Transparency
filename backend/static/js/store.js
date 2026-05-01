/* ── Simple State Store ──────────────────────────────── */
const store = {
  _state: {
    user: JSON.parse(localStorage.getItem('edutrace_user') || 'null'),
    currentPage: 'dashboard',
    currentSubmission: null,
    currentAssignment: null,
  },
  _listeners: [],

  get(key) { return this._state[key]; },

  set(key, value) {
    this._state[key] = value;
    if (key === 'user') {
      if (value) localStorage.setItem('edutrace_user', JSON.stringify(value));
      else localStorage.removeItem('edutrace_user');
    }
    this._notify();
  },

  subscribe(fn) { this._listeners.push(fn); },
  _notify() { this._listeners.forEach(fn => fn(this._state)); },

  isLoggedIn() { return !!this._state.user && !!api.token; },
  isStudent() { return this._state.user?.role === 'student'; },
  isProfessor() { return this._state.user?.role === 'professor'; },

  navigate(page, data = {}) {
    Object.entries(data).forEach(([k, v]) => { this._state[k] = v; });
    this._state.currentPage = page;
    this._notify();
  },

  logout() {
    api.setToken(null);
    this.set('user', null);
    this._state.currentPage = 'auth';
    this._notify();
  }
};
