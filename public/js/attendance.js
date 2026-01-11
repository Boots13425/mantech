// Initialize page on load
document.addEventListener("DOMContentLoaded", () => {
  // Set today's date as default
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("attendance-date").value = today

  // Load attendance data
  loadAttendanceData()
  // Create override modal on page load
  createOverrideModal()
})

async function loadAttendanceData() {
  try {
    showLoading(true)
    hideErrorMessage()

    const date = document.getElementById("attendance-date").value
    const response = await fetch(`/api/attendance/history?start_date=${date}&end_date=${date}`)

    if (!response.ok) {
      throw new Error("Failed to load attendance data")
    }

    const data = await response.json()

    if (data.records && data.records.length > 0) {
      populateAttendanceTable(data.records)
      showLoading(false)
    } else {
      showEmptyState()
      showLoading(false)
    }
  } catch (error) {
    console.error("[v0] Attendance load error:", error)
    showErrorMessage("Failed to load attendance data. Please try again.")
    showLoading(false)
  }
}

function populateAttendanceTable(records) {
  const tbody = document.getElementById("attendance-tbody")
  tbody.innerHTML = ""

  if (!records || records.length === 0) {
    showEmptyState()
    return
  }

  records.forEach((record) => {
    const row = document.createElement("tr")
    const status = record.status.charAt(0).toUpperCase() + record.status.slice(1)
    const statusClass = record.status === "present" ? "status-present" : "status-absent"
    const signInTime = record.sign_in_time ? new Date(record.sign_in_time).toLocaleTimeString() : "—"
    const overrideStatus = record.is_override ? "Yes" : "No"

    row.innerHTML = `
      <td>${record.id}</td>
      <td>${record.first_name} ${record.last_name}</td>
      <td>${record.email}</td>
      <td>${record.department || "N/A"}</td>
      <td>${signInTime}</td>
      <td>
        <span class="status-badge ${statusClass}">
          ${status === "Present" ? "✓" : "✗"} ${status}
        </span>
      </td>
      <td>${overrideStatus}</td>
      <td>
        <button class="btn-override" onclick="openOverrideModal(${record.intern_id}, '${record.attendance_date}', '${record.status}')">
          Override
        </button>
      </td>
    `
    tbody.appendChild(row)
  })

  document.getElementById("empty-state").style.display = "none"
  document.querySelector(".attendance-list-wrapper").style.display = "block"
}

function openOverrideModal(internId, date, currentStatus) {
  // Display intern name and date info in modal
  document.getElementById("override-intern-name").textContent = `Intern ID: ${internId} - Date: ${date}`
  // Store intern_id and date as data attributes instead of hidden inputs
  document.getElementById("override-modal").dataset.internId = internId
  document.getElementById("override-modal").dataset.date = date
  document.getElementById("override-status").value = currentStatus.toLowerCase()
  document.getElementById("override-reason").value = ""
  document.getElementById("override-modal").style.display = "flex"
}

function createOverrideModal() {
  const modalHTML = `
    <div id="override-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Override Attendance</h2>
          <button class="close-btn" onclick="closeModal('override-modal')">&times;</button>
        </div>
        <div class="modal-body">
          <p><strong>Date:</strong> <span id="override-date"></span></p>
          <p><strong>Current Status:</strong> <span id="override-current-status"></span></p>
          
          <label for="override-status">New Status:</label>
          <select id="override-status" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
          
          <label for="override-reason" style="margin-top: 16px; display: block;">Reason for Override:</label>
          <textarea id="override-reason" placeholder="e.g., Excused absence, Sick leave, etc." style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; min-height: 80px;"></textarea>
          
          <span id="override-intern-name" style="display: block; margin-top: 16px;"></span>
        </div>
        <div class="modal-footer" style="display: flex; gap: 10px; padding: 20px; border-top: 1px solid #e2e8f0;">
          <button class="btn-primary" onclick="saveOverride()">Save Override</button>
          <button class="btn-secondary" onclick="closeModal('override-modal')" style="background: #e2e8f0; color: #2d3748;">Cancel</button>
        </div>
      </div>
    </div>
  `

  document.body.insertAdjacentHTML("beforeend", modalHTML)
}

async function saveOverride() {
  try {
    const modal = document.getElementById("override-modal")
    const internId = Number.parseInt(modal.dataset.internId)
    const date = modal.dataset.date
    const status = document.getElementById("override-status").value
    const reason = document.getElementById("override-reason").value
    const adminId = localStorage.getItem("user_id") || 1

    console.log("[v0] Saving override - internId:", internId, "date:", date, "status:", status)

    if (!reason.trim()) {
      showErrorMessage("Please provide a reason for the override.")
      return
    }

    const response = await fetch("/api/attendance/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intern_id: internId,
        date: date,
        status: status,
        reason: reason,
        admin_id: adminId,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to override attendance")
    }

    showSuccessModal("Attendance overridden successfully")
    closeModal("override-modal")
    loadAttendanceByDate()
  } catch (error) {
    console.error("[v0] Override error:", error)
    showErrorMessage("Failed to override attendance. Please try again.")
  }
}

// Toggle attendance status
function toggleStatus(element, internId) {
  const isPresent = element.textContent.includes("Present")
  const newStatus = isPresent ? "Absent" : "Present"
  const newClass = isPresent ? "status-absent" : "status-present"
  const symbol = isPresent ? "✗" : "✓"

  element.textContent = `${symbol} ${newStatus}`
  element.className = `status-badge ${newClass}`
}

// Export to Excel
async function exportToExcel() {
  try {
    const date = document.getElementById("attendance-date").value
    const today = new Date().toISOString().split("T")[0]

    if (date > today) {
      showErrorMessage("Cannot export attendance for future dates.")
      return
    }

    const response = await fetch(`/api/attendance/export?date=${date}`, {
      method: "GET",
    })

    if (!response.ok) {
      const errorData = await response.json()
      showErrorMessage(errorData.message || "Failed to export attendance")
      return
    }

    const contentDisposition = response.headers.get("content-disposition")
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1].replace(/"/g, "")
      : `attendance-${date}.xlsx`

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)

    showSuccessModal(`Attendance exported successfully as ${filename}`)
  } catch (error) {
    console.error("[v0] Export error:", error)
    showErrorMessage("Failed to export attendance. Please try again.")
  }
}

// Load attendance by date function
async function loadAttendanceByDate() {
  try {
    showLoading(true)
    hideErrorMessage()

    const date = document.getElementById("attendance-date").value
    const response = await fetch(`/api/attendance/history?start_date=${date}&end_date=${date}`)

    if (!response.ok) {
      throw new Error("Failed to load attendance data")
    }

    const data = await response.json()

    if (data.records && data.records.length > 0) {
      populateAttendanceTable(data.records)
      showLoading(false)
    } else {
      showEmptyState()
      showLoading(false)
    }
  } catch (error) {
    console.error("[v0] Attendance load error:", error)
    showErrorMessage("Failed to load attendance data. Please try again.")
    showLoading(false)
  }
}

// UI Helper Functions
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "flex" : "none"
}

function showEmptyState() {
  document.getElementById("empty-state").style.display = "block"
  document.querySelector(".attendance-list-wrapper").style.display = "none"
}

function showErrorMessage(message) {
  const errorDiv = document.getElementById("error-message")
  errorDiv.textContent = message
  errorDiv.style.display = "block"
}

function hideErrorMessage() {
  document.getElementById("error-message").style.display = "none"
}

function showSuccessModal(message) {
  document.getElementById("success-message").textContent = message
  document.getElementById("success-modal").style.display = "flex"
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = "none"
}

function goBack() {
  window.location.href = "/dashboard.html"
}
