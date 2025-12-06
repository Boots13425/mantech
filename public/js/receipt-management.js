// Receipt Management JavaScript

// Set today's date as default
document.getElementById("paymentDate").valueAsDate = new Date()

const adminName = localStorage.getItem("adminName") || localStorage.getItem("username") || "Admin"
const userId = localStorage.getItem("userId") || localStorage.getItem("id") || "1"
document.getElementById("receivedBy").value = adminName

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const tabName = btn.dataset.tab
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))
    btn.classList.add("active")
    document.getElementById(tabName).classList.add("active")
  })
})

// Intern search with fuzzy matching
const internSearch = document.getElementById("internSearch")
const internSuggestions = document.getElementById("internSuggestions")
let debounceTimer

internSearch.addEventListener("input", (e) => {
  clearTimeout(debounceTimer)
  const query = e.target.value.trim()

  if (query.length < 2) {
    internSuggestions.classList.remove("active")
    return
  }

  debounceTimer = setTimeout(() => {
    fetch(`/api/receipts/search-interns?query=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((interns) => {
        if (interns.length === 0) {
          internSuggestions.innerHTML = '<div class="suggestion-item">No interns found</div>'
        } else {
          internSuggestions.innerHTML = interns
            .map(
              (intern) =>
                `<div class="suggestion-item" onclick="selectIntern(${intern.id}, '${intern.first_name.replace(/'/g, "\\'")}', '${intern.last_name.replace(/'/g, "\\'")}', '${intern.email}', '${intern.phone}')">
              <div class="suggestion-text">${intern.first_name} ${intern.last_name}</div>
              <div class="suggestion-email">${intern.email}</div>
            </div>`,
            )
            .join("")
        }
        internSuggestions.classList.add("active")
      })
      .catch((err) => console.error("[v0] Search error:", err))
  }, 300)
})

// Close suggestions on click outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrapper")) {
    internSuggestions.classList.remove("active")
  }
})

// Select intern from dropdown
function selectIntern(id, firstName, lastName, email, phone) {
  document.getElementById("internId").value = id
  document.getElementById("internSearch").value = `${firstName} ${lastName}`
  document.getElementById("detailName").textContent = `${firstName} ${lastName}`
  document.getElementById("detailEmail").textContent = email
  document.getElementById("detailPhone").textContent = phone || "N/A"
  document.getElementById("internDetails").style.display = "block"
  internSuggestions.classList.remove("active")
}

// Payment type conditional fields
document.getElementById("paymentType").addEventListener("change", (e) => {
  const type = e.target.value
  document.getElementById("feeTypeField").style.display = type === "Other Fees" ? "block" : "none"
  document.getElementById("customPaymentField").style.display = type === "Custom Payment" ? "block" : "none"

  if (type === "Other Fees") {
    document.getElementById("feeTypeDescription").required = true
    document.getElementById("paymentDescription").required = false
  } else if (type === "Custom Payment") {
    document.getElementById("feeTypeDescription").required = false
    document.getElementById("paymentDescription").required = true
  } else {
    document.getElementById("feeTypeDescription").required = false
    document.getElementById("paymentDescription").required = false
  }
})

// Form submission
document.getElementById("receiptForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const formData = {
    internId: document.getElementById("internId").value,
    paymentDate: document.getElementById("paymentDate").value,
    paymentType: document.getElementById("paymentType").value,
    feeTypeDescription: document.getElementById("feeTypeDescription").value || null,
    paymentDescription: document.getElementById("paymentDescription").value || null,
    amountDue: Number.parseFloat(document.getElementById("amountDue").value),
    amountPaid: Number.parseFloat(document.getElementById("amountPaid").value),
    paymentMethod: document.getElementById("paymentMethod").value,
    receivedBy: document.getElementById("receivedBy").value,
    notes: document.getElementById("notes").value || null,
    userId: userId,
  }

  console.log("[v0] Submitting receipt form with data:", formData)

  try {
    const response = await fetch("/api/receipts/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    })

    const result = await response.json()
    console.log("[v0] Receipt creation response:", result)

    if (response.ok) {
      alert("Receipt created successfully! Receipt ID: " + result.receiptId)
      document.getElementById("receiptForm").reset()
      document.getElementById("internDetails").style.display = "none"
      document.getElementById("paymentDate").valueAsDate = new Date()
      document.getElementById("receivedBy").value = adminName
    } else {
      alert("Error: " + result.message)
    }
  } catch (error) {
    console.error("[v0] Error creating receipt:", error)
    alert("Failed to create receipt: " + error.message)
  }
})

// Preview receipt
async function previewReceipt() {
  const formData = {
    internId: document.getElementById("internId").value,
    paymentDate: document.getElementById("paymentDate").value,
    paymentType: document.getElementById("paymentType").value,
    feeTypeDescription: document.getElementById("feeTypeDescription").value,
    paymentDescription: document.getElementById("paymentDescription").value,
    amountDue: Number.parseFloat(document.getElementById("amountDue").value) || 0,
    amountPaid: Number.parseFloat(document.getElementById("amountPaid").value) || 0,
    paymentMethod: document.getElementById("paymentMethod").value,
    receivedBy: document.getElementById("receivedBy").value,
  }

  if (
    !formData.internId ||
    !formData.paymentDate ||
    !formData.paymentType ||
    !formData.amountDue ||
    !formData.amountPaid
  ) {
    alert("Please fill in all required fields")
    return
  }

  try {
    const response = await fetch(`/api/receipts/intern/${formData.internId}`)
    const intern = await response.json()

    const balance = formData.amountDue - formData.amountPaid

    const previewHTML = `
      <div class="receipt-preview">
        <div class="receipt-preview-header">
          <div class="receipt-company">ETS NTECH</div>
          <div class="receipt-tagline">Enterprise Technology Solutions</div>
          <div class="receipt-title">PAYMENT RECEIPT</div>
        </div>

        <div class="receipt-section">
          <div class="receipt-section-title">Receipt Details</div>
          <div class="receipt-row">
            <span class="receipt-row-label">Receipt ID:</span>
            <span class="receipt-row-value">ETS/[Generated]</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Date:</span>
            <span class="receipt-row-value">${new Date(formData.paymentDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="receipt-section">
          <div class="receipt-section-title">Intern Information</div>
          <div class="receipt-row">
            <span class="receipt-row-label">Full Name:</span>
            <span class="receipt-row-value">${intern.first_name} ${intern.last_name}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Email:</span>
            <span class="receipt-row-value">${intern.email}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Phone:</span>
            <span class="receipt-row-value">${intern.phone || "N/A"}</span>
          </div>
        </div>

        <div class="receipt-section">
          <div class="receipt-section-title">Payment Information</div>
          <div class="receipt-row">
            <span class="receipt-row-label">Payment Type:</span>
            <span class="receipt-row-value">${formData.paymentType}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Payment Method:</span>
            <span class="receipt-row-value">${formData.paymentMethod}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-row-label">Received By:</span>
            <span class="receipt-row-value">${formData.receivedBy}</span>
          </div>
        </div>

        <div class="receipt-summary">
          <div class="receipt-summary-row">
            <span>Amount Due:</span>
            <span>₦${formData.amountDue.toLocaleString()}</span>
          </div>
          <div class="receipt-summary-row">
            <span>Amount Paid:</span>
            <span>₦${formData.amountPaid.toLocaleString()}</span>
          </div>
          <div class="receipt-summary-row">
            <span>Balance:</span>
            <span>₦${balance.toLocaleString()}</span>
          </div>
        </div>

        <div class="receipt-qr">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=ETS-RECEIPT" alt="QR Code" />
        </div>
      </div>
    `

    document.getElementById("previewContent").innerHTML = previewHTML
    document.getElementById("previewModal").style.display = "flex"
  } catch (error) {
    console.error("Error generating preview:", error)
    alert("Failed to generate preview")
  }
}

// Close preview
function closePreview() {
  document.getElementById("previewModal").style.display = "none"
}

// Download preview PDF
function downloadPreviewPDF() {
  alert("PDF will be generated after receipt is created")
  closePreview()
}

// Search receipts
async function searchReceipts() {
  const query = document.getElementById("searchQuery").value
  const startDate = document.getElementById("searchStartDate").value
  const endDate = document.getElementById("searchEndDate").value
  const paymentType = document.getElementById("searchPaymentType").value

  try {
    const params = new URLSearchParams({
      ...(query && { query }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(paymentType && { paymentType }),
    })

    const response = await fetch(`/api/receipts/search?${params}`)
    const data = await response.json()

    let html = ""

    if (data.results.length === 0) {
      html = "<p style='padding: 20px; text-align: center; color: #718096;'>No receipts found</p>"
    } else {
      html = `
        <table class="results-table">
          <thead>
            <tr>
              <th>Receipt ID</th>
              <th>Intern Name</th>
              <th>Payment Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.results
              .map(
                (receipt) => `
              <tr>
                <td>${receipt.receipt_id}</td>
                <td>${receipt.first_name} ${receipt.last_name}</td>
                <td>${receipt.payment_type}</td>
                <td>₦${receipt.amount_paid.toLocaleString()}</td>
                <td>${new Date(receipt.payment_date).toLocaleDateString()}</td>
                <td><span style="padding: 4px 8px; background: ${receipt.status === "Active" ? "#d0f0c0" : "#fcc2c2"}; border-radius: 4px; font-size: 12px;">${receipt.status}</span></td>
                <td>
                  <div class="result-actions">
                    <button class="action-btn action-btn-view" onclick="viewReceipt(${receipt.id})">View</button>
                    <button class="action-btn action-btn-print" onclick="printReceipt(${receipt.id})">Print</button>
                  </div>
                </td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
    }

    document.getElementById("searchResults").innerHTML = html
  } catch (error) {
    console.error("Search error:", error)
    alert("Search failed")
  }
}

// View receipt details
function viewReceipt(receiptId) {
  alert("Receipt details: " + receiptId)
}

// Print receipt
function printReceipt(receiptId) {
  window.open(`/api/receipts/print/${receiptId}`, "_blank")
}
