/* ── EduTrace Application Entry Point ────────────────── */

let monacoEditor = null;
let quillEditor = null;
let keystrokeBuffer = [];
let snapshotInterval = null;
let flushInterval = null;
let blurTime = 0;

window.addEventListener('blur', () => {
  if (store.get('currentPage') !== 'workspace') return;
  blurTime = Date.now();
  try {
    keystrokeBuffer.push({
      submission_id: store.get('currentSubmission').id,
      event_type: 'tab_leave',
      content_delta: 'User switched tabs or minimized window',
      char_count: 0
    });
  } catch(e) {}
});

window.addEventListener('focus', () => {
  if (store.get('currentPage') !== 'workspace') return;
  if (blurTime > 0) {
    const awaySeconds = Math.round((Date.now() - blurTime) / 1000);
    try {
      keystrokeBuffer.push({
        submission_id: store.get('currentSubmission').id,
        event_type: 'tab_enter',
        content_delta: `User returned after ${awaySeconds} seconds`,
        char_count: awaySeconds
      });
    } catch(e) {}
    blurTime = 0;
  }
});

// ═══════════════════════════════════════════════════════
// WORKSPACE PAGE (Student IDE / Document Editor + AI Panel)
// ═══════════════════════════════════════════════════════
function renderWorkspace() {
  const sub = store.get('currentSubmission');
  const asgn = store.get('currentAssignment');
  if (!sub || !asgn) { store.navigate('dashboard'); return ''; }

  const isCode = asgn.type === 'python';
  const isSubmitted = sub.status === 'submitted' || sub.status === 'reviewed';
  const isReviewed = sub.status === 'reviewed';

  let statusBadge = '<span class="badge badge-neutral" style="margin-left:8px">Draft</span>';
  if (sub.status === 'submitted') statusBadge = '<span class="badge badge-primary" style="margin-left:8px">Submitted</span>';
  if (isReviewed) statusBadge = '<span class="badge badge-success" style="margin-left:8px">Graded</span>';

  return `
    ${renderNavbar()}
    <div class="workspace">
      <div class="workspace-editor">
        <div class="editor-toolbar">
          <div class="editor-toolbar-title">
            ${isCode ? '🐍' : '📄'} ${asgn.title} ${statusBadge}
            ${isReviewed && sub.grade !== null ? `<span style="margin-left:12px">${getGradeDisplay(sub.grade)}</span>` : ''}
          </div>
          <div class="flex gap-sm">
            ${isCode ? '<button class="btn btn-success btn-sm" onclick="runCode()">▶ Run</button>' : ''}
            ${!isSubmitted ? '<button class="btn btn-secondary btn-sm" onclick="checkAI()">🔍 Check AI %</button>' : ''}
            ${!isSubmitted ? '<button class="btn btn-secondary btn-sm" onclick="saveWork()">💾 Save</button>' : ''}
            ${!isSubmitted ? '<button class="btn btn-primary btn-sm" onclick="submitWork()">📤 Submit</button>' : ''}
            <button class="btn btn-ghost btn-sm" onclick="store.navigate('dashboard')">← Back</button>
          </div>
        </div>
        ${isReviewed && sub.feedback ? `
        <div style="padding:12px 16px;background:rgba(14, 165, 233, 0.1);border-bottom:1px solid rgba(14, 165, 233, 0.2)">
          <strong style="color:var(--accent);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px">Professor Feedback:</strong>
          <p style="margin:4px 0 0 0;font-size:0.95rem">${escapeHtml(sub.feedback)}</p>
        </div>` : ''}
        ${isReviewed ? `
        <div id="student-ai-report" style="padding:16px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border)">
          <div class="loading-text"><span class="spinner"></span> Loading AI Integrity Report...</div>
        </div>` : ''}
        <div class="editor-container" id="editor-container"></div>
        ${isCode ? `
        <div class="terminal-panel">
          <div class="terminal-header">
            <span>Terminal Output</span>
            <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:.7rem" onclick="document.getElementById('terminal-out').textContent=''">Clear</button>
          </div>
          <div class="terminal-output" id="terminal-out">Ready to run code...</div>
        </div>` : ''}
      </div>
      <div class="workspace-sidebar">
        <div class="ai-panel">
          <div class="ai-panel-header">
            <h3>🤖 AI Learning Assistant</h3>
            <div class="ai-config">
              <select class="select" id="ai-provider" style="flex:1">
                <option value="gemini">Gemini (API key: AIza...)</option>
                <option value="openai">OpenAI (API key: sk-...)</option>
                <option value="anthropic">Anthropic (API key: sk-ant-...)</option>
                <option value="openrouter">OpenRouter (API key: sk-or-...)</option>
              </select>
            </div>
            <div class="api-key-input">
              <input class="input" id="ai-api-key" type="password" placeholder="Enter your API key..." style="font-size:.78rem">
            </div>
          </div>
          <div class="ai-messages" id="ai-messages">
            <div class="ai-empty">
              <div class="ai-empty-icon">💡</div>
              <h4>Learning Assistant</h4>
              <p>Ask questions to understand concepts. The AI will guide you without giving direct answers.</p>
            </div>
          </div>
          <div class="ai-input-area">
            <form class="ai-input-row" onsubmit="sendAIMessage(event)">
              <input class="input" id="ai-input" placeholder="Ask a question..." ${isSubmitted ? 'disabled' : ''}>
              <button class="btn btn-primary btn-sm" type="submit" ${isSubmitted ? 'disabled' : ''}>Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>`;
}

function initWorkspace() {
  const sub = store.get('currentSubmission');
  const asgn = store.get('currentAssignment');
  if (!sub || !asgn) return;

  const isCode = asgn.type === 'python';
  const readOnly = sub.status === 'submitted' || sub.status === 'reviewed';

  if (isCode) {
    initMonacoEditor(sub.final_content || '# Start coding here\n', readOnly);
  } else {
    initQuillEditor(sub.final_content || '', readOnly);
  }

  // Load existing AI interactions
  loadAIHistory(sub.id);

  if (readOnly && sub.status === 'reviewed') {
    api.getSummary(sub.id).then(summary => {
      const el = document.getElementById('student-ai-report');
      if (!el) return;
      if (!summary) {
        el.style.display = 'none';
        return;
      }
      
      let levelBadge = '';
      if (summary.risk_level === 'high') levelBadge = '<span class="badge badge-danger">High Risk</span>';
      else if (summary.risk_level === 'medium') levelBadge = '<span class="badge badge-warning">Medium Risk</span>';
      else levelBadge = '<span class="badge badge-success">Low Risk</span>';
      
      el.innerHTML = `
        <strong style="color:var(--text-primary);font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:8px;margin-bottom:12px">
          🤖 Final AI Integrity Analysis ${levelBadge}
        </strong>
        <div style="font-size:0.9rem;line-height:1.6;color:var(--text-secondary)" class="summary-content">
          ${renderMarkdown(summary.gemini_summary)}
        </div>
        
        <strong style="color:var(--text-primary);font-size:0.9rem;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:8px;margin-top:24px;margin-bottom:12px">
          🌐 External Detector Scans
        </strong>
        <div id="student-ext-scans" class="grid grid-3" style="gap:16px"></div>
      `;
      runExternalScans('student-ext-scans');
    }).catch(e => {
      const el = document.getElementById('student-ai-report');
      if(el) el.style.display = 'none';
    });
  }

  if (!readOnly) {
    // Flush keystroke buffer every 5 seconds
    flushInterval = setInterval(() => flushKeystrokes(), 5000);
    // Snapshot every 30 seconds
    snapshotInterval = setInterval(() => takeSnapshot(), 30000);
  }
}

function initMonacoEditor(content, readOnly) {
  try {
    if (typeof require === 'undefined' || typeof require.config !== 'function') {
      throw new Error('Monaco loader not available');
    }
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      monaco.editor.defineTheme('edutrace-advanced', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': '#111827',
          'editorLineNumber.foreground': '#9ca3af',
          'editor.selectionBackground': '#6366f120',
          'editor.lineHighlightBackground': '#f3f4f6',
        }
      });

      monacoEditor = monaco.editor.create(document.getElementById('editor-container'), {
        value: content,
        language: 'python',
        theme: 'edutrace-advanced',
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        minimap: { enabled: false },
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        readOnly: readOnly,
        automaticLayout: true,
      });

      let isInitializing = true;
      setTimeout(() => { isInitializing = false; }, 1000);

      if (!readOnly) {
        // Track typing
        monacoEditor.onDidChangeModelContent((e) => {
          if (isInitializing || e.isFlush) return;
          for (const change of e.changes) {
            // Only consider it a paste if a significant chunk of text is inserted at once (e.g. > 25 chars)
            // This prevents fast typing or autocorrect (like "helleo" -> "hello") from being flagged as AI paste
            const isPaste = change.text.length > 25;
            if (change.text.length > 0) {
              keystrokeBuffer.push({
                submission_id: store.get('currentSubmission').id,
                event_type: isPaste ? 'paste' : 'type',
                content_delta: change.text.substring(0, 200),
                char_count: change.text.length,
              });
            }
          }
        });
      }
    });
  } catch (err) {
    console.error('Monaco failed, using fallback:', err);
    initFallbackEditor(content, readOnly, 'python');
  }
}

function initQuillEditor(content, readOnly) {
  try {
    if (typeof Quill === 'undefined') {
      throw new Error('Quill not available');
    }
    quillEditor = new Quill('#editor-container', {
      theme: 'snow',
      readOnly: readOnly,
      placeholder: 'Start writing your report...',
      modules: {
        toolbar: readOnly ? false : [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['link'],
          ['clean']
        ]
      }
    });

    if (content) {
      try { quillEditor.root.innerHTML = content; }
      catch { quillEditor.setText(content); }
    }

    if (!readOnly) {
      quillEditor.on('text-change', function (delta, oldDelta, source) {
        if (source === 'api') return; // Ignore programmatic changes
        
        let totalChars = 0;
        let isPaste = false;
        delta.ops.forEach(op => {
          if (op.insert && typeof op.insert === 'string') {
            totalChars += op.insert.length;
            if (op.insert.length > 25) isPaste = true;
          }
        });
        if (totalChars > 0) {
          keystrokeBuffer.push({
            submission_id: store.get('currentSubmission').id,
            event_type: isPaste ? 'paste' : 'type',
            content_delta: '',
            char_count: totalChars,
          });
        }
      });
    }
  } catch (err) {
    console.error('Quill failed, using fallback:', err);
    initFallbackEditor(content, readOnly, 'document');
  }
}

function initFallbackEditor(content, readOnly, type) {
  const container = document.getElementById('editor-container');
  const textarea = document.createElement('textarea');
  textarea.id = 'fallback-editor';
  textarea.value = content || '';
  textarea.readOnly = readOnly;
  textarea.placeholder = type === 'python' ? '# Start coding here...' : 'Start writing your report...';
  textarea.style.cssText = `
    width:100%; height:100%; background:#0a0a0f; color:#f4f4f5;
    border:none; padding:20px; font-size:14px; resize:none; outline:none;
    font-family: ${type === 'python' ? "'JetBrains Mono', monospace" : "'Outfit', sans-serif"};
    line-height:1.6; tab-size:4;
  `;
  container.innerHTML = '';
  container.appendChild(textarea);

  let isInitializing = true;
  setTimeout(() => { isInitializing = false; }, 1000);

  if (!readOnly) {
    textarea.addEventListener('input', (e) => {
      if (isInitializing) return;
      // Ignore insertFromPaste here because the 'paste' event handles it accurately
      if (e.inputType === 'insertFromPaste') return;
      
      const data = e.data || '';
      if (data.length > 0) {
        keystrokeBuffer.push({
          submission_id: store.get('currentSubmission').id,
          event_type: data.length > 25 ? 'paste' : 'type',
          content_delta: data.substring(0, 200),
          char_count: data.length,
        });
      }
    });
    textarea.addEventListener('paste', (e) => {
      if (isInitializing) return;
      const pasted = e.clipboardData.getData('text') || '';
      if (pasted.length > 0) {
        keystrokeBuffer.push({
          submission_id: store.get('currentSubmission').id,
          event_type: 'paste',
          content_delta: pasted.substring(0, 200),
          char_count: pasted.length,
        });
      }
    });
  }
}

function getEditorContent() {
  const asgn = store.get('currentAssignment');
  if (asgn.type === 'python' && monacoEditor) return monacoEditor.getValue();
  if (quillEditor) return quillEditor.root.innerHTML;
  // Fallback textarea
  const fallback = document.getElementById('fallback-editor');
  if (fallback) return fallback.value;
  return '';
}

async function runCode() {
  if (!monacoEditor) return;
  const code = monacoEditor.getValue();
  const termOut = document.getElementById('terminal-out');
  termOut.innerHTML = '<span class="pulse" style="color:var(--accent)">⏳ Running...</span>';
  try {
    const result = await api.executeCode(code);
    let output = '';
    if (result.stdout) output += `<span class="stdout">${escapeHtml(result.stdout)}</span>`;
    if (result.stderr) output += `<span class="stderr">${escapeHtml(result.stderr)}</span>`;
    if (!output) output = '<span style="color:var(--text-muted)">No output</span>';
    termOut.innerHTML = output;
  } catch (err) {
    termOut.innerHTML = `<span class="stderr">Error: ${escapeHtml(err.message)}</span>`;
  }
}

async function checkAI() {
  const sub = store.get('currentSubmission');
  if (!sub) return;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = renderModal(
    '🔍 AI Content Analysis',
    '<div class="flex flex-col items-center gap-md" id="check-ai-content"><span class="spinner"></span> Analyzing your keystrokes and paste behavior...</div>',
    `<button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>`
  );
  document.body.appendChild(modalDiv.firstElementChild);

  try {
    await flushKeystrokes();
    const logs = await api.getKeystrokes(sub.id);
    let typed = 0; let pasted = 0;
    logs.forEach(l => {
      if (l.event_type === 'type') typed += l.char_count;
      else if (l.event_type === 'paste') pasted += l.char_count;
    });
    
    // Adjust logic to account for deleted text. If current document is small but past paste was huge,
    // we shouldn't punish them forever if they deleted it.
    const currentLength = getEditorContent().length;
    let percentage = 0;
    
    let effectiveTyped = 0;
    let effectivePasted = 0;

    if (currentLength === 0) {
      percentage = 0;
    } else {
      // Benefit of the doubt: assume any current text is their typed text first
      effectiveTyped = Math.min(typed, currentLength);
      
      // The remaining length must be from pasted text
      effectivePasted = Math.max(0, currentLength - effectiveTyped);
      
      // Cap effective pasted at the actual historical pasted amount
      // (Handles edge cases where boilerplate makes currentLength > typed + pasted)
      effectivePasted = Math.min(effectivePasted, pasted);
      
      const effectiveTotal = effectiveTyped + effectivePasted;
      if (effectiveTotal > 0) {
        percentage = Math.round((effectivePasted / effectiveTotal) * 100);
      }
    }
    
    const interactions = await api.getAIInteractions(sub.id);
    const hasAIInteraction = interactions.length > 0;
    
    // Display the AI Generated Percentage
    const scoreColor = percentage >= 70 ? 'var(--danger)' : percentage >= 40 ? 'var(--warning)' : 'var(--success)';
    
    let content = `
      <div class="flex flex-col items-center gap-md text-center">
        <div style="position:relative;width:150px;height:150px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:8px solid ${scoreColor};box-shadow:0 0 20px ${scoreColor}40">
          <div style="font-size:3.5rem;font-weight:800;color:white">${percentage}%</div>
        </div>
        <h3 style="margin:0;color:${scoreColor}">Estimated AI / Pasted Content</h3>
        <div style="font-size:0.9rem;color:var(--text-secondary);max-width:300px">
          Calculated based on your active typed vs. pasted content.
        </div>
        <div class="grid grid-2" style="gap:12px;width:100%;margin-top:16px">
          <div class="card" style="padding:16px;background:rgba(255,255,255,0.02)"><strong style="color:white;font-size:1.5rem">${effectiveTyped}</strong><br><span style="font-size:.75rem">Active Typed Chars</span></div>
          <div class="card" style="padding:16px;background:rgba(255,255,255,0.02)"><strong style="color:white;font-size:1.5rem">${effectivePasted}</strong><br><span style="font-size:.75rem">Active Pasted Chars</span></div>
        </div>
        ${hasAIInteraction ? '<div style="margin-top:16px;font-size:0.85rem;color:var(--accent-4);padding:12px;background:rgba(14,165,233,0.1);border-radius:8px;border:1px solid rgba(14,165,233,0.3)">🌟 You have interacted with the AI Assistant during this session.</div>' : ''}
      </div>
    `;
    const target = document.getElementById('check-ai-content');
    if (target) target.parentElement.innerHTML = content;
  } catch (err) {
    const target = document.getElementById('check-ai-content');
    if (target) target.parentElement.innerHTML = `<div class="auth-error">Error: ${err.message}</div>`;
  }
}

async function saveWork() {
  const content = getEditorContent();
  try {
    await api.updateSubmission(store.get('currentSubmission').id, { final_content: content });
    showToast('Work saved!', 'success');
  } catch (err) { showToast(err.message, 'error'); }
}

async function submitWork() {
  const content = getEditorContent();
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = renderModal(
    '📤 Submit Assignment',
    'Once submitted, you cannot edit this assignment. Are you sure?',
    `<button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
     <button class="btn btn-primary" onclick="confirmSubmit()">Submit</button>`
  );
  document.body.appendChild(modalDiv.firstElementChild);
}

async function confirmSubmit() {
  document.querySelector('.modal-overlay')?.remove();
  const content = getEditorContent();
  try {
    // Flush remaining keystrokes
    await flushKeystrokes();
    // Take final snapshot
    await takeSnapshot();
    // Save and submit
    await api.updateSubmission(store.get('currentSubmission').id, { final_content: content, status: 'submitted' });
    showToast('Assignment submitted!', 'success');
    cleanup();
    store.navigate('dashboard');
  } catch (err) { showToast(err.message, 'error'); }
}

async function flushKeystrokes() {
  if (keystrokeBuffer.length === 0) return;
  const batch = [...keystrokeBuffer];
  keystrokeBuffer = [];
  try { await api.logKeystrokes(batch); } catch (e) { /* silent */ }
}

async function takeSnapshot() {
  const content = getEditorContent();
  if (!content) return;
  try {
    await api.logKeystrokes([{
      submission_id: store.get('currentSubmission').id,
      event_type: 'snapshot',
      content_delta: '',
      char_count: content.length,
      editor_snapshot: content.substring(0, 5000),
    }]);
  } catch (e) { /* silent */ }
}

function cleanup() {
  if (flushInterval) { clearInterval(flushInterval); flushInterval = null; }
  if (snapshotInterval) { clearInterval(snapshotInterval); snapshotInterval = null; }
  if (monacoEditor) { monacoEditor.dispose(); monacoEditor = null; }
  quillEditor = null;
  keystrokeBuffer = [];
}

async function loadAIHistory(submissionId) {
  try {
    const interactions = await api.getAIInteractions(submissionId);
    const container = document.getElementById('ai-messages');
    if (!container || interactions.length === 0) return;
    container.innerHTML = interactions.map(i => `
      <div class="ai-message user slide-in">${escapeHtml(i.student_prompt)}</div>
      <div class="ai-message assistant slide-in">${renderMarkdown(i.model_response)}</div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  } catch (e) { /* silent */ }
}

async function sendAIMessage(e) {
  e.preventDefault();
  const input = document.getElementById('ai-input');
  const apiKey = document.getElementById('ai-api-key').value;
  const provider = document.getElementById('ai-provider').value;
  const prompt = input.value.trim();

  if (!prompt) return;
  if (!apiKey) { showToast('Please enter your API key', 'error'); return; }

  const container = document.getElementById('ai-messages');
  // Clear empty state
  const emptyState = container.querySelector('.ai-empty');
  if (emptyState) emptyState.remove();

  // Add user message
  container.innerHTML += `<div class="ai-message user slide-in">${escapeHtml(prompt)}</div>`;
  container.innerHTML += `<div class="ai-message assistant slide-in" id="ai-loading"><span class="spinner"></span> Thinking...</div>`;
  container.scrollTop = container.scrollHeight;
  input.value = '';

  try {
    const result = await api.aiChat({
      submission_id: store.get('currentSubmission').id,
      provider,
      student_prompt: prompt,
      api_key: apiKey,
    });
    const loading = document.getElementById('ai-loading');
    if (loading) loading.outerHTML = `<div class="ai-message assistant slide-in">${renderMarkdown(result.model_response)}</div>`;
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    const loading = document.getElementById('ai-loading');
    if (loading) loading.outerHTML = `<div class="ai-message assistant slide-in" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</div>`;
  }
}

// ═══════════════════════════════════════════════════════
// REVIEW PAGE (Professor views submission)
// ═══════════════════════════════════════════════════════
function renderReview() {
  const sub = store.get('currentSubmission');
  if (!sub) { store.navigate('dashboard'); return ''; }

  const savedKey = sessionStorage.getItem('prof_openrouter_key') || '';
  const studentName = sub.student_name || 'Student';
  const asgnTitle = sub.assignment_title || 'Assignment';
  const courseName = sub.course_name || '';

  return `
    ${renderNavbar()}
    <div style="min-height:100vh;background:var(--bg-primary)">

      <!-- ── Hero Header ── -->
      <div style="background:linear-gradient(135deg,rgba(99,102,241,0.15) 0%,rgba(14,165,233,0.1) 50%,rgba(16,185,129,0.08) 100%);border-bottom:1px solid var(--border);padding:24px 32px">
        <div style="max-width:1400px;margin:0 auto">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px">
            <button class="btn btn-ghost btn-sm" onclick="store.navigate('dashboard')" style="padding:6px 12px;font-size:0.8rem">← Back</button>
            <span style="color:var(--text-muted);font-size:0.85rem">${courseName}</span>
          </div>
          <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px">
            <div>
              <h1 style="font-size:1.75rem;font-weight:800;margin:0 0 6px 0">${asgnTitle}</h1>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-secondary));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem">${studentName.charAt(0).toUpperCase()}</div>
                  <span style="font-size:1rem;font-weight:600">${studentName}</span>
                </div>
                <span style="color:var(--text-muted)">·</span>
                <span style="font-size:0.85rem;color:var(--text-secondary)">Submitted: ${sub.submitted_at ? parseUTCDate(sub.submitted_at).toLocaleString('en-US', {timeZone:'America/New_York'}) : 'N/A'}</span>
                ${sub.grade !== null && sub.grade !== undefined ? `<span style="color:var(--text-muted)">·</span>${getGradeDisplay(sub.grade)}` : ''}
              </div>
            </div>
            <div style="display:flex;gap:12px;align-items:center">
              <div id="risk-badge-header"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Main Layout ── -->
      <div style="max-width:1400px;margin:0 auto;padding:24px 32px;display:grid;grid-template-columns:1fr 420px;gap:24px;align-items:start">

        <!-- Left: Tabbed Evidence Panel -->
        <div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;background:rgba(99,102,241,0.03);border:1px solid var(--border);border-radius:12px;padding:6px;margin-bottom:16px">
            <button class="review-tab-btn active" id="tab-btn-work" onclick="switchReviewTab(this,'work')">📄 Final Work</button>
            <button class="review-tab-btn" id="tab-btn-interactions" onclick="switchReviewTab(this,'interactions')">🤖 AI Interactions</button>
            <button class="review-tab-btn" id="tab-btn-external" onclick="switchReviewTab(this,'external')">🌐 Detector Suite</button>
            <button class="review-tab-btn" id="tab-btn-timeline" onclick="switchReviewTab(this,'timeline')">⌨️ Keystroke Log</button>
            <button class="review-tab-btn" id="tab-btn-replay" onclick="switchReviewTab(this,'replay')">⏪ Live Replay</button>
            <button class="review-tab-btn" id="tab-btn-grade" onclick="switchReviewTab(this,'grade')">📝 Grade</button>
          </div>
          <div id="review-tab-content" style="min-height:400px">
            <div class="loading-text"><span class="spinner"></span> Loading...</div>
          </div>
        </div>

        <!-- Right: Analysis Panel -->
        <div style="position:sticky;top:24px;display:flex;flex-direction:column;gap:16px">

          <!-- Risk Meter Card -->
          <div id="risk-meter-card" style="background:linear-gradient(135deg,rgba(99,102,241,0.05),rgba(99,102,241,0.01));border:1px solid var(--border);border-radius:16px;padding:20px;display:none">
          </div>

          <!-- AI Summary Card -->
          <div style="background:#ffffff;border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--shadow-card)">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:rgba(99,102,241,0.06)">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite"></div>
                <span style="font-weight:700;font-size:0.9rem;letter-spacing:0.05em;text-transform:uppercase">AI Integrity Report</span>
              </div>
              <button id="regen-btn" class="btn btn-ghost btn-sm" onclick="generateAnalysis()" style="font-size:0.75rem;padding:4px 10px">🔄 Refresh</button>
            </div>
            <div id="review-analysis" style="padding:20px">
              <div style="text-align:center;padding:24px 16px">
                <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
                <h4 style="margin-bottom:8px">Generate Integrity Analysis</h4>
                <p style="color:var(--text-secondary);font-size:0.85rem;line-height:1.6;margin-bottom:16px">Run a full AI-powered analysis of this student's work session, paste patterns, and AI interaction history.</p>
                <div style="margin-bottom:12px">
                  <input class="input" id="prof-api-key" type="password" placeholder="OpenRouter API Key (sk-or-v1-...)" value="${savedKey}" style="font-size:0.8rem">
                </div>
                <button class="btn btn-primary" onclick="generateAnalysis()" style="width:100%">⚡ Generate Analysis</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// CSS for the new tab buttons — injected once
(function injectReviewTabStyles() {
  if (document.getElementById('review-tab-style')) return;
  const style = document.createElement('style');
  style.id = 'review-tab-style';
  style.textContent = `
    .review-tab-btn {
      flex:1;min-width:fit-content;padding:8px 12px;background:transparent;border:none;
      color:var(--text-secondary);font-size:0.8rem;font-weight:500;border-radius:8px;
      cursor:pointer;transition:all 0.2s;white-space:nowrap;
    }
    .review-tab-btn:hover { background:rgba(255,255,255,0.05); color:var(--text-primary); }
    .review-tab-btn.active { background:var(--accent);color:#fff;font-weight:600; }
    .risk-bar-track { background:rgba(255,255,255,0.06);border-radius:99px;height:8px;overflow:hidden;margin:8px 0 }
    .risk-bar-fill { height:100%;border-radius:99px;transition:width 1s cubic-bezier(.4,0,.2,1) }
  `;
  document.head.appendChild(style);
})()

let reviewData = {};

async function initReview() {
  const sub = store.get('currentSubmission');
  if (!sub) return;
  // Load the final work tab
  showFinalWork();
  // Try to load existing summary
  try {
    const summary = await api.getSummary(sub.id);
    if (summary) showExistingSummary(summary);
  } catch (e) { /* No summary yet */ }
}

async function switchReviewTab(el, tab) {
  document.querySelectorAll('.review-tab-btn').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  if (window.replayInterval) { clearInterval(window.replayInterval); window.replayInterval = null; }
  if (tab === 'work') showFinalWork();
  else if (tab === 'interactions') showInteractions();
  else if (tab === 'external') showExternalScans();
  else if (tab === 'timeline') showTimeline();
  else if (tab === 'replay') showReplay();
  else if (tab === 'grade') showGradeTab();
}

function showExternalScans() {
  const container = document.getElementById('review-tab-content');
  container.innerHTML = `
    <div class="card fade-in" style="max-width:800px;margin:0 auto">
      <h3 style="margin-bottom:8px">External Detector Suite</h3>
      <p style="color:var(--text-secondary);margin-bottom:24px">Run the submission against external AI detectors like ZeroGPT, Copyleaks, and GPTZero.</p>
      
      <div style="background:rgba(255,255,255,0.02);padding:16px;border-radius:8px;border:1px solid var(--border);margin-bottom:24px">
        <label>ZeroGPT or OpenRouter API Key (Optional)</label>
        <div style="display:flex;gap:12px;margin-top:8px">
          <input type="password" id="ext-api-key" class="input" placeholder="Enter API Key..." value="${sessionStorage.getItem('ZEROGPT_API_KEY') || ''}">
          <button class="btn btn-primary" onclick="runExternalScans('ext-scan-results')">Run Scans</button>
        </div>
      </div>
      
      <div id="ext-scan-results" class="grid grid-3" style="display:none;gap:16px"></div>
    </div>
  `;
}

async function runExternalScans(containerId) {
  const sub = store.get('currentSubmission');
  const apiKeyInput = document.getElementById('ext-api-key');
  const apiKey = apiKeyInput ? apiKeyInput.value : null;
  if (apiKey) sessionStorage.setItem('ZEROGPT_API_KEY', apiKey);
  
  const resultsDiv = document.getElementById(containerId);
  if (!resultsDiv) return;
  
  resultsDiv.style.display = 'grid';
  resultsDiv.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px"><span class="spinner"></span> Running Deep Analysis...</div>';
  
  try {
    const results = await api.runExternalScan(sub.id, apiKey);
    
    let html = '';
    const detectors = [
      { id: 'zerogpt', name: 'ZeroGPT', icon: '🧠' },
      { id: 'copyleaks', name: 'Copyleaks', icon: '🔍' },
      { id: 'gptzero', name: 'GPTZero', icon: '🤖' }
    ];
    
    detectors.forEach(d => {
      const res = results[d.id] || { score: 0, reason: 'No data' };
      let color = 'var(--success)';
      if (res.score > 40) color = 'var(--warning)';
      if (res.score > 70) color = 'var(--danger)';
      
      html += `
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:20px;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px">${d.icon}</div>
          <h4 style="margin-bottom:16px">${d.name}</h4>
          <div style="font-size:2.5rem;font-weight:800;color:${color};margin-bottom:12px">${res.score}%</div>
          <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.4">${res.reason}</p>
        </div>
      `;
    });
    
    resultsDiv.innerHTML = html;
  } catch(e) {
    resultsDiv.innerHTML = `<div class="auth-error" style="grid-column:1/-1">${e.message}</div>`;
  }
}

function showGradeTab() {
  const sub = store.get('currentSubmission');
  const container = document.getElementById('review-tab-content');
  
  const currentGrade = sub.grade === -1 ? '' : (sub.grade ?? '');
  const isOptional = sub.grade === -1;
  const currentFeedback = sub.feedback || '';

  const letterFromGrade = (g) => {
    const n = parseFloat(g);
    if (isNaN(n)) return '';
    if (n >= 93) return 'A'; if (n >= 90) return 'A-';
    if (n >= 87) return 'B+'; if (n >= 83) return 'B'; if (n >= 80) return 'B-';
    if (n >= 77) return 'C+'; if (n >= 73) return 'C'; if (n >= 70) return 'C-';
    if (n >= 67) return 'D+'; if (n >= 63) return 'D'; if (n >= 60) return 'D-';
    return 'F';
  };
  const currentLetter = letterFromGrade(currentGrade);

  const optStr = isOptional ? 'checked' : '';
  const disStr = isOptional ? 'style="opacity:0.4;pointer-events:none"' : '';
  
  container.innerHTML = `
    <div class="card fade-in" style="max-width:600px;margin:0 auto">
      <h3 style="margin-bottom:4px">Submit Final Grade</h3>
      <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">for ${escapeHtml(sub.student_name || 'Student')}</p>
      
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 16px;background:rgba(217,119,6,0.07);border:1px solid rgba(217,119,6,0.2);border-radius:10px">
        <input type="checkbox" id="grade-optional" ${optStr} style="width:18px;height:18px;accent-color:var(--warning)" onchange="toggleGradeFields(this.checked)">
        <label for="grade-optional" style="margin:0;font-weight:600;color:#92400e;cursor:pointer">Mark as Optional / Excused (no grade penalty)</label>
      </div>

      <div id="grade-fields" ${disStr}>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          <div class="form-group" style="margin:0">
            <label>Percentage (%)</label>
            <input type="number" id="grade-input" class="input" placeholder="e.g. 92" value="${currentGrade}" min="0" max="100" style="font-size:1.5rem;font-weight:700;padding:12px;text-align:center" oninput="syncLetterFromPct(this.value)">
          </div>
          <div class="form-group" style="margin:0">
            <label>Letter Grade</label>
            <select id="grade-letter" class="select" style="font-size:1.3rem;font-weight:700;padding:12px;text-align:center" onchange="syncPctFromLetter(this.value)">
              <option value="">—</option>
              <option value="A" ${currentLetter==='A'?'selected':''}>A (93–100)</option>
              <option value="A-" ${currentLetter==='A-'?'selected':''}>A- (90–92)</option>
              <option value="B+" ${currentLetter==='B+'?'selected':''}>B+ (87–89)</option>
              <option value="B" ${currentLetter==='B'?'selected':''}>B (83–86)</option>
              <option value="B-" ${currentLetter==='B-'?'selected':''}>B- (80–82)</option>
              <option value="C+" ${currentLetter==='C+'?'selected':''}>C+ (77–79)</option>
              <option value="C" ${currentLetter==='C'?'selected':''}>C (73–76)</option>
              <option value="C-" ${currentLetter==='C-'?'selected':''}>C- (70–72)</option>
              <option value="D+" ${currentLetter==='D+'?'selected':''}>D+ (67–69)</option>
              <option value="D" ${currentLetter==='D'?'selected':''}>D (63–66)</option>
              <option value="D-" ${currentLetter==='D-'?'selected':''}>D- (60–62)</option>
              <option value="F" ${currentLetter==='F'?'selected':''}>F (0–59)</option>
            </select>
          </div>
        </div>

        <div id="grade-preview" style="text-align:center;padding:12px;border-radius:10px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.15);margin-bottom:20px;font-size:0.9rem;color:var(--accent);font-weight:600">
          ${currentGrade !== '' ? `Grade: ${currentGrade}% &nbsp;&bull;&nbsp; <strong>${currentLetter}</strong>` : 'Enter a grade above to preview'}
        </div>
      </div>

      <div class="form-group">
        <label>Professor Feedback</label>
        <textarea id="feedback-input" class="input" rows="5" placeholder="Provide specific, constructive feedback to the student...">${escapeHtml(currentFeedback)}</textarea>
      </div>
      <button class="btn btn-primary" style="width:100%;font-size:1rem" onclick="submitGrade()">✅ Save Grade & Feedback</button>
    </div>
  `;
}

function toggleGradeFields(disabled) {
  const fields = document.getElementById('grade-fields');
  if (fields) { fields.style.opacity = disabled ? '0.4' : '1'; fields.style.pointerEvents = disabled ? 'none' : 'auto'; }
}

function syncLetterFromPct(pct) {
  const n = parseFloat(pct);
  let letter = '';
  if (!isNaN(n)) {
    if (n >= 93) letter = 'A'; else if (n >= 90) letter = 'A-';
    else if (n >= 87) letter = 'B+'; else if (n >= 83) letter = 'B'; else if (n >= 80) letter = 'B-';
    else if (n >= 77) letter = 'C+'; else if (n >= 73) letter = 'C'; else if (n >= 70) letter = 'C-';
    else if (n >= 67) letter = 'D+'; else if (n >= 63) letter = 'D'; else if (n >= 60) letter = 'D-';
    else letter = 'F';
  }
  const sel = document.getElementById('grade-letter');
  if (sel) sel.value = letter;
  const preview = document.getElementById('grade-preview');
  if (preview) preview.innerHTML = !isNaN(n) ? `Grade: ${n}% &nbsp;&bull;&nbsp; <strong>${letter}</strong>` : 'Enter a grade above to preview';
}

function syncPctFromLetter(letter) {
  const map = { 'A':96,'A-':91,'B+':88,'B':85,'B-':81,'C+':78,'C':75,'C-':71,'D+':68,'D':65,'D-':61,'F':50 };
  const pct = map[letter];
  const input = document.getElementById('grade-input');
  if (input && pct !== undefined) { input.value = pct; syncLetterFromPct(pct); }
}


async function submitGrade() {
  const sub = store.get('currentSubmission');
  const isOptional = document.getElementById('grade-optional').checked;
  let grade = parseFloat(document.getElementById('grade-input').value);
  const feedback = document.getElementById('feedback-input').value;
  
  if (isOptional) {
    grade = -1;
  } else if (isNaN(grade)) { 
    showToast('Please enter a valid grade number', 'error'); return; 
  }
  
  try {
    const updated = await api.updateSubmission(sub.id, {
      status: 'reviewed',
      grade: grade,
      feedback: feedback
    });
    store.set('currentSubmission', updated);
    showToast('Grade saved successfully!', 'success');
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function toggleHeatmap() {
  const container = document.getElementById('final-work-content');
  if (!container) return;
  if (container.dataset.heatmap === 'true') {
    showFinalWork(); // reset to normal
    return;
  }
  
  const sub = store.get('currentSubmission');
  try {
    const logs = await api.getKeystrokes(sub.id);
    let content = sub.final_content || '';
    
    // Find all significant pasted strings
    const pastes = logs.filter(l => l.event_type === 'paste' && l.content_delta && l.content_delta.length > 10);
    
    let highlightedContent = escapeHtml(content);
    
    pastes.forEach(p => {
      const safePaste = escapeHtml(p.content_delta);
      if (safePaste && highlightedContent.includes(safePaste)) {
        highlightedContent = highlightedContent.replace(
          safePaste, 
          `<span class="heatmap-paste" title="Detected Paste Event">${safePaste}</span>`
        );
      }
    });

    if (sub.assignment_type === 'python') {
      container.innerHTML = `
        <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
          <span class="badge badge-danger">🔥 Heatmap Mode Active: Red text indicates pasted content.</span>
          <button class="btn btn-secondary btn-sm" onclick="showFinalWork()">Disable Heatmap</button>
        </div>
        <pre style="background:#f8f9ff;padding:16px;border-radius:8px;overflow:auto;font-family:var(--font-mono);font-size:.85rem;color:var(--text-primary);border:1px solid var(--border);line-height:1.6">${highlightedContent}</pre>
      `;
    } else {
      // Just fall back to normal view for documents since HTML replacement is tricky
      showFinalWork();
    }
    container.dataset.heatmap = 'true';
  } catch(e) {
    console.error(e);
  }
}

function showFinalWork() {
  const sub = store.get('currentSubmission');
  const container = document.getElementById('review-tab-content');
  if (!sub.final_content) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h3>No content</h3><p>The student has not written any content yet.</p></div>';
    return;
  }
  
  let html = `<div id="final-work-content" data-heatmap="false">`;
  
  if (sub.assignment_type === 'python') {
    html += `
      <div style="margin-bottom:12px;display:flex;justify-content:flex-end;">
        <button class="btn btn-secondary btn-sm" onclick="toggleHeatmap()">🔥 Toggle Integrity Heatmap</button>
      </div>
      <pre style="background:#f8f9ff;padding:16px;border-radius:8px;overflow:auto;font-family:var(--font-mono);font-size:.85rem;color:var(--text-primary);border:1px solid var(--border);line-height:1.6">${escapeHtml(sub.final_content)}</pre>
    `;
  } else {
    html += `<div style="background:#ffffff;padding:24px;border-radius:8px;line-height:1.8;border:1px solid var(--border);color:var(--text-primary)">${sub.final_content}</div>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// ── Replay Player ────────────────────────────────────
function showReplay() {
  const container = document.getElementById('review-tab-content');
  container.innerHTML = `
    <div style="background:#f8f9ff;border-radius:12px;border:1px solid var(--border);overflow:hidden;display:flex;flex-direction:column;height:600px;box-shadow:var(--shadow-card)">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:rgba(99,102,241,0.06)">
        <div style="display:flex;gap:12px;align-items:center">
          <button class="btn btn-success btn-sm" id="replay-play-btn" onclick="startReplay()">▶ Play Time-Lapse</button>
          <span id="replay-status" style="color:var(--text-muted);font-size:0.85rem">Ready to replay student session</span>
        </div>
      </div>
      <div style="flex:1;padding:16px;overflow:auto;font-family:var(--font-mono);font-size:14px;color:var(--text-primary);white-space:pre-wrap;background:#ffffff" id="replay-editor"># Click Play to start the replay sequence...</div>
    </div>
  `;
}

async function startReplay() {
  const sub = store.get('currentSubmission');
  const btn = document.getElementById('replay-play-btn');
  const status = document.getElementById('replay-status');
  const editor = document.getElementById('replay-editor');
  
  btn.disabled = true;
  status.innerHTML = '<span class="spinner"></span> Loading logs...';
  
  try {
    const logs = await api.getKeystrokes(sub.id);
    if (!logs || logs.length === 0) {
      status.innerText = 'No keystroke data found for replay.';
      btn.disabled = false;
      return;
    }
    
    // Filter to build the visual sequence
    const validLogs = logs.filter(l => l.event_type === 'type' || l.event_type === 'paste' || l.event_type === 'snapshot' || l.event_type === 'tab_leave' || l.event_type === 'tab_enter');
    
    let i = 0;
    let currentContent = '';
    
    status.innerText = 'Playing...';
    editor.innerHTML = '';
    
    window.replayInterval = setInterval(() => {
      if (i >= validLogs.length) {
        clearInterval(window.replayInterval);
        status.innerHTML = '<span style="color:var(--success)">✅ Replay Complete</span>';
        btn.disabled = false;
        btn.innerText = '🔄 Replay Again';
        return;
      }
      
      const log = validLogs[i];
      if (log.event_type === 'snapshot' && log.editor_snapshot) {
        currentContent = log.editor_snapshot;
      } else if (log.event_type === 'paste') {
        currentContent += log.content_delta;
        status.innerHTML = `<span style="color:var(--danger)">📋 MASS PASTE DETECTED (+${log.char_count} chars)</span>`;
      } else if (log.event_type === 'type') {
        currentContent += log.content_delta;
        status.innerHTML = `<span style="color:var(--text-muted)">⌨️ Student typing...</span>`;
      } else if (log.event_type === 'tab_leave') {
        status.innerHTML = `<span style="color:var(--danger)">⚠️ STUDENT LEFT BROWSER TAB</span>`;
      } else if (log.event_type === 'tab_enter') {
        status.innerHTML = `<span style="color:var(--success)">✅ Student returned to tab</span>`;
      }
      
      editor.innerHTML = escapeHtml(currentContent) + '<span class="pulse">_</span>';
      editor.scrollTop = editor.scrollHeight;
      
      i++;
    }, 150); // Fast forward speed
    
  } catch(e) {
    status.innerText = 'Error loading replay.';
    btn.disabled = false;
  }
}



async function showInteractions() {
  const sub = store.get('currentSubmission');
  const container = document.getElementById('review-tab-content');
  container.innerHTML = '<div class="loading-text"><span class="spinner"></span> Loading AI interactions...</div>';
  try {
    const interactions = await api.getAIInteractions(sub.id);
    if (interactions.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤖</div><h3>No AI Interactions</h3><p>The student did not use the AI assistant during this session.</p></div>';
      return;
    }
    container.innerHTML = interactions.map((i, idx) => `
      <div class="interaction-item fade-in">
        <div class="interaction-meta">
          <span class="badge badge-primary">${i.provider}</span>
          <span>${parseUTCDate(i.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })}</span>
          <span>#${idx + 1}</span>
        </div>
        <div class="interaction-prompt" style="margin-top:8px">
          <strong>Student Prompt:</strong><br>${escapeHtml(i.student_prompt)}
        </div>
        <div class="interaction-response" style="margin-top:8px">
          <strong>AI Response:</strong><br>${renderMarkdown(i.model_response)}
        </div>
      </div>
    `).join('');
  } catch (err) { container.innerHTML = `<div class="auth-error">${err.message}</div>`; }
}

async function showTimeline() {
  const sub = store.get('currentSubmission');
  const container = document.getElementById('review-tab-content');
  container.innerHTML = '<div class="loading-text"><span class="spinner"></span> Loading keystroke data...</div>';
  try {
    const logs = await api.getKeystrokes(sub.id);
    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⌨️</div><h3>No Keystroke Data</h3><p>No keystroke data was recorded for this submission.</p></div>';
      return;
    }
    // Stats summary
    const typeCount = logs.filter(l => l.event_type === 'type').length;
    const pasteCount = logs.filter(l => l.event_type === 'paste').length;
    const totalPastedChars = logs.filter(l => l.event_type === 'paste').reduce((s, l) => s + l.char_count, 0);
    const snapshots = logs.filter(l => l.event_type === 'snapshot').length;

    let html = `
      <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:1.5rem;font-weight:700;color:var(--accent)">${typeCount}</div>
          <div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase">Type Events</div>
        </div>
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:1.5rem;font-weight:700;color:var(--warning)">${pasteCount}</div>
          <div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase">Paste Events</div>
        </div>
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:1.5rem;font-weight:700;color:var(--danger)">${totalPastedChars}</div>
          <div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase">Chars Pasted</div>
        </div>
        <div class="card" style="padding:16px;text-align:center">
          <div style="font-size:1.5rem;font-weight:700;color:var(--success)">${snapshots}</div>
          <div style="font-size:.75rem;color:var(--text-muted);text-transform:uppercase">Snapshots</div>
        </div>
      </div>
      <h3 style="margin-bottom:12px">Activity Timeline</h3>
      <div class="timeline">`;

    // Show last 100 events
    const recent = logs.slice(-100);
    for (const log of recent) {
      const time = parseUTCDate(log.timestamp).toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
      const isPaste = log.event_type === 'paste';
      const isSnapshot = log.event_type === 'snapshot';
      const isTabLeave = log.event_type === 'tab_leave';
      const isTabEnter = log.event_type === 'tab_enter';
      
      const typeClass = isPaste ? 'paste' : isTabLeave ? 'tab_leave' : isTabEnter ? 'tab_enter' : '';
      const typeLabel = isPaste ? '📋 PASTE' : isSnapshot ? '📸 SNAPSHOT' : isTabLeave ? '⚠️ LEFT TAB' : isTabEnter ? '✅ RETURNED' : '⌨️ TYPE';
      const color = isPaste ? 'var(--warning)' : isSnapshot ? 'var(--success)' : isTabLeave ? 'var(--danger)' : isTabEnter ? 'var(--success)' : 'var(--text-muted)';

      html += `
        <div class="timeline-item ${typeClass}">
          <span class="timeline-time">${time}</span>
          <div class="timeline-content">
            <span class="timeline-type" style="color:${color}">${typeLabel}</span>
            <span style="color:var(--text-secondary)">${isTabLeave || isTabEnter ? '' : log.char_count + ' chars'}</span>
            <div style="margin-top:4px;font-size:.8rem;color:var(--text-muted);font-family:var(--font-mono);max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(log.content_delta || '')}</div>
          </div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
  } catch (err) { container.innerHTML = `<div class="auth-error">${err.message}</div>`; }
}

async function generateAnalysis() {
  const sub = store.get('currentSubmission');
  const apiKeyInput = document.getElementById('prof-api-key');
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
  if (apiKey) sessionStorage.setItem('prof_openrouter_key', apiKey);

  const container = document.getElementById('review-analysis');
  container.innerHTML = `
    <div style="padding:40px;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:16px;animation:pulse 1s infinite">⚡</div>
      <div style="font-weight:600;margin-bottom:8px;color:var(--text-primary)">Analyzing student work session...</div>
      <p style="color:var(--text-secondary);font-size:0.85rem">Examining keystroke patterns, AI interactions, and content authenticity</p>
      <div style="margin-top:24px;height:4px;background:rgba(99,102,241,0.1);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:60%;background:linear-gradient(90deg,var(--accent),var(--accent-secondary));border-radius:99px;animation:pulse 1.5s infinite"></div>
      </div>
    </div>
  `;
  try {
    const summary = await api.generateSummary(sub.id, apiKey);
    showExistingSummary(summary);
  } catch (err) {
    container.innerHTML = `<div style="padding:24px"><div class="auth-error">${err.message}</div><button class="btn btn-primary mt-md" onclick="generateAnalysis()">Try Again</button></div>`;
  }
}

function showExistingSummary(summary) {
  const container = document.getElementById('review-analysis');
  const level = summary.ai_contribution_level || 'medium';
  const levelColors = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)' };
  const levelLabels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
  const levelIcons = { low: '✅', medium: '⚠️', high: '🚨' };
  const color = levelColors[level] || 'var(--warning)';
  const label = levelLabels[level] || 'Unknown';
  const icon = levelIcons[level] || '🔍';

  // Compute a rough AI % from the summary text or level
  const aiPct = level === 'high' ? 82 : level === 'medium' ? 48 : 14;

  // Update the Risk Meter card
  const riskCard = document.getElementById('risk-meter-card');
  if (riskCard) {
    riskCard.style.display = 'block';
    riskCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-weight:700;font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary)">Risk Score</span>
        <span style="font-size:2rem;font-weight:900;color:${color}">${aiPct}%</span>
      </div>
      <div class="risk-bar-track" style="background:rgba(99,102,241,0.1)">
        <div class="risk-bar-fill" style="width:${aiPct}%;background:${color}"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.7rem;color:var(--text-muted);margin-top:4px">
        <span>Low Risk</span><span>High Risk</span>
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:rgba(99,102,241,0.04);border-radius:8px;border-left:3px solid ${color}">
        <span style="font-size:0.85rem;font-weight:600;color:${color}">${icon} ${label}</span>
      </div>
    `;
    // Also update header badge
    const headerBadge = document.getElementById('risk-badge-header');
    if (headerBadge) {
      headerBadge.innerHTML = `<span style="padding:6px 14px;border-radius:99px;background:${color}20;border:1px solid ${color}50;color:${color};font-size:0.85rem;font-weight:700">${icon} ${label}</span>`;
    }
  }

  container.innerHTML = `
    <div class="fade-in">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:0.75rem;color:var(--text-muted)">${parseUTCDate(summary.generated_at).toLocaleString('en-US', { timeZone: 'America/New_York' })}</span>
        <button class="btn btn-ghost btn-sm" onclick="generateAnalysis()" style="font-size:0.75rem;padding:4px 10px">🔄 Refresh</button>
      </div>
      <div class="summary-content" style="font-size:0.85rem;line-height:1.7;color:var(--text-secondary);max-height:400px;overflow-y:auto;padding-right:4px">${renderMarkdown(summary.gemini_summary || 'No summary available.')}</div>
      <hr style="border-color:var(--border);margin:20px 0">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em">💬 Ask the Analyst</span>
      </div>
      <div id="summary-chat-messages" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px"></div>
      <form onsubmit="sendSummaryChat(event, ${summary.id})" style="display:flex;gap:8px">
        <input class="input" id="summary-chat-input" placeholder="e.g. Why was paragraph 3 flagged?" style="flex:1;font-size:0.85rem">
        <button class="btn btn-primary btn-sm" type="submit">Ask</button>
      </form>
    </div>`;

  loadSummaryChat(summary.id);
}

async function loadSummaryChat(summaryId) {
  try {
    const chats = await api.getSummaryChatHistory(summaryId);
    const container = document.getElementById('summary-chat-messages');
    if (!container || chats.length === 0) return;
    container.innerHTML = chats.map(c => `
      <div class="chat-message ${c.role} slide-in">${c.role === 'ai' ? renderMarkdown(c.message) : escapeHtml(c.message)}</div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  } catch (e) { /* silent */ }
}

async function sendSummaryChat(e, summaryId) {
  e.preventDefault();
  const input = document.getElementById('summary-chat-input');
  const message = input.value.trim();
  if (!message) return;

  const apiKey = sessionStorage.getItem('prof_openrouter_key') || '';

  const container = document.getElementById('summary-chat-messages');
  container.innerHTML += `<div class="chat-message professor slide-in">${escapeHtml(message)}</div>`;
  container.innerHTML += `<div class="chat-message ai slide-in" id="chat-loading"><span class="spinner"></span> Analyzing...</div>`;
  container.scrollTop = container.scrollHeight;
  input.value = '';

  try {
    const result = await api.summaryChat({ summary_id: summaryId, message, api_key: apiKey });
    const loading = document.getElementById('chat-loading');
    if (loading) loading.outerHTML = `<div class="chat-message ai slide-in">${renderMarkdown(result.message)}</div>`;
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    const loading = document.getElementById('chat-loading');
    if (loading) loading.outerHTML = `<div class="chat-message ai slide-in" style="color:var(--danger)">Error: ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function parseUTCDate(dateString) {
  if (!dateString) return new Date();
  if (!dateString.endsWith('Z') && !dateString.includes('+')) {
    return new Date(dateString + 'Z');
  }
  return new Date(dateString);
}

function renderMarkdown(text) {
  if (!text) return '';
  try {
    if (typeof marked !== 'undefined') {
      marked.setOptions({ breaks: true, gfm: true });
      return marked.parse(text);
    }
  } catch (e) {}
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// ═══════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════
function render() {
  cleanup(); // cleanup previous workspace state

  const app = document.getElementById('app');
  if (!store.isLoggedIn()) {
    app.innerHTML = renderAuthPage();
    initAuthPage();
    return;
  }

  const page = store.get('currentPage');
  switch (page) {
    case 'dashboard':
      if (store.isStudent()) {
        app.innerHTML = renderStudentDashboard();
        initStudentDashboard();
      } else {
        app.innerHTML = renderProfessorDashboard();
        initProfessorDashboard();
      }
      break;
    case 'workspace':
      app.innerHTML = renderWorkspace();
      setTimeout(() => initWorkspace(), 100);
      break;
    case 'review':
      app.innerHTML = renderReview();
      setTimeout(() => initReview(), 100);
      break;
    case 'create-assignment':
      app.innerHTML = renderCreateAssignment();
      break;
    case 'enroll':
      app.innerHTML = renderEnrollPage();
      setTimeout(() => initEnrollPage(), 100);
      break;
    default:
      app.innerHTML = renderStudentDashboard();
      initStudentDashboard();
  }
}

// Subscribe to state changes
store.subscribe(() => render());

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  const ambient = document.createElement('div');
  ambient.className = 'ambient-bg';
  ambient.innerHTML = '<div class="ambient-blob"></div><div class="ambient-blob"></div><div class="ambient-blob"></div>';
  document.body.prepend(ambient);
  render();
});
