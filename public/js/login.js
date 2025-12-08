// Login Form Handler
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous error
    errorMessage.textContent = '';
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    // Validation
    if (!email || !password) {
        errorMessage.textContent = 'Please fill in all fields';
        return;
    }
    
    try {
        // Disable button during request
        const loginBtn = loginForm.querySelector('.login-btn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Redirect to dashboard on success
            window.location.href = '/dashboard.html';
        } else {
            errorMessage.textContent = data.message || 'Invalid credentials';
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorMessage.textContent = 'Connection error. Please try again.';
        loginForm.querySelector('.login-btn').disabled = false;
        loginForm.querySelector('.login-btn').textContent = 'Sign In';
    }
});

// Toggle Password Visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleText = document.getElementById('toggleText');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleText.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        toggleText.textContent = 'Show';
    }
}

// Enter key support
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});