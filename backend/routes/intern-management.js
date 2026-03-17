const express = require("express")
const router = express.Router()
const mysql = require("mysql2/promise")
require("dotenv").config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mantech_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone) {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
  return phoneRegex.test(String(phone || "").replace(/\s/g, ""))
}

function isValidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return true
  return new Date(startDate) < new Date(endDate)
}

// GET all interns with optional search and status filter
router.get("/", async (req, res) => {
  let connection
  try {
    const { query = "", status = "" } = req.query
    connection = await pool.getConnection()

    let sql = `
      SELECT 
        id,
        registration_id,
        first_name,
        last_name,
        email,
        phone,
        school,
        degree,
        year_of_study,
        gpa,
        department,
        start_date,
        end_date,
        mentor,
        skills,
        notes,
        registration_date,
        status
      FROM interns
      WHERE 1=1
    `
    const params = []

    if (query && query.trim()) {
      sql += `
        AND (
          first_name LIKE ?
          OR last_name LIKE ?
          OR email LIKE ?
          OR phone LIKE ?
          OR registration_id LIKE ?
          OR department LIKE ?
          OR school LIKE ?
        )
      `
      const searchTerm = `%${query.trim()}%`
      params.push(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm
      )
    }

    if (status && status.trim()) {
      sql += ` AND status = ? `
      params.push(status.trim())
    }

    sql += ` ORDER BY id DESC `

    const [rows] = await connection.query(sql, params)
    res.json(rows)
  } catch (error) {
    console.error("Fetch interns error:", error)
    res.status(500).json({ message: "Failed to fetch interns." })
  } finally {
    if (connection) connection.release()
  }
})

// GET single intern by id
router.get("/:id", async (req, res) => {
  let connection
  try {
    const { id } = req.params
    connection = await pool.getConnection()

    const [rows] = await connection.query(
      `
      SELECT 
        id,
        registration_id,
        first_name,
        last_name,
        email,
        phone,
        school,
        degree,
        year_of_study,
        gpa,
        department,
        start_date,
        end_date,
        mentor,
        skills,
        notes,
        registration_date,
        status
      FROM interns
      WHERE id = ?
      `,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: "Intern not found." })
    }

    res.json(rows[0])
  } catch (error) {
    console.error("Fetch intern error:", error)
    res.status(500).json({ message: "Failed to fetch intern." })
  } finally {
    if (connection) connection.release()
  }
})

// UPDATE intern by id
router.put("/:id", async (req, res) => {
  let connection
  try {
    const { id } = req.params
    const {
      firstName,
      lastName,
      email,
      phone,
      school,
      degree,
      yearOfStudy,
      gpa,
      department,
      startDate,
      endDate,
      mentor,
      skills,
      notes,
      status,
    } = req.body

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !school ||
      !degree ||
      !yearOfStudy ||
      !department ||
      !startDate ||
      !endDate ||
      !skills
    ) {
      return res.status(400).json({
        message: "All required fields must be provided.",
      })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format.",
      })
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message:
          "Invalid phone number format. Please use formats like: (123) 456-7890, 123-456-7890, or 1234567890",
      })
    }

    if (!isValidDateRange(startDate, endDate)) {
      return res.status(400).json({
        message: "End date must be after start date.",
      })
    }

    const normalizedStatus = status === "inactive" ? "inactive" : "active"

    connection = await pool.getConnection()

    // Ensure intern exists
    const [existingIntern] = await connection.query(
      `SELECT id FROM interns WHERE id = ?`,
      [id]
    )

    if (existingIntern.length === 0) {
      return res.status(404).json({ message: "Intern not found." })
    }

    // Prevent duplicate email on another intern
    const [duplicateEmail] = await connection.query(
      `SELECT id FROM interns WHERE email = ? AND id <> ?`,
      [email, id]
    )

    if (duplicateEmail.length > 0) {
      return res.status(400).json({
        message: "Another intern with this email already exists.",
      })
    }

    await connection.query(
      `
      UPDATE interns
      SET
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        school = ?,
        degree = ?,
        year_of_study = ?,
        gpa = ?,
        department = ?,
        start_date = ?,
        end_date = ?,
        mentor = ?,
        skills = ?,
        notes = ?,
        status = ?
      WHERE id = ?
      `,
      [
        firstName,
        lastName,
        email,
        phone,
        school,
        degree,
        yearOfStudy,
        gpa || null,
        department,
        startDate,
        endDate,
        mentor || null,
        skills,
        notes || null,
        normalizedStatus,
        id,
      ]
    )

    res.json({ message: "Intern record updated successfully." })
  } catch (error) {
    console.error("Update intern error:", error)
    res.status(500).json({ message: "Failed to update intern record." })
  } finally {
    if (connection) connection.release()
  }
})

// SOFT DELETE intern by id (set status to inactive)
router.delete("/:id", async (req, res) => {
  let connection
  try {
    const { id } = req.params
    connection = await pool.getConnection()

    const [existingIntern] = await connection.query(
      `SELECT id, status FROM interns WHERE id = ?`,
      [id]
    )

    if (existingIntern.length === 0) {
      return res.status(404).json({ message: "Intern not found." })
    }

    await connection.query(
      `UPDATE interns SET status = 'inactive' WHERE id = ?`,
      [id]
    )

    res.json({ message: "Intern has been marked as inactive." })
  } catch (error) {
    console.error("Delete intern error:", error)
    res.status(500).json({ message: "Failed to deactivate intern." })
  } finally {
    if (connection) connection.release()
  }
})

module.exports = router