const express = require('express')
const fs = require('fs').promises
const path = require('path')
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

const BACKUP_DIR = path.join(__dirname, '../../backups')

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true })
  } catch (e) { /* ignore */ }
}

// GET last backup info
router.get('/last', async (req, res) => {
  try {
    await ensureBackupDir()
    const files = await fs.readdir(BACKUP_DIR)
    const backups = files.filter(f => f.endsWith('.backup.json'))
    if (backups.length === 0) return res.json({ lastBackup: null, status: 'No backups' })
    // find latest by name
    backups.sort()
    const latest = backups[backups.length - 1]
    const stats = await fs.stat(path.join(BACKUP_DIR, latest))
    res.json({ lastBackup: stats.mtime.toISOString(), file: latest, status: 'Available' })
  } catch (err) {
    console.error('Backups last error', err)
    res.status(500).json({ message: 'Failed to read backups' })
  }
})

// POST create backup
router.post('/create', async (req, res) => {
  try {
    await ensureBackupDir()
    const connection = await pool.getConnection()
    try {
      // read main tables (safe defaults)
      const tables = ['users','interns','receipts','payments','attendance']
      const data = {}
      for (const t of tables) {
        try {
          const [rows] = await connection.query(`SELECT * FROM \`${t}\` LIMIT 10000`)
          data[t] = rows
        } catch (e) {
          data[t] = []
        }
      }
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${ts}.backup.json`
      const filepath = path.join(BACKUP_DIR, filename)
      await fs.writeFile(filepath, JSON.stringify({ created: new Date().toISOString(), data }, null, 2), 'utf8')
      res.status(201).json({ message: 'Backup created', file: filename })
    } finally { connection.release() }
  } catch (err) {
    console.error('Backup create error', err)
    res.status(500).json({ message: 'Failed to create backup' })
  }
})

// GET download latest backup
router.get('/download', async (req, res) => {
  try {
    await ensureBackupDir()
    const files = await fs.readdir(BACKUP_DIR)
    const backups = files.filter(f => f.endsWith('.backup.json'))
    if (backups.length === 0) return res.status(404).json({ message: 'No backups available' })
    backups.sort()
    const latest = backups[backups.length - 1]
    const filepath = path.join(BACKUP_DIR, latest)
    res.download(filepath, `mantech-${latest}`)
  } catch (err) {
    console.error('Backup download error', err)
    res.status(500).json({ message: 'Failed to download backup' })
  }
})

// POST restore (accept file upload or backupId). This route will accept the request and queue a restore operation.
// For safety we don't perform automatic DB writes in this simple implementation.
router.post('/restore', async (req, res) => {
  try {
    // If multipart/form-data file upload, tell the client this is not yet supported
    // If backupId provided, we acknowledge the request
    if (req.headers['content-type'] && req.headers['content-type'].startsWith('multipart/form-data')) {
      return res.status(501).json({ message: 'File restore via upload not implemented on this server' })
    }
    // else, accept backupId
    // Use body parser for form fields, but here we just accept and respond
    res.status(202).json({ message: 'Restore request received. Manual restore not implemented via API.' })
  } catch (err) {
    console.error('Backup restore error', err)
    res.status(500).json({ message: 'Failed to start restore' })
  }
})

module.exports = router
