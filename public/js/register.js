// Form Submission and Validation

async function handleFormSubmit(event) {
  event.preventDefault()

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

  submitBtn.disabled = true
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
      showSuccessModal()
      document.getElementById("registrationForm").reset()
    } else {
      // Show error modal
      showErrorModal(result.message || "Failed to register intern. Please try again.")
    }
  } catch (error) {
    console.error("Registration error:", error)
    showErrorModal("An error occurred. Please check your connection and try again.")
  } finally {
    // Reset button state
    submitBtn.disabled = false
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

  // Phone validation
  if (!data.phone || data.phone.length < 10) {
    errors.phone = "Please enter a valid phone number"
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

  return Object.keys(errors).length === 0
}

function displayErrors(errors) {
  Object.keys(errors).forEach((fieldName) => {
    const errorElement = document.getElementById(`${fieldName}Error`)
    if (errorElement) {
      errorElement.textContent = errors[fieldName]
    }
  })
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
