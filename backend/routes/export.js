const express = require('express')
const mysql = require('mysql2/promise')
// Lightweight CSV generator (no external dependency)
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

// Export simple CSV for requested type (interns, receipts, attendance)
router.get('/:type', async (req, res) => {
  const { type } = req.params

  try {
    const connection = await pool.getConnection()
    try {
      let rows = []
      if (type === 'interns') {
        const [r] = await connection.query('SELECT id, first_name, last_name, email, phone, department, status FROM interns')
        rows = r
      } else if (type === 'receipts') {
        const [r] = await connection.query('SELECT id, receipt_id, intern_id, payment_type, amount_paid, amount_due, payment_date, payment_method, status FROM receipts')
        rows = r
      } else if (type === 'attendance') {
        const [r] = await connection.query('SELECT id, intern_id, date, status, notes FROM attendance')
        rows = r
      } else {
        return res.status(400).json({ message: 'Unknown export type' })
      }

      // convert rows (array of objects) to CSV
      function toCsv(data) {
        if (!data || data.length === 0) return ''
        const keys = Object.keys(data[0])
        const escape = (v) => {
          if (v === null || v === undefined) return ''
          const s = String(v)
          if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
            return '"' + s.replace(/"/g, '""') + '"'
          }
          return s
        }
        const lines = [keys.join(',')]
        for (const row of data) {
          lines.push(keys.map(k => escape(row[k])).join(','))
        }
        return lines.join('\n')
      }

      const csv = toCsv(rows)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`)
      res.send(csv)
    } finally { connection.release() }
  } catch (err) {
    console.error('Export error', err)
    res.status(500).json({ message: 'Failed to export data' })
  }
})

module.exports = router
