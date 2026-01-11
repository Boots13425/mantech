function showMessage(message, type = "info") {
  const messageEl = document.getElementById("status-message")
  messageEl.className = `status-message ${type}`
  messageEl.textContent = message
  messageEl.style.display = "block"
}

function submitAttendance() {
  const registrationId = document.getElementById("registration-id").value.trim().toUpperCase()
  const input = document.getElementById("registration-id")
  const form = document.getElementById("signin-form")
  const loading = document.getElementById("loading-state")
  const success = document.getElementById("success-state")

  // Validate format
  if (!registrationId) {
    showMessage("Please enter your registration ID", "error")
    input.classList.add("error")
    return
  }

  if (!/^INT\d{6}$/.test(registrationId)) {
    showMessage("Invalid format. Use INT followed by 6 digits (e.g., INT123456)", "error")
    input.classList.add("error")
    return
  }

  input.classList.remove("error")
  form.style.display = "none"
  loading.style.display = "block"

  // Submit to backend
  fetch("/api/attendance/sign-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ registration_id: registrationId }),
  })
    .then((res) => res.json())
    .then((data) => {
      loading.style.display = "none"

      if (data.success) {
        document.getElementById("success-title").textContent = "Attendance Marked"
        document.getElementById("success-message").textContent = `Welcome, ${data.intern_name}!`
        success.style.display = "block"
        showMessage("Attendance recorded successfully", "success")
      } else {
        form.style.display = "block"
        showMessage(data.message || "Failed to mark attendance", "error")

        // Show specific warnings
        if (data.message.includes("network")) {
          showMessage("⚠️ " + data.message, "warning")
        } else if (data.message.includes("already")) {
          showMessage("ℹ️ " + data.message, "warning")
        }
      }
    })
    .catch((error) => {
      console.error("[v0] Attendance error:", error)
      loading.style.display = "none"
      form.style.display = "block"
      showMessage("Network error. Please try again.", "error")
    })
}

function resetForm() {
  document.getElementById("registration-id").value = ""
  document.getElementById("signin-form").style.display = "block"
  document.getElementById("success-state").style.display = "none"
  document.getElementById("status-message").style.display = "none"
  document.getElementById("registration-id").focus()
}

// Allow Enter key to submit
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("registration-id")
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      submitAttendance()
    }
  })
  input.focus()
})
