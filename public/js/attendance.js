// Initialize page on load
document.addEventListener("DOMContentLoaded", () => {
  // Set today's date as default
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("attendance-date").value = today

  // Load attendance data
  loadAttendanceData()
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
    const statusRaw = (record.status || "absent").toLowerCase()
    let statusDisplay = ""
    let statusClass = ""
    let statusSymbol = ""

    switch (statusRaw) {
      case "present":
        statusDisplay = "Present"
        statusClass = "status-present"
        statusSymbol = "✓"
        break
      case "late":
        statusDisplay = "Late"
        statusClass = "status-late"
        statusSymbol = "⌛"
        break
      case "excused":
        statusDisplay = "Excused Absence"
        statusClass = "status-excused"
        statusSymbol = "⚑"
        break
      case "absent":
      default:
        statusDisplay = "Absent"
        statusClass = "status-absent"
        statusSymbol = "✗"
        break
    }

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
          ${statusSymbol} ${statusDisplay}
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
  // Update date and current status displays if those spans exist
  const dateSpan = document.getElementById("override-date")
  if (dateSpan) dateSpan.textContent = date
  const currentStatusSpan = document.getElementById("override-current-status")
  if (currentStatusSpan) currentStatusSpan.textContent = currentStatus
  document.getElementById("override-status").value = currentStatus.toLowerCase()
  document.getElementById("override-reason").value = ""
  document.getElementById("override-modal").style.display = "flex"
}

// Using the static modal already present in HTML; dynamic creation removed to avoid duplicates.
// function createOverrideModal() { ... } removed intentionally.

async function saveOverride() {
  try {
    const modal = document.getElementById("override-modal")
    const internId = Number.parseInt(modal.dataset.internId)
    const date = modal.dataset.date
    let statusRaw = document.getElementById("override-status").value.toLowerCase()
    const reason = document.getElementById("override-reason").value
    const adminId = parseInt(localStorage.getItem("user_id"), 10) || 1

    // Validate internId
    if (!internId || isNaN(internId)) {
      showErrorMessage("Invalid intern selected for override.")
      return
    }

    // Validate status against allowed values (store exact status)
    const allowedStatuses = ["present", "absent", "late", "excused"]
    if (!allowedStatuses.includes(statusRaw)) {
      showErrorMessage("Invalid status selected.")
      return
    }
    const status = statusRaw

    console.log("[v0] Saving override - internId:", internId, "date:", date, "status:", status, "adminId:", adminId)

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
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || "Failed to override attendance")
    }

    showSuccessModal("Attendance overridden successfully")
    closeModal("override-modal")
    loadAttendanceByDate()
  } catch (error) {
    console.error("[v0] Override error:", error)
    showErrorMessage(error.message || "Failed to override attendance. Please try again.")
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
