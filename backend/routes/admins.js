const express = require('express')
const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')
require('dotenv').config()

const router = express.Router()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mantech_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// list admins
router.get('/', async (req, res) => {
  try {
    const connection = await pool.getConnection()
    try {
      const [rows] = await connection.query('SELECT id, email, full_name as name, COALESCE(permission, "full") as permission, COALESCE(status, "active") as status FROM users ORDER BY id DESC')
      res.json(rows)
    } finally { connection.release() }
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }) }
})

// create admin
router.post('/', async (req, res) => {
  const { email, name } = req.body
  if (!email || !name) return res.status(400).json({ message: 'Email and name required' })

  try {
    const connection = await pool.getConnection()
    try {
      // default temporary password
      const tmp = 'TempPass@123'
      const hashed = await bcrypt.hash(tmp, 10)
      const [result] = await connection.query('INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)', [email, hashed, name])
      res.status(201).json({ message: 'Admin user added', id: result.insertId })
    } finally { connection.release() }
  } catch (err) {
    console.error('Add admin error', err)
    res.status(500).json({ message: 'Failed to add admin' })
  }
})

// update status
router.post('/:id/status', async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (!status) return res.status(400).json({ message: 'Status required' })
  try {
    const connection = await pool.getConnection()
    try {
      await connection.query('UPDATE users SET status = ? WHERE id = ?', [status, id])
      res.json({ message: 'Status updated' })
    } finally { connection.release() }
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }) }
})

// delete admin
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const connection = await pool.getConnection()
    try {
      await connection.query('DELETE FROM users WHERE id = ?', [id])
      res.json({ message: 'Admin removed' })
    } finally { connection.release() }
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }) }
})

module.exports = router
