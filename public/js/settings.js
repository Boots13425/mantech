// Settings Page JavaScript

// Basic state and initialization
document.addEventListener('DOMContentLoaded', () => {
  initSettingsNavigation()
  loadAdminProfile()
  loadAdminUsers()
  loadBackupInfo()
  applySavedTheme()
})

// Navigation handling
function initSettingsNavigation() {
  document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      const section = btn.dataset.section
      document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'))
      const el = document.getElementById(section)
      if (el) el.classList.add('active')
    })
  })
}

// Load admin profile from server (placeholder)
async function loadAdminProfile() {
  try {
    const res = await fetch('/api/admin/profile')
    if (res.ok) {
      const profile = await res.json()
      document.getElementById('adminEmail').value = profile.email || ''
      document.getElementById('adminName').value = profile.name || ''
    } else {
      // fallback to localStorage
      document.getElementById('adminEmail').value = localStorage.getItem('adminEmail') || ''
      document.getElementById('adminName').value = localStorage.getItem('adminName') || ''
    }
  } catch (err) {
    console.warn('Could not fetch admin profile, using local values', err)
    document.getElementById('adminEmail').value = localStorage.getItem('adminEmail') || ''
    document.getElementById('adminName').value = localStorage.getItem('adminName') || ''
  }
}

// Edit name/email handlers (open modal or inline edit)
function editEmail() {
  document.getElementById('newEmailInput').value = document.getElementById('adminEmail').value
  document.getElementById('emailPassword').value = ''
  document.getElementById('editEmailModal').style.display = 'flex'
}

function closeEditEmailModal() {
  document.getElementById('editEmailModal').style.display = 'none'
}

async function saveNewEmail(e) {
  e.preventDefault()
  const newEmail = document.getElementById('newEmailInput').value.trim()
  const password = document.getElementById('emailPassword').value

  if (!newEmail || !password) {
    alert('Please provide the new email and confirm with your password')
    return
  }

  try {
    const res = await apiRequest('/api/admin/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password })
    })

    if (res.ok) {
      // Try to read JSON message if available, but success is primary
      document.getElementById('adminEmail').value = newEmail
      localStorage.setItem('adminEmail', newEmail)
      closeEditEmailModal()
      alert('Email changed successfully')
    } else if (res.status === 404) {
      alert('Server endpoint not found (404). Email change is not implemented on the server yet.')
    } else {
      // Show message from server if available
      const msg = res.body && (res.body.message || res.body.error || res.body) ? (res.body.message || res.body.error || res.body) : 'Failed to change email'
      alert(msg)
    }
  } catch (err) {
    console.error(err)
    alert('Network error while changing email')
  }
}

// Helper to perform fetch and safely parse JSON or text
async function apiRequest(url, opts) {
  try {
    const resp = await fetch(url, opts)
    const contentType = resp.headers.get('content-type') || ''
    let body = null
    try {
      if (contentType.includes('application/json')) body = await resp.json()
      else body = await resp.text()
    } catch (e) {
      // parsing failed, keep raw text
      try { body = await resp.text() } catch (e2) { body = null }
    }
    return { ok: resp.ok, status: resp.status, body }
  } catch (err) {
    throw err
  }
}

function editName() {
  const input = document.getElementById('adminName')
  input.readOnly = false
  input.focus()
  input.addEventListener('blur', async () => {
    input.readOnly = true
    const name = input.value.trim()
    localStorage.setItem('adminName', name)
    // send to server
    try {
      await fetch('/api/admin/update-name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    } catch (err) { console.warn('Failed to update admin name', err) }
  }, { once: true })
}

// Password change modal
function openChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'flex'
}

function closeChangePasswordModal() {
  document.getElementById('changePasswordModal').style.display = 'none'
}

async function saveNewPassword(e) {
  e.preventDefault()
  const current = document.getElementById('currentPassword').value
  const newPass = document.getElementById('newPassword').value
  const confirm = document.getElementById('confirmPassword').value

  if (!current || !newPass || !confirm) { alert('Please fill all fields'); return }
  if (newPass.length < 8) { alert('Password must be at least 8 characters'); return }
  if (newPass !== confirm) { alert('Passwords do not match'); return }

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current, newPass })
    })
    const r = await res.json()
    if (res.ok) {
      closeChangePasswordModal()
      alert('Password changed successfully')
    } else {
      alert(r.message || 'Failed to change password')
    }
  } catch (err) {
    console.error('Password change error', err);
    alert('Network error while changing password')
  }
}

// 2FA placeholder
function enableTwoFactor() { alert('Two-Factor setup coming soon') }
function viewActiveSessions() { alert('Active sessions list coming soon') }

// Theme & platform settings
function setTheme(theme) {
  localStorage.setItem('appTheme', theme)
  applySavedTheme()
}

function applySavedTheme() {
  const theme = localStorage.getItem('appTheme') || 'light'
  document.documentElement.setAttribute('data-theme', theme)

  // helper to add/remove dark class
  const applyDarkClass = (useDark) => {
    if (useDark) document.body.classList.add('dark-theme')
    else document.body.classList.remove('dark-theme')
  }

  // Clean up previous media listener if present
  const cleanupMediaListener = () => {
    if (window.__themeMedia && window.__themeMediaListener) {
      try {
        if (window.__themeMedia.removeEventListener) window.__themeMedia.removeEventListener('change', window.__themeMediaListener)
        else if (window.__themeMedia.removeListener) window.__themeMedia.removeListener(window.__themeMediaListener)
      } catch (e) {}
      window.__themeMedia = null
      window.__themeMediaListener = null
    }
  }

  if (theme === 'dark') {
    applyDarkClass(true)
    cleanupMediaListener()
  } else if (theme === 'auto') {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    const prefersDark = mq ? mq.matches : false
    applyDarkClass(prefersDark)

    // listen for changes to system preference
    if (mq) {
      cleanupMediaListener()
      const listener = (e) => applyDarkClass(e.matches)
      // add listener (support older browsers)
      if (mq.addEventListener) mq.addEventListener('change', listener)
      else if (mq.addListener) mq.addListener(listener)
      window.__themeMedia = mq
      window.__themeMediaListener = listener
    }
  } else {
    applyDarkClass(false)
    cleanupMediaListener()
  }

  // set radio inputs
  const radios = document.querySelectorAll('input[name="theme"]')
  radios.forEach(r => r.checked = (r.value === theme))
}

function toggleCompactMode() {
  const enabled = document.getElementById('compactMode').checked
  localStorage.setItem('compactMode', enabled ? '1' : '0')
  document.documentElement.setAttribute('data-compact', enabled ? '1' : '0')
}

function savePlatformSettings() {
  // Example: save timezone/date format/notifications
  const timezone = document.getElementById('timezone').value
  const dateFormat = document.getElementById('dateFormat').value
  const notifications = document.getElementById('notificationsEnabled').checked
  localStorage.setItem('platformSettings', JSON.stringify({ timezone, dateFormat, notifications }))
  alert('Platform settings saved')
}

// User management
async function addAdminUser(e) {
  e.preventDefault()
  const email = document.getElementById('newAdminEmail').value.trim()
  const name = document.getElementById('newAdminName').value.trim()
  const permission = document.getElementById('adminPermission').value
  const status = document.getElementById('adminStatus').value

  if (!email || !name) { alert('Please fill required fields'); return }

  try {
    const res = await fetch('/api/admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, permission, status }) })
    const r = await res.json()
    if (res.ok) {
      alert('Admin user added')
      loadAdminUsers()
    } else alert(r.message || 'Failed to add admin')
  } catch (err) { console.error('Add admin error', err); alert('Network error') }
}

async function loadAdminUsers() {
  try {
    const res = await fetch('/api/admins')
    const list = res.ok ? await res.json() : []
    const container = document.getElementById('adminUsersList')
    container.innerHTML = ''
    (list || []).forEach(user => {
      const div = document.createElement('div')
      div.className = 'user-item'
      div.innerHTML = `
        <div class="user-info">
          <span class="user-name">${user.name}</span>
          <span class="user-email">${user.email}</span>
          <span class="user-permission">${user.permission}</span>
        </div>
        <div class="user-actions">
          <button class="btn btn-secondary" onclick="toggleAdminStatus(${user.id}, '${user.status === 'active' ? 'inactive' : 'active'}')">${user.status === 'active' ? 'Deactivate' : 'Activate'}</button>
          <button class="btn btn-warning" onclick="removeAdminUser(${user.id})">Remove</button>
        </div>`
      container.appendChild(div)
    })
  } catch (err) { console.warn('Failed to load admin users', err) }
}

async function toggleAdminStatus(id, newStatus) {
  try {
    await fetch(`/api/admins/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
    loadAdminUsers()
  } catch (err) { console.warn(err); alert('Failed to update status') }
}

async function removeAdminUser(id) {
  if (!confirm('Are you sure you want to remove this admin?')) return
  try {
    await fetch(`/api/admins/${id}`, { method: 'DELETE' })
    loadAdminUsers()
  } catch (err) { console.warn(err); alert('Failed to remove admin') }
}

function saveUserSettings() {
  const allowDashboard = document.getElementById('allowStudentDashboard').checked
  const allowAttendance = document.getElementById('allowStudentAttendance').checked
  const allowReceipts = document.getElementById('allowStudentReceipts').checked
  localStorage.setItem('userSettings', JSON.stringify({ allowDashboard, allowAttendance, allowReceipts }))
  alert('User settings saved')
}

// Data & Security
async function loadBackupInfo() {
  try {
    const res = await fetch('/api/backups/last')
    if (res.ok) {
      const info = await res.json()
      document.getElementById('lastBackupTime').textContent = info.lastBackup || 'Never'
      document.getElementById('backupStatus').textContent = info.status || 'Unknown'
    }
  } catch (err) { console.warn('Failed to load backup info', err) }
}

async function performBackup() {
  try {
    const res = await fetch('/api/backups/create', { method: 'POST' })
    if (res.ok) {
      alert('Backup started')
      loadBackupInfo()
    } else {
      const r = await res.json(); alert(r.message || 'Failed to start backup')
    }
  } catch (err) { console.error(err); alert('Network error when starting backup') }
}

async function downloadBackup() {
  try {
    const res = await fetch('/api/backups/download')
    if (!res.ok) { const r = await res.json(); alert(r.message || 'Failed to download'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'mantech-backup.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  } catch (err) { console.error(err); alert('Failed to download backup') }
}

async function restoreFromBackup() {
  const file = document.getElementById('restoreFile').files[0]
  const select = document.getElementById('backupSelect').value
  if (!file && !select) { alert('Please select a backup or upload a file'); return }

  if (!confirm('Restoring will overwrite current data. Continue?')) return

  const form = new FormData()
  if (file) form.append('file', file)
  else form.append('backupId', select)

  try {
    const res = await fetch('/api/backups/restore', { method: 'POST', body: form })
    const r = await res.json()
    if (res.ok) alert('Restore started')
    else alert(r.message || 'Failed to start restore')
  } catch (err) { console.error(err); alert('Network/restore error') }
}

async function exportAuditLog() {
  const start = document.getElementById('auditStartDate').value
  const end = document.getElementById('auditEndDate').value
  try {
    const res = await fetch(`/api/audit/export?start=${start}&end=${end}`)
    if (!res.ok) { const r = await res.json(); alert(r.message || 'Failed to export'); return }
    const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'audit-log.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  } catch (err) { console.error(err); alert('Export error') }
}

async function viewAuditLog() { alert('Audit log viewer coming soon') }

async function exportData(type) {
  try {
    const res = await fetch(`/api/export/${type}`)
    if (!res.ok) { const r = await res.json(); alert(r.message || 'Failed to export'); return }
    const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${type}-export.zip`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  } catch (err) { console.error(err); alert('Export error') }
}

async function runSecurityCheck() { alert('Running security checks... (placeholder)'); setTimeout(()=>alert('Security check complete'), 1200) }

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  const changeModal = document.getElementById('changePasswordModal')
  const emailModal = document.getElementById('editEmailModal')
  if (e.target === changeModal) closeChangePasswordModal()
  if (e.target === emailModal) closeEditEmailModal()
})
