const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mantech_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

// ==================== API ROUTES ====================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }
        
        // Get connection from pool
        const connection = await pool.getConnection();
        
        try {
            // Check if user exists
            const [rows] = await connection.query(
                'SELECT id, email, password FROM users WHERE email = ?',
                [email]
            );
            
            if (rows.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            const user = rows[0];
            
            // Compare passwords
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            // Store user in session
            req.session.userId = user.id;
            req.session.userEmail = user.email;
            
            res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email
                }
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Check authentication endpoint
app.get('/api/auth/check', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.json({
        authenticated: true,
        user: {
            id: req.session.userId,
            email: req.session.userEmail
        }
    });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║         MANTech Server Running            ║
    ║     Server: http://localhost:${PORT}       ║
    ║     Environment: ${process.env.NODE_ENV || 'development'}       ║
    ╚═══════════════════════════════════════════╝
    `);
});