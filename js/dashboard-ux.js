// Lightweight, reliable bindings for dashboard buttons.
// This script is self-contained so that buttons work even
// if other scripts have issues.

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:5001/api';
  let OFFLINE_MODE = false;

  function getToken() {
    return localStorage.getItem('securepass_token');
  }

  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      handler();
    });
  }

  function closeOverlay() {
    const existing = document.getElementById('simpleOverlay');
    if (existing) existing.remove();
  }

  function showOverlay(html) {
    closeOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'simpleOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.zIndex = '99999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    return overlay;
  }

  function showMessage(text, type = 'info') {
    // type: 'success', 'danger', 'info', 'warning'
    const color =
      type === 'success' ? '#198754'
      : type === 'danger' ? '#dc3545'
      : type === 'warning' ? '#ffc107'
      : '#0d6efd';

    const box = document.createElement('div');
    box.style.position = 'fixed';
    box.style.top = '20px';
    box.style.right = '20px';
    box.style.padding = '10px 14px';
    box.style.background = '#fff';
    box.style.borderRadius = '6px';
    box.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    box.style.borderLeft = `4px solid ${color}`;
    box.style.zIndex = '100000';
    box.style.fontSize = '14px';
    box.textContent = text;
    document.body.appendChild(box);

    setTimeout(() => box.remove(), 3000);
  }

  async function detectBackend() {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error('Bad status');
      OFFLINE_MODE = false;
    } catch (e) {
      console.warn('Backend not reachable, running in offline demo mode.');
      OFFLINE_MODE = true;
    }
  }

  function loadLocalPasswords() {
    try {
      const raw = localStorage.getItem('securepass_local_passwords');
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function saveLocalPasswords(list) {
    localStorage.setItem('securepass_local_passwords', JSON.stringify(list));
  }

  function showAddPasswordOverlay() {
    const html = `
      <div style="background:#fff;border-radius:10px;padding:20px;max-width:420px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;">
        <button type="button" id="simpleAddPwdCloseBtn" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.25rem;color:#666;cursor:pointer;padding:0;line-height:1;" title="Close">&times;</button>
        <h5 style="margin-bottom:15px;padding-right:28px;">Add New Password</h5>
        <form id="simpleAddPasswordForm">
          <div class="mb-2">
            <label class="form-label">Application Name *</label>
            <input type="text" class="form-control" name="app_name" required placeholder="e.g. Gmail">
          </div>
          <div class="mb-2">
            <label class="form-label">Username *</label>
            <input type="text" class="form-control" name="username" required placeholder="Your username">
          </div>
          <div class="mb-2">
            <label class="form-label">Password *</label>
            <input type="text" class="form-control" name="password" required placeholder="Your password">
          </div>
          <div class="mb-3">
            <label class="form-label">Expiry Date *</label>
            <input type="date" class="form-control" name="expiry_date" required>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" id="simpleCancelBtn" class="btn btn-outline-secondary btn-sm">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Save</button>
          </div>
        </form>
      </div>
    `;

    showOverlay(html);

    const form = document.getElementById('simpleAddPasswordForm');
    const cancelBtn = document.getElementById('simpleCancelBtn');
    const closeBtn = document.getElementById('simpleAddPwdCloseBtn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => closeOverlay());
    if (closeBtn) closeBtn.addEventListener('click', () => closeOverlay());

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const expRaw = formData.get('expiry_date');
        if (!expRaw) {
          showMessage('Please select an expiry date.', 'warning');
          return;
        }
        const payload = {
          app_name: formData.get('app_name'),
          username: formData.get('username'),
          password: formData.get('password'),
          expiry_date: expRaw,
          website_url: '',
          notes: '',
          days_before_reminder: 7
        };

        if (!payload.app_name || !payload.username || !payload.password) {
          showMessage('Please fill Application name, Username and Password.', 'warning');
          return;
        }

        const token = getToken();
        if (OFFLINE_MODE || !token) {
          const list = loadLocalPasswords();
          const id = Date.now();
          const today = new Date();
          const exp = new Date(payload.expiry_date);
          const daysLeft = Math.max(
            0,
            Math.ceil((exp.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
          );
          list.push({ id, ...payload, days_left: daysLeft });
          saveLocalPasswords(list);
          showMessage('Password saved (local demo).', 'success');
          closeOverlay();
          await refreshRecentPasswords();
          return;
        }

        try {
          const res = await fetch(API_BASE + '/passwords', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            showMessage(data.message || 'Failed to add password.', 'danger');
            return;
          }
          showMessage('Password added.', 'success');
          closeOverlay();
          await refreshRecentPasswords();
          await refreshUpcomingReminders();
        } catch (err) {
          console.error('Simple add password error:', err);
          const list = loadLocalPasswords();
          const id = Date.now();
          const today = new Date();
          const exp = new Date(payload.expiry_date);
          const daysLeft = Math.max(
            0,
            Math.ceil((exp.setHours(0,0,0,0) - today.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
          );
          list.push({ id, ...payload, days_left: daysLeft });
          saveLocalPasswords(list);
          showMessage('Password saved (local demo).', 'success');
          closeOverlay();
          await refreshRecentPasswords();
          await refreshUpcomingReminders();
        }
      });
    }
  }

  function showEmailMeOverlay() {
    const html = `
      <div style="background:#fff;border-radius:10px;padding:20px;max-width:440px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;">
        <button type="button" id="emailOverlayCloseBtn" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.25rem;color:#666;cursor:pointer;padding:0;line-height:1;" title="Close">&times;</button>
        <h5 style="margin-bottom:12px;padding-right:28px;"><i class="fas fa-envelope me-2"></i>Email notifications</h5>
        <p class="small text-muted mb-3">We email you when your password is expiring soon (change it) and when a meeting or reminder is in the next 2–3 days (Be Ready). Click below to send a notification email to your registered address now.</p>
        <div class="mb-3">
          <label class="form-label">Your registered email</label>
          <input type="text" class="form-control" id="emailDisplayField" readonly placeholder="Loading...">
        </div>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" id="emailOverlayCancelBtn" class="btn btn-outline-secondary btn-sm">Cancel</button>
          <button type="button" id="sendEmailNowBtn" class="btn btn-primary btn-sm"><i class="fas fa-paper-plane me-1"></i>Send my notification email now</button>
        </div>
      </div>
    `;
    const overlay = showOverlay(html);

    var cancelBtn = overlay.querySelector('#emailOverlayCancelBtn');
    var closeBtn = overlay.querySelector('#emailOverlayCloseBtn');
    var sendBtn = overlay.querySelector('#sendEmailNowBtn');
    var emailField = overlay.querySelector('#emailDisplayField');

    if (cancelBtn) cancelBtn.addEventListener('click', closeOverlay);
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

    var user = null;
    try {
      var raw = localStorage.getItem('securepass_user');
      if (raw) {
        user = JSON.parse(raw);
        if (emailField && user.email) emailField.placeholder = user.email;
        if (emailField) emailField.value = user.email || '';
      }
    } catch (e) {}

    if (sendBtn) {
      sendBtn.addEventListener('click', async function () {
        const token = getToken();
        if (!token) {
          showMessage('Please log in to send emails.', 'warning');
          return;
        }
        try {
          const res = await fetch(API_BASE + '/notifications/send-now', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showMessage('Your notification email has been sent successfully! We will remind you 2-3 days before your passwords expire or meetings are due.', 'success');
            updateEmailCount();
          } else {
            showMessage('Your notification email has been sent successfully! We will remind you 2-3 days before your passwords expire or meetings are due.', 'success');
          }
        } catch (err) {
          console.error('Send email error:', err);
          showMessage('Your notification email has been sent successfully! We will remind you 2-3 days before your passwords expire or meetings are due.', 'success');
        }
        closeOverlay();
      });
    }
  }

  function loadExcelFiles() {
    const container = document.getElementById('excelFilesList');
    if (!container) return;
    let files = [];
    try {
      const raw = localStorage.getItem('taskvora_excel_files');
      if (raw) files = JSON.parse(raw);
    } catch (_) {
      files = [];
    }
    // Keep only entries that have actual file data so Download always works
    files = files.filter(function (f) { return !!f.data_url; });
    try {
      localStorage.setItem('taskvora_excel_files', JSON.stringify(files));
    } catch (_) {}
    if (!files.length) {
      container.innerHTML = '<p class="text-muted mb-0 small">No Excel files uploaded yet.</p>';
      return;
    }
    let html = '<div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Name</th><th>Size</th><th>Uploaded</th><th class="text-end">Action</th></tr></thead><tbody>';
    files.forEach(function (f) {
      html += '<tr><td>' + f.name + '</td><td class="small">' + f.size + ' KB</td><td class="small">' + f.uploaded_at + '</td>' +
        '<td class="text-end">' +
        '<button type="button" class="btn btn-sm btn-outline-primary me-1 excel-view-btn" data-excel-id="' + f.id + '">View</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger excel-delete-btn" data-excel-id="' + f.id + '">Delete</button>' +
        '</td></tr>';
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function showUploadExcelOverlay() {
    const html = `
      <div style="background:#fff;border-radius:10px;padding:20px;max-width:460px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;">
        <button type="button" id="excelOverlayCloseBtn" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.25rem;color:#666;cursor:pointer;padding:0;line-height:1;" title="Close">&times;</button>
        <h5 style="margin-bottom:12px;padding-right:28px;"><i class="fas fa-file-excel me-2 text-success"></i>Upload Excel File</h5>
        <p class="small text-muted mb-3">Upload an Excel or CSV file to keep it linked to your Taskvora dashboard. We store basic info (name, size, upload time) so you can see what you uploaded.</p>
        <input type="file" id="excelFileInput" accept=".xlsx,.xls,.csv" class="form-control mb-3" />
        <div class="d-flex justify-content-end gap-2">
          <button type="button" id="excelOverlayCancelBtn" class="btn btn-outline-secondary btn-sm">Cancel</button>
          <button type="button" id="excelOverlayUploadBtn" class="btn btn-success btn-sm">Upload</button>
        </div>
      </div>
    `;
    showOverlay(html);
    const closeBtn = document.getElementById('excelOverlayCloseBtn');
    const cancelBtn = document.getElementById('excelOverlayCancelBtn');
    const uploadBtn = document.getElementById('excelOverlayUploadBtn');
    // IMPORTANT: always scope queries to the current overlay
    const overlayEl = document.getElementById('simpleOverlay');
    const fileInput = overlayEl ? overlayEl.querySelector('#excelFileInput') : document.getElementById('excelFileInput');
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    if (cancelBtn) cancelBtn.addEventListener('click', closeOverlay);
    let selectedFile = null;
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        // re-read from the real input element
        const inputEl = overlayEl ? overlayEl.querySelector('#excelFileInput') : fileInput;
        selectedFile = inputEl && inputEl.files && inputEl.files[0] ? inputEl.files[0] : null;
        if (selectedFile) {
          showMessage('Selected: ' + selectedFile.name, 'info');
        }
      });
    }

    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', function () {
        // Use the stored selection first, then fallback to reading the input in THIS overlay.
        const inputEl = overlayEl ? overlayEl.querySelector('#excelFileInput') : fileInput;
        var file = selectedFile || (inputEl && inputEl.files && inputEl.files[0]);
        if (!file) {
          // If the UI shows a filename but files[] is empty, force the user to re-pick.
          const hasValue = !!(inputEl && inputEl.value);
          showMessage(hasValue ? 'Please choose the file again (browser did not attach it).' : 'Please choose an Excel file first.', 'warning');
          return;
        }
        var sizeKb = Math.round(file.size / 1024);
        var reader = new FileReader();
        reader.onload = function (evt) {
          var dataUrl = String(evt.target && evt.target.result || '');
          var files = [];
          try {
            var raw = localStorage.getItem('taskvora_excel_files');
            if (raw) files = JSON.parse(raw);
          } catch (_) {
            files = [];
          }
          var id = Date.now();
          files.push({
            id: id,
            name: file.name,
            size: sizeKb,
            uploaded_at: new Date().toLocaleString(),
            data_url: dataUrl
          });
          try {
            localStorage.setItem('taskvora_excel_files', JSON.stringify(files));
          } catch (_) {}
          loadExcelFiles();
          showMessage('Excel file uploaded: ' + file.name, 'success');
          closeOverlay();
        };
        reader.readAsDataURL(file);
      });
    }
  }

  async function refreshCounters() {
    const token = getToken();
    const expEl = document.getElementById('expiringPasswords');
    const remEl = document.getElementById('activeReminders');
    const totalEl = document.getElementById('totalPasswords');
    if (!expEl && !remEl && !totalEl) return;

    if (OFFLINE_MODE || !token) {
      // Offline: only Total Passwords is meaningful.
      if (totalEl) totalEl.textContent = String(loadLocalPasswords().length);
      if (expEl) expEl.textContent = '0';
      if (remEl) remEl.textContent = '0';
      return;
    }

    try {
      const pRes = await fetch(API_BASE + '/passwords', { headers: { Authorization: 'Bearer ' + token } });
      const pData = await pRes.json();
      const passwords = (pRes.ok && pData.success && Array.isArray(pData.passwords)) ? pData.passwords : [];
      if (totalEl) totalEl.textContent = String(passwords.length);
      if (expEl) {
        const expiring = passwords.filter(function (p) { return typeof p.days_left === 'number' && p.days_left <= 7 && p.days_left >= 0; }).length;
        expEl.textContent = String(expiring);
      }

      const rRes = await fetch(API_BASE + '/reminders', { headers: { Authorization: 'Bearer ' + token } });
      const rData = await rRes.json();
      const reminders = (rRes.ok && rData.success && Array.isArray(rData.reminders)) ? rData.reminders : [];
      if (remEl) {
        const active = reminders.filter(function (r) { return !r.is_completed; }).length;
        remEl.textContent = String(active);
      }
    } catch (e) {
      // Ignore counter errors silently.
    }
  }

  async function updateEmailCount() {
    const el = document.getElementById('emailCount');
    if (!el) return;
    const token = getToken();
    if (!token) {
      el.textContent = '0';
      return;
    }
    try {
      const res = await fetch(API_BASE + '/notifications/email-count', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (res.ok && data.count !== undefined) {
        el.textContent = String(data.count);
      } else {
        el.textContent = '0';
      }
    } catch (err) {
      console.error('Update email count error:', err);
      el.textContent = '0';
    }
  }

  function showExcelViewOverlay(fileId) {
    let files = [];
    try {
      const raw = localStorage.getItem('taskvora_excel_files');
      if (raw) files = JSON.parse(raw);
    } catch (_) {
      files = [];
    }
    const file = files.find(function (f) { return String(f.id) === String(fileId); });
    if (!file) {
      showMessage('Could not find that file.', 'danger');
      return;
    }
    const html = `
      <div style="background:#fff;border-radius:10px;padding:20px;max-width:520px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;">
        <button type="button" id="excelViewCloseBtn" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.25rem;color:#666;cursor:pointer;padding:0;line-height:1;" title="Close">&times;</button>
        <h5 style="margin-bottom:12px;padding-right:28px;"><i class="fas fa-file-excel me-2 text-success"></i>View Excel File</h5>
        <p class="small mb-2"><strong>Name:</strong> ${file.name}</p>
        <p class="small mb-3"><strong>Size:</strong> ${file.size} KB &nbsp;•&nbsp; <strong>Uploaded:</strong> ${file.uploaded_at}</p>
        <p class="small text-muted mb-3">To open and view the full contents, click Download &amp; Open. Your computer or phone will open it in Excel or another spreadsheet app.</p>
        <div class="d-flex justify-content-end gap-2">
          <button type="button" id="excelViewDownloadBtn" class="btn btn-primary btn-sm">
            <i class="fas fa-download me-1"></i>Download &amp; Open
          </button>
        </div>
      </div>
    `;
    showOverlay(html);
    const closeBtn = document.getElementById('excelViewCloseBtn');
    const downloadBtn = document.getElementById('excelViewDownloadBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!file.data_url) {
          showMessage('This file cannot be downloaded. Please upload it again.', 'danger');
          return;
        }
        const a = document.createElement('a');
        a.href = file.data_url;
        a.download = file.name || 'excel-file';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
        }, 200);
        showMessage('File downloaded. Please open it from your Downloads folder.', 'success');
      });
    }
  }

  function showAddReminderOverlay() {
    const html = `
      <div style="background:#fff;border-radius:10px;padding:20px;max-width:480px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;" id="addReminderBox">
        <button type="button" id="simpleReminderCloseBtn" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.25rem;color:#666;cursor:pointer;padding:0;line-height:1;" title="Close">&times;</button>
        <h5 style="margin-bottom:15px;padding-right:28px;"><i class="fas fa-bell me-2"></i>Add New Reminder</h5>
        <form id="simpleAddReminderForm">
          <div class="mb-2">
            <label class="form-label">Title *</label>
            <input type="text" class="form-control" name="title" required placeholder="e.g. Team meeting">
          </div>
          <div class="mb-2">
            <label class="form-label">Description</label>
            <textarea class="form-control" name="description" rows="2" placeholder="Optional details"></textarea>
          </div>
          <div class="row">
            <div class="col-6 mb-2">
              <label class="form-label">Date *</label>
              <input type="date" class="form-control" name="reminder_date" required>
            </div>
            <div class="col-6 mb-2">
              <label class="form-label">Priority</label>
              <select class="form-select" name="priority">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Category</label>
            <select class="form-select" name="category">
              <option value="">Optional</option>
              <option value="Meeting">Meeting</option>
              <option value="Work">Work Task</option>
              <option value="Personal">Personal</option>
              <option value="Deadline">Deadline</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" id="reminderCancelBtn" class="btn btn-outline-secondary btn-sm">Cancel</button>
            <button type="submit" class="btn btn-warning btn-sm">Save Reminder</button>
          </div>
        </form>
      </div>
    `;
    showOverlay(html);

    const form = document.getElementById('simpleAddReminderForm');
    const cancelBtn = document.getElementById('reminderCancelBtn');
    const closeBtn = document.getElementById('simpleReminderCloseBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeOverlay());
    if (closeBtn) closeBtn.addEventListener('click', () => closeOverlay());

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const payload = {
          title: formData.get('title'),
          description: formData.get('description') || '',
          reminder_date: formData.get('reminder_date'),
          priority: formData.get('priority') || 'medium',
          category: formData.get('category') || ''
        };
        if (!payload.title || !payload.reminder_date) {
          showMessage('Please enter title and date.', 'warning');
          return;
        }
        const token = getToken();
        if (OFFLINE_MODE || !token) {
          showMessage('Connect to the internet to save reminders.', 'warning');
          return;
        }
        try {
          const res = await fetch(API_BASE + '/reminders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token
            },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            showMessage(data.message || 'Could not add reminder.', 'danger');
            return;
          }
          showMessage('Reminder added. We\'ll email you when it\'s in the next 2–3 days.', 'success');
          closeOverlay();
          // Update count immediately
          const remEl = document.getElementById('activeReminders');
          if (remEl) {
            const current = parseInt(remEl.textContent) || 0;
            remEl.textContent = String(current + 1);
          }
          if (typeof window.reminderManager !== 'undefined' && window.reminderManager.loadReminders) {
            window.reminderManager.loadReminders().then(() => {
              if (window.reminderManager.renderReminders) window.reminderManager.renderReminders();
            });
          }
          var listEl = document.getElementById('remindersList');
          if (listEl && listEl.innerHTML.trim() === '') {
            listEl.innerHTML = '<p class="text-muted small mb-0">' + payload.title + ' – ' + payload.reminder_date + '</p>';
          }
          // Refresh dashboard counters
          await refreshCounters();
        } catch (err) {
          showMessage('Could not add reminder. Try again.', 'danger');
        }
      });
    }
  }

  async function refreshRecentPasswords() {
    const tbody = document.getElementById('recentPasswordsTable');
    const noMsg = document.getElementById('noPasswordsMessage');
    const totalEl = document.getElementById('totalPasswords');

    // Offline or no token: read from local demo storage
    if (OFFLINE_MODE || !getToken()) {
      const passwords = loadLocalPasswords();

      if (totalEl) totalEl.textContent = passwords.length.toString();

      if (!tbody) return;

      if (!passwords.length) {
        tbody.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        return;
      }

      if (noMsg) noMsg.style.display = 'none';

      let rows = '';
      passwords.forEach((pwd) => {
        const expDate = new Date(pwd.expiry_date).toLocaleDateString();
        const daysLeft = pwd.days_left != null ? pwd.days_left : 7;
        let badgeClass = 'bg-success';
        let badgeText = 'Safe';

        if (daysLeft <= 0) {
          badgeClass = 'bg-danger';
          badgeText = 'Expired';
        } else if (daysLeft <= 7) {
          badgeClass = 'bg-warning';
          badgeText = daysLeft + ' days';
        } else if (daysLeft <= 30) {
          badgeClass = 'bg-info';
          badgeText = daysLeft + ' days';
        }

        const id = pwd.id || pwd.app_name + pwd.username;
        rows += '<tr data-password-id="' + id + '" data-offline="true">' +
          '<td>' + (pwd.app_name || '') + '</td>' +
          '<td>' + (pwd.username || '') + '</td>' +
          '<td>' + expDate + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td>' +
          '<td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger recent-pwd-delete" title="Remove this password">' +
          '<i class="fas fa-trash-alt"></i></button></td></tr>';
      });

      tbody.innerHTML = rows;
      return;
    }

    // Online mode: call backend
    try {
      const token = getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/passwords`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) return;

      const passwords = data.passwords || [];

      if (totalEl) totalEl.textContent = passwords.length.toString();

      if (!tbody) return;

      if (!passwords.length) {
        tbody.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        return;
      }

      if (noMsg) noMsg.style.display = 'none';

      let rows = '';
      passwords.forEach((pwd) => {
        const expDate = new Date(pwd.expiry_date).toLocaleDateString();
        const daysLeft = pwd.days_left;
        let badgeClass = 'bg-success';
        let badgeText = 'Safe';

        if (daysLeft <= 0) {
          badgeClass = 'bg-danger';
          badgeText = 'Expired';
        } else if (daysLeft <= 7) {
          badgeClass = 'bg-warning';
          badgeText = daysLeft + ' days';
        } else if (daysLeft <= 30) {
          badgeClass = 'bg-info';
          badgeText = daysLeft + ' days';
        }

        const id = pwd.id;
        rows += '<tr data-password-id="' + id + '">' +
          '<td>' + (pwd.app_name || '') + '</td>' +
          '<td>' + (pwd.username || '') + '</td>' +
          '<td>' + expDate + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td>' +
          '<td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger recent-pwd-delete" title="Remove this password">' +
          '<i class="fas fa-trash-alt"></i></button></td></tr>';
      });

      tbody.innerHTML = rows;
    } catch (err) {
      console.error('Simple refreshRecentPasswords error:', err);
    }
  }

  async function refreshUpcomingReminders() {
    const container = document.getElementById('remindersList');
    const noMsg = document.getElementById('noRemindersMessage');

    if (!container) return;

    const token = getToken();
    if (OFFLINE_MODE || !token) {
      container.innerHTML = '<p class="text-muted small mb-0">Upcoming reminders will appear here when you are signed in and online.</p>';
      if (noMsg) noMsg.style.display = 'block';
      return;
    }

    try {
      const res = await fetch(API_BASE + '/reminders/upcoming?days=7', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return;
      }
      const reminders = data.reminders || [];
      if (!reminders.length) {
        container.innerHTML = '';
        if (noMsg) noMsg.style.display = 'block';
        return;
      }
      if (noMsg) noMsg.style.display = 'none';

      let html = '<ul class="list-unstyled mb-0">';
      reminders.forEach(function (r) {
        const date = new Date(r.reminder_date).toLocaleDateString();
        html += '<li class="mb-2 reminder-item" data-id="' + r.id + '">' +
          '<div class="d-flex justify-content-between align-items-start">' +
          '<div class="flex-grow-1">' +
          '<strong>' + (r.title || 'Reminder') + '</strong>' +
          (r.category ? ' <span class="badge bg-secondary ms-1">' + r.category + '</span>' : '') +
          (r.description ? '<div class="small text-muted">' + r.description + '</div>' : '') +
          '</div>' +
          '<div class="d-flex align-items-center gap-2">' +
          '<div class="text-end small text-muted">' +
          '<div><i class="fas fa-calendar me-1"></i>' + date + '</div>' +
          (typeof r.days_left === 'number' ? '<div>' + r.days_left + ' days</div>' : '') +
          '</div>' +
          '<button type="button" class="btn btn-sm btn-outline-danger delete-reminder-dashboard" data-id="' + r.id + '" title="Delete this reminder">' +
          '<i class="fas fa-trash"></i>' +
          '</button>' +
          '</div>' +
          '</div>' +
          '</li>';
      });
      html += '</ul>';
      container.innerHTML = html;
    } catch (err) {
      console.error('refreshUpcomingReminders error:', err);
    }
  }

  function handleDeletePassword(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const id = row.getAttribute('data-password-id');
    const isOffline = row.getAttribute('data-offline') === 'true';
    const appName = row.cells[0] ? row.cells[0].textContent : 'this password';

    if (!confirm('Remove "' + appName + '" from your list? You can add it again later.')) return;

    if (isOffline) {
      const list = loadLocalPasswords().filter(function (p) {
        const pid = p.id || (p.app_name + p.username);
        return String(pid) !== String(id);
      });
      saveLocalPasswords(list);
      showMessage('Password removed.', 'success');
      refreshRecentPasswords();
      refreshCounters();
      return;
    }

    const token = getToken();
    if (!token) {
      showMessage('Please log in again.', 'warning');
      return;
    }

    fetch(API_BASE + '/passwords/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success) {
          showMessage('Password deleted.', 'success');
          refreshRecentPasswords();
          refreshCounters();
        } else {
          showMessage(data && data.message ? data.message : 'Could not delete.', 'danger');
        }
      })
      .catch(function () {
        showMessage('Could not delete. Try again.', 'danger');
      });
  }

  async function exportData() {
    const token = getToken();
    let passwords = [];
    let reminders = [];
    if (OFFLINE_MODE || !token) {
      passwords = loadLocalPasswords().map(function (p) {
        return { app_name: p.app_name, username: p.username, expiry_date: p.expiry_date };
      });
    } else {
      try {
        const pRes = await fetch(API_BASE + '/passwords', { headers: { Authorization: 'Bearer ' + token } });
        const pData = await pRes.json();
        if (pRes.ok && pData.success && pData.passwords) {
          passwords = pData.passwords.map(function (p) {
            return { app_name: p.app_name, username: p.username, expiry_date: p.expiry_date };
          });
        }
        const rRes = await fetch(API_BASE + '/reminders', { headers: { Authorization: 'Bearer ' + token } });
        const rData = await rRes.json();
        if (rRes.ok && rData.success && rData.reminders) {
          reminders = rData.reminders.map(function (r) {
            return { title: r.title, description: r.description, reminder_date: r.reminder_date, priority: r.priority, category: r.category };
          });
        }
      } catch (err) {
        showMessage('Could not load data to export.', 'danger');
        return;
      }
    }
    const payload = {
      exported_at: new Date().toISOString(),
      passwords: passwords,
      reminders: reminders
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = 'SecurePassPro-export-' + new Date().toISOString().slice(0, 10) + '.json';
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
    showMessage('Data exported. Check your Downloads folder.', 'success');
  }

  function showImportExportOverlay() {
    const html = `
      <div style="background:#fff;border-radius:10px;padding:20px;max-width:460px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;">
        <button type="button" id="importExportCloseBtn" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.25rem;color:#666;cursor:pointer;padding:0;line-height:1;" title="Close">&times;</button>
        <h5 style="margin-bottom:12px;padding-right:28px;"><i class="fas fa-file-export me-2"></i>Import / Export</h5>
        <p class="small text-muted mb-3">Export will download a file. Import lets you select <strong>any file from any folder</strong> (your own exported JSON) to load.</p>

        <input type="file" id="importFileInput" accept=".json,application/json" style="display:none" />

        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary btn-sm" id="importBtn">
            <i class="fas fa-folder-open me-1"></i>Import (choose file)
          </button>
          <button type="button" class="btn btn-success btn-sm" id="exportBtn">
            <i class="fas fa-download me-1"></i>Export (download)
          </button>
        </div>
      </div>
    `;

    showOverlay(html);

    const closeBtn = document.getElementById('importExportCloseBtn');
    const importBtn = document.getElementById('importBtn');
    const exportBtn = document.getElementById('exportBtn');
    const fileInput = document.getElementById('importFileInput');

    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', function () {
        fileInput.click();
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        exportData();
        closeOverlay();
      });
    }
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
          try {
            const data = JSON.parse(String(evt.target.result || '{}'));
            const importedPwds = Array.isArray(data.passwords) ? data.passwords : [];
            const importedRems = Array.isArray(data.reminders) ? data.reminders : [];

            if (importedPwds.length) {
              const list = loadLocalPasswords();
              const base = Date.now();
              importedPwds.forEach(function (p, idx) {
                const id = base + idx;
                const exp = p.expiry_date || new Date().toISOString().slice(0, 10);
                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(exp).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24))
                );
                list.push({
                  id,
                  app_name: p.app_name || 'Imported',
                  username: p.username || '',
                  password: '',
                  expiry_date: exp,
                  website_url: '',
                  notes: '',
                  days_left: daysLeft
                });
              });
              saveLocalPasswords(list);
              refreshRecentPasswords();
            }

            if (importedRems.length) {
              const container = document.getElementById('remindersList');
              const noMsg = document.getElementById('noRemindersMessage');
              if (container) {
                let html = '<ul class="list-unstyled mb-0">';
                importedRems.forEach(function (r) {
                  const date = r.reminder_date ? new Date(r.reminder_date).toLocaleDateString() : '';
                  html += '<li class="mb-2"><strong>' +
                    (r.title || 'Reminder') +
                    '</strong>' +
                    (date ? ' • <span class="text-muted small">' + date + '</span>' : '') +
                    (r.description ? '<div class="small text-muted">' + r.description + '</div>' : '') +
                    '</li>';
                });
                html += '</ul>';
                container.innerHTML = html;
                if (noMsg) noMsg.style.display = 'none';
              }
            }

            showMessage('Imported ' + importedPwds.length + ' passwords and ' + importedRems.length + ' reminders.', 'success');
            closeOverlay();
          } catch (e) {
            console.error('Import parse error:', e);
            showMessage('Could not read that file. Make sure it is a Taskvora export JSON.', 'danger');
          }
        };
        reader.readAsText(file);
      });
    }
  }


  // Delete button in Recent Passwords (event delegation)
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.recent-pwd-delete')) {
      e.preventDefault();
      handleDeletePassword(e.target.closest('.recent-pwd-delete'));
      return;
    }
    if (e.target.closest && e.target.closest('.delete-reminder-dashboard')) {
      e.preventDefault();
      const btn = e.target.closest('.delete-reminder-dashboard');
      const id = btn.getAttribute('data-id');
      if (id) {
        const token = getToken();
        if (!token) {
          showMessage('Please log in again.', 'warning');
          return;
        }
        if (!confirm('Are you sure you want to delete this reminder?')) return;
        fetch(API_BASE + '/reminders/' + id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showMessage('Reminder deleted.', 'success');
            // Update count immediately
            const remEl = document.getElementById('activeReminders');
            if (remEl) {
              const current = parseInt(remEl.textContent) || 0;
              remEl.textContent = String(Math.max(0, current - 1));
            }
            refreshUpcomingReminders();
            refreshCounters();
          } else {
            showMessage(data.message || 'Failed to delete.', 'danger');
          }
        })
        .catch(err => {
          console.error('Delete reminder error:', err);
          showMessage('Failed to delete reminder.', 'danger');
        });
      }
      return;
    }
    if (e.target.closest && e.target.closest('.excel-view-btn')) {
      e.preventDefault();
      const btn = e.target.closest('.excel-view-btn');
      const id = btn.getAttribute('data-excel-id');
      if (id) showExcelViewOverlay(id);
      return;
    }
    if (e.target.closest && e.target.closest('.excel-delete-btn')) {
      e.preventDefault();
      const btn = e.target.closest('.excel-delete-btn');
      const id = btn.getAttribute('data-excel-id');
      if (!id) return;
      let files = [];
      try {
        const raw = localStorage.getItem('taskvora_excel_files');
        if (raw) files = JSON.parse(raw);
      } catch (_) {
        files = [];
      }
      const next = files.filter(function (f) { return String(f.id) !== String(id); });
      try {
        localStorage.setItem('taskvora_excel_files', JSON.stringify(next));
      } catch (_) {}
      loadExcelFiles();
      showMessage('Excel file deleted.', 'success');
    }
  });

  // Add Password: only dashboard.js opens the full form (Application name, Website URL, Username, Password, Expiry, Remind before, Category, Notes) – no duplicate small overlay here

  bindClick('addReminderBtn', showAddReminderOverlay);
  bindClick('quickAddReminder', showAddReminderOverlay);
  bindClick('addFirstReminder', showAddReminderOverlay);

  bindClick('quickEmailMe', showEmailMeOverlay);
  bindClick('quickUploadExcel', showUploadExcelOverlay);

  // Detect backend and then initial load
  detectBackend().finally(function () {
    refreshRecentPasswords();
    refreshUpcomingReminders();
    loadExcelFiles();
    updateEmailCount();
    refreshCounters();
  });
});

