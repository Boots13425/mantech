function formatDateTime(dateValue) {
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return "N/A"

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

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

function renderSuggestions(suggestions) {
  const list = document.getElementById("suggestionsList")
  const state = document.getElementById("stateMessage")
  const total = document.getElementById("totalSuggestions")

  total.textContent = suggestions.length

  if (!suggestions.length) {
    list.style.display = "none"
    state.style.display = "block"
    state.textContent = "No suggestions have been submitted yet."
    return
  }

  state.style.display = "none"
  list.style.display = "grid"
  list.innerHTML = suggestions
    .map((item) => {
      return `
        <article class="suggestion-item">
          <div class="suggestion-meta">
            <span class="meta-badge">Suggestion</span>
            <span class="meta-time">${escapeHtml(formatDateTime(item.created_at))}</span>
          </div>
          <p class="suggestion-text">${escapeHtml(item.suggestion_text).replace(/\n/g, "<br>")}</p>
        </article>
      `
    })
    .join("")
}

async function loadSuggestions() {
  const state = document.getElementById("stateMessage")
  const list = document.getElementById("suggestionsList")

  state.style.display = "block"
  state.textContent = "Loading suggestions..."
  list.style.display = "none"

  try {
    const response = await fetch("/api/suggestions/admin")
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || "Failed to load suggestions.")
    }

    renderSuggestions(result.suggestions || [])
  } catch (error) {
    console.error("Load suggestions error:", error)
    state.style.display = "block"
    state.textContent = error.message || "Failed to load suggestions."
  }
}

checkAuth().then(loadSuggestions)