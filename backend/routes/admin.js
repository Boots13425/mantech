const express = require('express')
const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')
require('dotenv').config()

const router = express.Router()

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mantech_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Simple auth middleware using session
router.use((req, res, next) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ message: 'Unauthorized' })
  next()
})

// GET /api/admin/profile
router.get('/profile', async (req, res) => {
  try {
    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.query('SELECT id, email, full_name as name FROM users WHERE id = ?', [req.session.userId])
      if (rows.length === 0) return res.status(404).json({ message: 'Admin not found' })
      res.json(rows[0])
    } finally { connection.release() }
  } catch (err) {
    console.error('Admin profile error', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// POST /api/admin/update-name
router.post('/update-name', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ message: 'Name required' })
  try {
    const connection = await pool.getConnection()
    try {
      await connection.query('UPDATE users SET full_name = ? WHERE id = ?', [name, req.session.userId])
      res.json({ message: 'Name updated' })
    } finally { connection.release() }
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }) }
})

// POST /api/admin/change-email
router.post('/change-email', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' })
  try {
    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.query('SELECT password FROM users WHERE id = ?', [req.session.userId])
      if (rows.length === 0) return res.status(404).json({ message: 'Admin not found' })
      const match = await bcrypt.compare(password, rows[0].password)
      if (!match) return res.status(401).json({ message: 'Invalid password' })
      await connection.query('UPDATE users SET email = ? WHERE id = ?', [email, req.session.userId])
      res.json({ message: 'Email updated' })
    } finally { connection.release() }
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }) }
})

// POST /admin/change-password
router.post('/change-password', async (req, res) => {
  const { current, newPass } = req.body
  if (!current || !newPass) return res.status(400).json({ message: 'Both current and new password required' })
  if (newPass.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' })

  let connection
  try {
    connection = await pool.getConnection()
    const [rows] = await connection.query('SELECT password FROM users WHERE id = ?', [req.session.userId])
    if (rows.length === 0) return res.status(404).json({ message: 'Admin not found' })
    const isMatch = await bcrypt.compare(current, rows[0].password)
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' })
    const hashedPassword = await bcrypt.hash(newPass, 10)
    const [result] = await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.session.userId])
    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Password update failed' })
    }

    req.session.regenerate(err => {
      if (err) return res.status(500).json({ message: 'Session refresh failed' })
      req.session.userId = req.session.userId
      res.json({ message: 'Password changed' })
    })
  } catch (err) {
    console.error('Change password error', err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    if (connection) connection.release()
  }
})

module.exports = router
