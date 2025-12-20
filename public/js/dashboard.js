// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/index.html';
        } else {
            const data = await response.json();
            // Update user name
            const userNameEl = document.getElementById('userName');
            if (userNameEl && data.user) userNameEl.textContent = data.user.email || data.user.name || 'Admin User';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/index.html';
    }
}

// Logout function
function logout() {
    fetch('/api/auth/logout', { method: 'POST' })
        .then(() => {
            window.location.href = '/index.html';
        })
        .catch(error => {
            console.error('Logout error:', error);
            window.location.href = '/index.html';
        });
}

// Navigate to menu items (placeholder)
function navigateTo(path) {
    alert(`Navigation to ${path} coming in future milestones!`);
}

// Check authentication on page load
checkAuth();
// No burger/overlay script needed — keep basic page behavior.
