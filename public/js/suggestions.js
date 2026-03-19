const form = document.getElementById("suggestionForm")
const textarea = document.getElementById("suggestionText")
const submitBtn = document.getElementById("submitBtn")
const statusMessage = document.getElementById("statusMessage")
const charCount = document.getElementById("charCount")

function showMessage(message, type) {
  statusMessage.textContent = message
  statusMessage.className = `status-message ${type}`
  statusMessage.style.display = "block"
}

function updateCount() {
  charCount.textContent = `${textarea.value.length} / 2000`
}

textarea.addEventListener("input", updateCount)
updateCount()

form.addEventListener("submit", async (event) => {
  event.preventDefault()

  const suggestion = textarea.value.trim()

  if (!suggestion) {
    showMessage("Please type a suggestion before submitting.", "error")
    textarea.focus()
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = "Submitting..."

  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ suggestion }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Failed to submit suggestion.")
    }

    form.reset()
    updateCount()
    showMessage(result.message || "Suggestion submitted successfully.", "success")
    textarea.focus()
  } catch (error) {
    console.error("Suggestion submit error:", error)
    showMessage(error.message || "Failed to submit suggestion.", "error")
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = "Submit Suggestion"
  }
})