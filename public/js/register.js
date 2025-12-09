// Form Submission and Validation
let isSubmitting = false

// Toast Notification System
class Toast {
  constructor(type = 'info', title = '', message = '', duration = 5000) {
    this.type = type
    this.title = title
    this.message = message
    this.duration = duration
    this.id = Date.now()
  }

  show() {
    const container = document.getElementById('toastContainer')
    if (!container) return

    const toastEl = document.createElement('div')
    toastEl.className = `toast ${this.type}`
    toastEl.setAttribute('role', 'alert')
    
    let iconSVG = ''
    switch(this.type) {
      case 'success':
        iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        break
      case 'error':
        iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        break
      case 'warning':
        iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        break
      case 'info':
      default:
        iconSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    }

    toastEl.innerHTML = `
      <div class="toast-icon">${iconSVG}</div>
      <div class="toast-content">
        ${this.title ? `<p class="toast-title">${this.title}</p>` : ''}
        <p class="toast-message">${this.message}</p>
      </div>
      <button class="toast-close" onclick="document.getElementById('toast-${this.id}').remove()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `
    toastEl.id = `toast-${this.id}`

    container.appendChild(toastEl)

    // Auto remove after duration
    if (this.duration > 0) {
      setTimeout(() => {
        const el = document.getElementById(`toast-${this.id}`)
        if (el) {
          el.classList.add('removing')
          setTimeout(() => el.remove(), 300)
        }
      }, this.duration)
    }
  }
}

async function handleFormSubmit(event) {
  event.preventDefault()

  // Prevent double submission
  if (isSubmitting) {
    return
  }

  console.log('handleFormSubmit called')

  // Clear previous errors
  clearErrors()

  // Get form data
  const formData = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    school: document.getElementById("school").value.trim(),
    degree: document.getElementById("degree").value.trim(),
    yearOfStudy: document.getElementById("yearOfStudy").value,
    gpa: document.getElementById("gpa").value || null,
    department: document.getElementById("department").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    mentor: document.getElementById("mentor").value.trim(),
    skills: document.getElementById("skills").value.trim(),
    notes: document.getElementById("notes").value.trim(),
  }

  // Validate form data
  if (!validateForm(formData)) {
    return
  }

  // Show loading state
  const submitBtn = document.getElementById("submitBtn")
  const submitBtnText = document.getElementById("submitBtnText")
  const submitSpinner = document.getElementById("submitSpinner")

  isSubmitting = true
  submitBtn.disabled = true
  submitBtn.setAttribute('aria-busy', 'true')
  submitBtnText.style.display = "none"
  submitSpinner.style.display = "block"

  try {
    // Send registration request to backend
    const response = await fetch("/api/register-intern", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })

    const result = await response.json()

    if (response.ok) {
      // Show success modal
      document.getElementById("successName").textContent = `${formData.firstName} ${formData.lastName}`
      document.getElementById("successEmail").textContent = formData.email
      
      // Show success toast
      new Toast('success', 'Registration Successful!', 'The intern has been registered. A receipt will be sent to their email shortly.', 4000).show()
      
      showSuccessModal()
      document.getElementById("registrationForm").reset()
    } else {
      // Show error toast with specific error message
      const errorTitle = 'Registration Failed'
      const errorMessage = result.message || "Failed to register intern. Please try again."
      
      new Toast('error', errorTitle, errorMessage, 6000).show()
      showErrorModal(errorMessage)
    }
  } catch (error) {
    console.error("Registration error:", error)
    const errorMsg = "An error occurred. Please check your connection and try again."
    new Toast('error', 'Connection Error', errorMsg, 6000).show()
    showErrorModal(errorMsg)
  } finally {
    // Reset button state
    isSubmitting = false
    submitBtn.disabled = false
    submitBtn.removeAttribute('aria-busy')
    submitBtnText.style.display = "inline"
    submitSpinner.style.display = "none"
  }
}

function validateForm(data) {
  const errors = {}

  // First Name validation
  if (!data.firstName || data.firstName.length < 2) {
    errors.firstName = "First name must be at least 2 characters"
  }

  // Last Name validation
  if (!data.lastName || data.lastName.length < 2) {
    errors.lastName = "Last name must be at least 2 characters"
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = "Please enter a valid email address"
  }

  // Phone validation - Accept formats: (123) 456-7890, 123-456-7890, 1234567890, +1-123-456-7890
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/
  if (!data.phone || !phoneRegex.test(data.phone.replace(/\s/g, ""))) {
    errors.phone = "Please enter a valid phone number (e.g., (123) 456-7890, 123-456-7890, or 1234567890)"
  }

  // School validation
  if (!data.school || data.school.length < 3) {
    errors.school = "Please enter your school name"
  }

  // Degree validation
  if (!data.degree || data.degree.length < 3) {
    errors.degree = "Please enter your degree program"
  }

  // Year of Study validation
  if (!data.yearOfStudy) {
    errors.yearOfStudy = "Please select your year of study"
  }

  // Department validation
  if (!data.department) {
    errors.department = "Please select a department"
  }

  // Date validation
  const startDate = new Date(data.startDate)
  const endDate = new Date(data.endDate)

  if (!data.startDate) {
    errors.startDate = "Please select a start date"
  }

  if (!data.endDate) {
    errors.endDate = "Please select an end date"
  }

  if (startDate >= endDate) {
    errors.endDate = "End date must be after start date"
  }

  // Skills validation
  if (!data.skills || data.skills.length < 5) {
    errors.skills = "Please enter your skills and interests"
  }

  // Display errors
  displayErrors(errors)

  // Show error toast if there are validation errors
  if (Object.keys(errors).length > 0) {
    const errorCount = Object.keys(errors).length
    const errorSummary = errorCount === 1 
      ? Object.values(errors)[0] 
      : `Please fix ${errorCount} validation error(s)`
    new Toast('warning', 'Validation Error', errorSummary, 5000).show()
  }

  return Object.keys(errors).length === 0
}

function displayErrors(errors) {
  // Find the first field with an error
  let firstErrorField = null
  
  Object.keys(errors).forEach((fieldName) => {
    const errorElement = document.getElementById(`${fieldName}Error`)
    const inputElement = document.getElementById(fieldName)
    
    if (errorElement) {
      errorElement.textContent = errors[fieldName]
    }
    
    // Add error styling to the input field
    if (inputElement) {
      inputElement.classList.add('input-error')
      
      // Remove error styling when user starts typing
      inputElement.addEventListener('input', function() {
        this.classList.remove('input-error')
        const error = document.getElementById(`${fieldName}Error`)
        if (error) error.textContent = ''
      }, { once: true })
      
      // Store reference to first error field
      if (!firstErrorField) {
        firstErrorField = inputElement
      }
    }
  })

  // Scroll to the first error field if any errors exist
  if (firstErrorField) {
    setTimeout(() => {
      firstErrorField.scrollIntoView({ behavior: "smooth", block: "center" })
      firstErrorField.focus()
    }, 100)
  }
}

function clearErrors() {
  document.querySelectorAll(".error-message").forEach((element) => {
    element.textContent = ""
  })
}

function resetForm() {
  document.getElementById("registrationForm").reset()
  clearErrors()
}

function showSuccessModal() {
  document.getElementById("successModal").classList.add("active")
}

function closeSuccessModal() {
  document.getElementById("successModal").classList.remove("active")
}

function showErrorModal(message) {
  document.getElementById("errorMessage").textContent = message
  document.getElementById("errorModal").classList.add("active")
}

function closeErrorModal() {
  document.getElementById("errorModal").classList.remove("active")
}

// Ensure the registration form is bound to the submit handler even if inline binding fails
document.addEventListener('DOMContentLoaded', () => {
  const regForm = document.getElementById('registrationForm')
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      if (typeof handleFormSubmit === 'function') {
        handleFormSubmit(e)
      }
    })
  }
})

function goBackToDashboard() {
  window.location.href = "/dashboard.html"
}

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  const successModal = document.getElementById("successModal")
  const errorModal = document.getElementById("errorModal")

  if (event.target === successModal) {
    closeSuccessModal()
  }
  if (event.target === errorModal) {
    closeErrorModal()
  }
})
