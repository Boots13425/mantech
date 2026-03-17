let allInterns = []

async function checkAuth() {
  try {
    const response = await fetch("/api/auth/check")
    if (!response.ok) {
      window.location.href = "/index.html"
    }
  } catch (error) {
    console.error("Auth check failed:", error)
    window.location.href = "/index.html"
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "N/A"
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString()
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function renderTable(interns) {
  const tableBody = document.getElementById("internTableBody")
  const resultCount = document.getElementById("resultCount")
  const tableState = document.getElementById("tableState")
  const tableWrapper = document.getElementById("tableWrapper")

  resultCount.textContent = `${interns.length} record${interns.length === 1 ? "" : "s"}`

  if (!interns.length) {
    tableWrapper.style.display = "none"
    tableState.style.display = "block"
    tableState.textContent = "No interns found."
    return
  }

  tableState.style.display = "none"
  tableWrapper.style.display = "block"

  tableBody.innerHTML = interns
    .map((intern) => {
      const fullName = `${intern.first_name || ""} ${intern.last_name || ""}`.trim()
      const badgeClass = intern.status === "active" ? "badge-success" : "badge-inactive"

      return `
        <tr>
          <td>${intern.id}</td>
          <td>${escapeHtml(intern.registration_id)}</td>
          <td>${escapeHtml(fullName)}</td>
          <td>${escapeHtml(intern.email)}</td>
          <td>${escapeHtml(intern.phone)}</td>
          <td>${escapeHtml(intern.department)}</td>
          <td>${escapeHtml(intern.school)}</td>
          <td>${formatDate(intern.start_date)}</td>
          <td>${formatDate(intern.end_date)}</td>
          <td><span class="status-badge ${badgeClass}">${escapeHtml(intern.status)}</span></td>
          <td>
            <div class="action-buttons">
              <button class="btn btn-small btn-primary" onclick="openEditModal(${intern.id})">Edit</button>
              <button class="btn btn-small btn-danger" onclick="deactivateIntern(${intern.id}, '${escapeHtml(fullName)}')">Deactivate</button>
            </div>
          </td>
        </tr>
      `
    })
    .join("")
}

async function loadInterns() {
  const query = document.getElementById("searchInput").value.trim()
  const status = document.getElementById("statusFilter").value

  const tableState = document.getElementById("tableState")
  const tableWrapper = document.getElementById("tableWrapper")

  tableWrapper.style.display = "none"
  tableState.style.display = "block"
  tableState.textContent = "Loading intern records..."

  try {
    const params = new URLSearchParams()
    if (query) params.append("query", query)
    if (status) params.append("status", status)

    const response = await fetch(`/api/interns?${params.toString()}`)
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Failed to load interns.")
    }

    allInterns = result
    renderTable(allInterns)
  } catch (error) {
    console.error("Load interns error:", error)
    tableWrapper.style.display = "none"
    tableState.style.display = "block"
    tableState.textContent = error.message || "Failed to load intern records."
  }
}

async function openEditModal(id) {
  try {
    const response = await fetch(`/api/interns/${id}`)
    const intern = await response.json()

    if (!response.ok) {
      throw new Error(intern.message || "Failed to fetch intern details.")
    }

    document.getElementById("editInternId").value = intern.id
    document.getElementById("editFirstName").value = intern.first_name || ""
    document.getElementById("editLastName").value = intern.last_name || ""
    document.getElementById("editEmail").value = intern.email || ""
    document.getElementById("editPhone").value = intern.phone || ""
    document.getElementById("editSchool").value = intern.school || ""
    document.getElementById("editDegree").value = intern.degree || ""
    document.getElementById("editYearOfStudy").value = intern.year_of_study || ""
    document.getElementById("editGpa").value = intern.gpa || ""
    document.getElementById("editDepartment").value = intern.department || ""
    document.getElementById("editStartDate").value = intern.start_date ? String(intern.start_date).split("T")[0] : ""
    document.getElementById("editEndDate").value = intern.end_date ? String(intern.end_date).split("T")[0] : ""
    document.getElementById("editMentor").value = intern.mentor || ""
    document.getElementById("editSkills").value = intern.skills || ""
    document.getElementById("editNotes").value = intern.notes || ""
    document.getElementById("editStatus").value = intern.status || "active"

    document.getElementById("editModal").classList.add("active")
  } catch (error) {
    console.error("Open edit modal error:", error)
    alert(error.message || "Failed to load intern details.")
  }
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("active")
}

async function saveInternChanges(event) {
  event.preventDefault()

  const id = document.getElementById("editInternId").value

  const payload = {
    firstName: document.getElementById("editFirstName").value.trim(),
    lastName: document.getElementById("editLastName").value.trim(),
    email: document.getElementById("editEmail").value.trim(),
    phone: document.getElementById("editPhone").value.trim(),
    school: document.getElementById("editSchool").value.trim(),
    degree: document.getElementById("editDegree").value.trim(),
    yearOfStudy: document.getElementById("editYearOfStudy").value,
    gpa: document.getElementById("editGpa").value || null,
    department: document.getElementById("editDepartment").value,
    startDate: document.getElementById("editStartDate").value,
    endDate: document.getElementById("editEndDate").value,
    mentor: document.getElementById("editMentor").value.trim(),
    skills: document.getElementById("editSkills").value.trim(),
    notes: document.getElementById("editNotes").value.trim(),
    status: document.getElementById("editStatus").value,
  }

  try {
    const response = await fetch(`/api/interns/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Failed to update intern.")
    }

    alert(result.message || "Intern updated successfully.")
    closeEditModal()
    loadInterns()
  } catch (error) {
    console.error("Save intern error:", error)
    alert(error.message || "Failed to update intern.")
  }
}

async function deactivateIntern(id, fullName) {
  const confirmed = confirm(
    `Are you sure you want to deactivate ${fullName}? This will change the intern status to inactive.`
  )

  if (!confirmed) return

  try {
    const response = await fetch(`/api/interns/${id}`, {
      method: "DELETE",
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Failed to deactivate intern.")
    }

    alert(result.message || "Intern deactivated successfully.")
    loadInterns()
  } catch (error) {
    console.error("Deactivate intern error:", error)
    alert(error.message || "Failed to deactivate intern.")
  }
}

document.getElementById("searchBtn").addEventListener("click", loadInterns)
document.getElementById("refreshBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = ""
  document.getElementById("statusFilter").value = ""
  loadInterns()
})

document.getElementById("searchInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault()
    loadInterns()
  }
})

document.getElementById("editInternForm").addEventListener("submit", saveInternChanges)

window.addEventListener("click", (event) => {
  const modal = document.getElementById("editModal")
  if (event.target === modal) {
    closeEditModal()
  }
})

checkAuth()
loadInterns()