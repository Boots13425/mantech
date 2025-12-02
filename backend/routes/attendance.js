// Attendance Routes
const express = require("express")
const ExcelJS = require("exceljs")
const mysql = require('mysql2/promise')
const router = express.Router()
require('dotenv').config()

// Create a MySQL pool for this router
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mantech_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Get all interns for attendance list
router.get("/list", async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const [interns] = await connection.query(
      `SELECT id, first_name, last_name, email, department, status 
       FROM interns 
       ORDER BY first_name ASC`,
    )


    res.json({
      success: true,
      interns: interns,
    })
  } catch (error) {
    console.error("[v0] Attendance list error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance list",
    })
  } finally {
    try {
      connection.release()
    } catch (e) {
      console.error('Connection release error:', e)
    }
  }
})

// Export attendance to Excel
router.get("/export", async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]

    // Fetch all interns
    const [interns] = await connection.query(
      `SELECT id, first_name, last_name, email, department, status 
       FROM interns 
       ORDER BY first_name ASC`,
    )

    if (interns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No interns found",
      })
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Attendance")

    // Define columns
    worksheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "First Name", key: "first_name", width: 15 },
      { header: "Last Name", key: "last_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Department", key: "department", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Attendance", key: "attendance", width: 12 },
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF667eea" },
    }
    headerRow.alignment = { horizontal: "center", vertical: "center" }

    // Add data rows
    interns.forEach((intern, index) => {
      const row = worksheet.addRow({
        id: intern.id,
        first_name: intern.first_name,
        last_name: intern.last_name,
        email: intern.email,
        department: intern.department,
        status: intern.status,
        attendance: "Present", // Default value
      })

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7FAFC" },
        }
      }

      // Center align cells
      row.alignment = { horizontal: "center", vertical: "center" }
    })

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${date}.xlsx"`)

    // Write workbook to response
    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("[v0] Excel export error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to export attendance",
    })
  } finally {
    try {
      connection.release()
    } catch (e) {
      console.error('Connection release error:', e)
    }
  }
})

module.exports = router
