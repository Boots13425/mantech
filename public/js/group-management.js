// State management
let currentProposal = null
let currentGroups = null
let currentAdjustedProposal = null
let groupTabsInitialized = false
let selectedMove = null

function goBackToDashboard() {
  window.location.href = "dashboard.html"
}

// Helper: activate tab (matches receipt management tab style)
function activateGroupTab(tabId) {
  const tabs = document.querySelectorAll(".group-tab-btn")
  const contents = document.querySelectorAll(".group-tab-content")

  tabs.forEach((btn) => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active")
    } else {
      btn.classList.remove("active")
    }
  })

  contents.forEach((c) => {
    if (c.id === tabId) {
      c.classList.add("active")
    } else {
      c.classList.remove("active")
    }
  })

  // When switching to view tab, load groups
  if (tabId === "view-groups-view") {
    loadAllGroups()
  }
}

function switchToView() {
  activateGroupTab("view-groups-view")
}

function switchToGenerate() {
  activateGroupTab("generate-groups-view")
}

function backToMain() {
  activateGroupTab("view-groups-view")
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add("active")
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active")
}

function switchDetailTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".detail-tab-content").forEach((tab) => {
    tab.classList.remove("active")
    tab.classList.add("hidden")
  })

  // Deactivate all tab buttons
  document.querySelectorAll(".detail-tab").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Show selected tab
  const tabElement = document.getElementById(tabName + "-tab")
  if (tabElement) {
    tabElement.classList.add("active")
    tabElement.classList.remove("hidden")
  }

  // Activate tab button
  event.target.classList.add("active")
}

// Load all groups
async function loadAllGroups() {
  try {
    const response = await fetch("/api/groups/all")
    const result = await response.json()

    if (!result.success) {
      alert("Error loading groups: " + result.message)
      return
    }

    currentGroups = result.data
    displayGroups(result.data)
  } catch (error) {
    console.error("Load groups error:", error)
    alert("Error loading groups")
  }
}

// Display groups with new card layout
function displayGroups(groups) {
  const container = document.getElementById("groups-container")
  const emptyMessage = document.getElementById("no-groups-message")

  if (groups.length === 0) {
    container.innerHTML = ""
    emptyMessage.classList.remove("hidden")
    return
  }

  emptyMessage.classList.add("hidden")
  container.innerHTML = groups
    .map(
      (group) => `
    <div class="group-card">
      <div class="group-card-header">
        <div class="group-name">${group.group_name}</div>
        <span class="group-badge badge-${group.status.toLowerCase()}">${group.status}</span>
      </div>
      
      <div class="group-count">${group.member_count}</div>
      <div class="group-count-label">Members</div>
      
      <div class="group-members-preview">
        <div class="members-preview-title">Members:</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${group.members.map((m) => `<span class="member-tag">${m.first_name} ${m.last_name}</span>`).join("")}
        </div>
      </div>
      
      <div class="group-actions">
        <button class="btn btn-primary btn-small" onclick="viewGroupDetails(${group.id})">View</button>
      </div>
    </div>
  `,
    )
    .join("")
}

// View group details
async function viewGroupDetails(groupId) {
  try {
    const response = await fetch(`/api/groups/${groupId}`)
    const result = await response.json()

    if (!result.success) {
      alert("Error loading group details")
      return
    }

    const group = result.data

    document.getElementById("group-details-title").textContent = `${group.group_name}`
    document.getElementById("group-details-modal").dataset.groupId = groupId

    // Display members in Members tab
    const membersList = document.getElementById("group-members-list")
    membersList.innerHTML = group.members
      .map(
        (member) => `
      <div class="member-item">
        <div class="member-info">
          <div class="member-name">${member.first_name} ${member.last_name}</div>
          <div class="member-meta">${member.school} • ${member.department}</div>
        </div>
        <div class="member-actions">
          <button class="btn btn-small" onclick="removeMember(${group.id}, ${member.id})">Remove</button>
        </div>
      </div>
    `,
      )
      .join("")

    // Populate intern dropdown for Manage tab
    populateUnassignedInterns(groupId)

    // Display audit log in History tab
    const auditLog = document.getElementById("group-audit-log")
    auditLog.innerHTML = group.auditLogs
      .map(
        (log) => `
      <div class="audit-entry">
        <div class="audit-action">${log.action}</div>
        <div class="audit-by">By: ${log.full_name}</div>
        <div class="audit-time">${new Date(log.action_timestamp).toLocaleString()}</div>
        ${log.details ? `<div style="margin-top: 5px; color: #555;">${log.details}</div>` : ""}
      </div>
    `,
      )
      .join("")

    // Reset to Members tab on open
    document.querySelectorAll(".detail-tab-content").forEach((tab) => {
      tab.classList.remove("active")
      tab.classList.add("hidden")
    })
    document.querySelectorAll(".detail-tab").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.getElementById("members-tab").classList.add("active")
    document.getElementById("members-tab").classList.remove("hidden")
    document.querySelector(".detail-tab").classList.add("active")

    openModal("group-details-modal")
  } catch (error) {
    console.error("View group details error:", error)
    alert("Error loading group details")
  }
}

// Populate unassigned interns
async function populateUnassignedInterns(groupId) {
  try {
    const allResponse = await fetch("/api/register/interns")
    const allJson = await allResponse.json()
    const allInterns = Array.isArray(allJson) ? allJson : allJson.data || allJson.interns || []

    const currentMembers = await fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((r) => r.data.members || [])

    const currentMemberIds = new Set(currentMembers.map((m) => m.id))
    const unassigned = allInterns.filter((i) => !currentMemberIds.has(i.id))

    const select = document.getElementById("intern-to-add")
    select.innerHTML =
      '<option value="">Select intern to add...</option>' +
      unassigned
        .map(
          (i) =>
            `<option value="${i.id}">${i.first_name} ${i.last_name} - ${i.school || "School N/A"}${i.department ? " • " + i.department : ""
            }</option>`,
        )
        .join("")

    // Also render list of unassigned with school/department for visibility
    const listContainer = document.getElementById("unassigned-list")
    if (listContainer) {
      if (unassigned.length === 0) {
        listContainer.innerHTML = "<p style='color:#718096'>No unassigned interns available.</p>"
      } else {
        listContainer.innerHTML = unassigned
          .map(
            (i) => `
            <div class="unassigned-item">
              <div class="unassigned-name">${i.first_name} ${i.last_name}</div>
              <div class="unassigned-meta">${i.school || "School N/A"}${i.department ? " • " + i.department : ""}</div>
            </div>
          `,
          )
          .join("")
      }
    }
  } catch (error) {
    console.error("Error populating interns:", error)
  }
}

// Add member to group
async function addMemberToGroup() {
  const groupId = document.getElementById("group-details-modal").dataset.groupId
  const internId = document.getElementById("intern-to-add").value
  const userId = localStorage.getItem("userId")

  if (!internId) {
    alert("Please select an intern")
    return
  }

  try {
    const response = await fetch("/api/groups/add-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, internId: Number.parseInt(internId), userId: Number.parseInt(userId) }),
    })

    const result = await response.json()

    if (!result.success) {
      alert("Error: " + result.message)
      return
    }

    alert("Member added successfully")
    viewGroupDetails(groupId)
  } catch (error) {
    console.error("Add member error:", error)
    alert("Error adding member")
  }
}

// Remove member from group
async function removeMember(groupId, internId) {
  if (!confirm("Are you sure you want to remove this intern from the group?")) {
    return
  }

  const userId = localStorage.getItem("userId")

  try {
    const response = await fetch("/api/groups/remove-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, internId, userId: Number.parseInt(userId) }),
    })

    const result = await response.json()

    if (!result.success) {
      alert("Error: " + result.message)
      return
    }

    alert("Member removed successfully")
    viewGroupDetails(groupId)
  } catch (error) {
    console.error("Remove member error:", error)
    alert("Error removing member")
  }
}

// Start group generation
async function startGroupGeneration() {
  if (!confirm("This will generate a new proposal for intern groups. Continue?")) {
    return
  }

  try {
    const response = await fetch("/api/groups/generate", { method: "POST" })
    const result = await response.json()

    if (!result.success) {
      alert("Error: " + result.message)
      return
    }

    currentProposal = result.data.proposal
    displayProposal(result.data)
    openModal("proposal-modal")
  } catch (error) {
    console.error("Generate groups error:", error)
    alert("Error generating groups")
  }
}

// Display proposal
function displayProposal(data) {
  document.getElementById("total-interns").textContent = data.totalInterns
  document.getElementById("num-groups").textContent = data.numGroups

  const container = document.getElementById("proposal-groups")
  container.innerHTML = data.proposal
    .map(
      (group) => `
    <div class="proposal-group-card">
      <div class="proposal-group-header">
        <div class="proposal-group-title">${group.groupName}</div>
        <span class="diversity-indicator ${group.metrics.hasWeakDiversity ? "diversity-warning" : "diversity-good"}">
          ${group.metrics.hasWeakDiversity ? "⚠ Weak Diversity" : "✓ Good Diversity"}
        </span>
      </div>
      
      <div class="proposal-group-meta">
        <span><strong>${group.members.length}</strong> members</span>
        <span><strong>${group.metrics.schoolCount}</strong> schools</span>
      </div>
      
      <div class="school-distribution">
        <strong>School Distribution:</strong>
        ${Object.entries(group.metrics.schoolDistribution)
          .map(
            ([school, count]) => `
          <div class="school-item">
            <span>${school}</span>
            <span>${count} intern${count > 1 ? "s" : ""}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      
      <div class="proposal-members">
        ${group.members.map((m) => `<span class="member-chip">${m.first_name} ${m.last_name}</span>`).join("")}
      </div>
      
      ${
        group.warnings.length > 0
          ? `
        <div class="warning-box">
          ${group.warnings.map((w) => `<div>⚠ ${w}</div>`).join("")}
        </div>
      `
          : ""
      }
    </div>
  `,
    )
    .join("")
}

// Manually adjust groups
function manualAdjustProposal() {
  currentAdjustedProposal = JSON.parse(JSON.stringify(currentProposal))
  closeModal("proposal-modal")
  openModal("adjust-modal")
  displayAdjustPreview()
  resetAdjustSelection()
}

// Display adjust preview
function displayAdjustPreview() {
  const preview = document.getElementById("adjust-preview-grid")
  preview.innerHTML = currentAdjustedProposal
    .map(
      (g, groupIndex) => `
    <div class="proposal-group-card">
      <div class="proposal-group-header">
        <div class="proposal-group-title">${g.groupName}</div>
        <span>${g.members.length} members</span>
      </div>
      <div class="proposal-members">
        ${g.members
          .map(
            (m, memberIndex) => `<span class="member-chip ${isSelectedMember(groupIndex, memberIndex) ? "selected" : ""}" 
              title="${m.first_name} ${m.last_name}" 
              onclick="selectMemberForMove(${groupIndex}, ${memberIndex})">${m.first_name} ${m.last_name}</span>`,
          )
          .join("")}
      </div>
    </div>
  `,
    )
    .join("")

  populateTargetGroupSelect()
}

// Confirm and save groups
async function confirmAndSaveGroups() {
  if (!confirm("This will save the groups to the database. Continue?")) {
    return
  }

  const userId = localStorage.getItem("userId")

  try {
    const response = await fetch("/api/groups/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal: currentProposal, userId: Number.parseInt(userId) }),
    })

    const result = await response.json()

    if (!result.success) {
      alert("Error: " + result.message)
      return
    }

    alert("Groups saved successfully!")
    closeModal("proposal-modal")
    backToMain()
  } catch (error) {
    console.error("Confirm groups error:", error)
    alert("Error saving groups")
  }
}

// Confirm adjusted groups
async function confirmAdjustedGroups() {
  if (!confirm("Save adjusted groups to database?")) {
    return
  }

  const userId = localStorage.getItem("userId")

  try {
    const response = await fetch("/api/groups/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposal: currentAdjustedProposal, userId: Number.parseInt(userId) }),
    })

    const result = await response.json()

    if (!result.success) {
      alert("Error: " + result.message)
      return
    }

    alert("Adjusted groups saved successfully!")
    closeModal("adjust-modal")
    backToMain()
  } catch (error) {
    console.error("Confirm adjusted groups error:", error)
    alert("Error saving adjusted groups")
  }
}

// Close modal on outside click
window.onclick = (event) => {
  const modals = document.querySelectorAll(".modal")
  modals.forEach((modal) => {
    if (event.target === modal) {
      modal.classList.remove("active")
    }
  })
}

// -------- Adjust helpers --------
function isSelectedMember(groupIndex, memberIndex) {
  return selectedMove && selectedMove.groupIndex === groupIndex && selectedMove.memberIndex === memberIndex
}

function resetAdjustSelection() {
  selectedMove = null
  const label = document.getElementById("selected-member-label")
  if (label) label.textContent = "None"
  populateTargetGroupSelect()
}

function selectMemberForMove(groupIndex, memberIndex) {
  const member = currentAdjustedProposal[groupIndex].members[memberIndex]
  selectedMove = { groupIndex, memberIndex }
  const label = document.getElementById("selected-member-label")
  if (label) {
    label.textContent = `${member.first_name} ${member.last_name} (${currentAdjustedProposal[groupIndex].groupName})`
  }
  populateTargetGroupSelect()
  displayAdjustPreview()
}

function populateTargetGroupSelect() {
  const select = document.getElementById("target-group-select")
  if (!select) return

  select.innerHTML = '<option value="">Select destination group</option>'

  currentAdjustedProposal.forEach((g, idx) => {
    const opt = document.createElement("option")
    opt.value = idx
    opt.textContent = `${g.groupName} (${g.members.length} members)`
    if (selectedMove && selectedMove.groupIndex === idx) {
      opt.disabled = true
    }
    select.appendChild(opt)
  })
}

function moveSelectedMember() {
  if (!selectedMove) {
    alert("Select an intern to move")
    return
  }

  const targetSelect = document.getElementById("target-group-select")
  const targetIndex = targetSelect ? Number.parseInt(targetSelect.value) : NaN

  if (Number.isNaN(targetIndex)) {
    alert("Select a destination group")
    return
  }

  const { groupIndex, memberIndex } = selectedMove
  const sourceGroup = currentAdjustedProposal[groupIndex]
  const targetGroup = currentAdjustedProposal[targetIndex]

  const [member] = sourceGroup.members.splice(memberIndex, 1)
  targetGroup.members.push(member)

  resetAdjustSelection()
  displayAdjustPreview()
}

// Load page with tabbed view on page load
document.addEventListener("DOMContentLoaded", () => {
  if (groupTabsInitialized) return

  const tabButtons = document.querySelectorAll(".group-tab-btn")
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activateGroupTab(btn.dataset.tab)
    })
  })

  // Activate default tab
  activateGroupTab("view-groups-view")
  groupTabsInitialized = true
})
