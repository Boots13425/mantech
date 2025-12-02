// Initialize page on load
document.addEventListener("DOMContentLoaded", () => {
  // Set today's date as default
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("attendance-date").value = today

  // Load attendance data
  loadAttendanceData()
})

// Load attendance data from backend
async function loadAttendanceData() {
  try {
    showLoading(true)
    hideErrorMessage()

    const response = await fetch("/api/attendance/list")

    if (!response.ok) {
      throw new Error("Failed to load attendance data")
    }

    const data = await response.json()

    if (data.interns && data.interns.length > 0) {
      populateAttendanceTable(data.interns)
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

// Populate attendance table
function populateAttendanceTable(interns) {
  const tbody = document.getElementById("attendance-tbody")
  tbody.innerHTML = ""

  interns.forEach((intern) => {
    const row = document.createElement("tr")
    const status = intern.attendance_status || "Present"
    const statusClass = status === "Present" ? "status-present" : "status-absent"

    row.innerHTML = `
            <td>${intern.id}</td>
            <td>${intern.first_name} ${intern.last_name}</td>
            <td>${intern.email}</td>
            <td>${intern.department}</td>
            <td>
                <span class="status-badge ${statusClass}" onclick="toggleStatus(this, ${intern.id})">
                    ${status === "Present" ? "✓" : "✗"} ${status}
                </span>
            </td>
        `
    tbody.appendChild(row)
  })

  document.getElementById("empty-state").style.display = "none"
  document.querySelector(".attendance-list-wrapper").style.display = "block"
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

    const response = await fetch(`/api/attendance/export?date=${date}`, {
      method: "GET",
    })

    if (!response.ok) {
      throw new Error("Failed to export attendance")
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get("content-disposition")
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1].replace(/"/g, "")
      : `attendance-${date}.xlsx`

    // Download file
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)

    // Show success message
    showSuccessModal(`Attendance exported successfully as ${filename}`)
  } catch (error) {
    console.error("[v0] Export error:", error)
    showErrorMessage("Failed to export attendance. Please try again.")
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
