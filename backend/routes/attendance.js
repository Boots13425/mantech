const express = require("express")
const mysql = require("mysql2/promise")
const ExcelJS = require("exceljs")
const router = express.Router()
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
  const allowedSubnets = 
process.env.ALLOWED_SUBNETS
? process.env.ALLOWED_SUBNETS.split(",")
 : [];
 
function getClientIP(req) {
  let ip =
   req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || req.connection.remoteAddress || ""
      if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7)
      }
      return ip
}
 

function getDeviceFingerprint(req) {
  const userAgent = req.headers["user-agent"] || ""
  const timestamp = new Date().toISOString().split("T")[0]
  return Buffer.from(userAgent + timestamp)
    .toString("base64")
    .substring(0, 255)
}

function isLANAccess(ipAddress) {
  return allowedSubnets.some(sub => ipAddress.startsWith(sub))
}

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
    connection.release()
  }
})

// Export attendance to Excel
router.get("/export", async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]
    const today = new Date().toISOString().split("T")[0]

    // Prevent exporting future dates
    if (date > today) {
      return res.status(400).json({
        success: false,
        message: "Cannot export attendance for future dates.",
      })
    }

    // Get all interns
    const [allInterns] = await connection.query(
      `SELECT id, first_name, last_name, email, department FROM interns ORDER BY first_name ASC`,
    )

    if (allInterns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No interns found",
      })
    }

    // Get attendance records for the selected date
    const [attendanceRecords] = await connection.query(
      `SELECT a.intern_id, a.status, a.sign_in_time, a.is_override, a.override_reason
       FROM attendance a
       WHERE a.attendance_date = ?`,
      [date],
    )

    // Create a map of attendance by intern_id
    const attendanceMap = {}
    attendanceRecords.forEach((record) => {
      attendanceMap[record.intern_id] = record
    })

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Attendance")

    worksheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "First Name", key: "first_name", width: 15 },
      { header: "Last Name", key: "last_name", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Department", key: "department", width: 15 },
      { header: "Status", key: "status", width: 12 },
      { header: "Sign-in Time", key: "sign_in_time", width: 15 },
      { header: "Override", key: "is_override", width: 10 },
      { header: "Override Reason", key: "override_reason", width: 25 },
    ]

    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF667eea" },
    }
    headerRow.alignment = { horizontal: "center", vertical: "center" }

    // Add all interns with their attendance status
    allInterns.forEach((intern, index) => {
      const attendance = attendanceMap[intern.id]
      const status = attendance ? attendance.status.toUpperCase() : "ABSENT"
      const signInTime =
        attendance && attendance.sign_in_time ? new Date(attendance.sign_in_time).toLocaleTimeString() : "N/A"
      const isOverride = attendance && attendance.is_override ? "Yes" : "No"
      const overrideReason = attendance?.override_reason || ""

      const row = worksheet.addRow({
        id: intern.id,
        first_name: intern.first_name,
        last_name: intern.last_name,
        email: intern.email,
        department: intern.department,
        status: status,
        sign_in_time: signInTime,
        is_override: isOverride,
        override_reason: overrideReason,
      })

      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7FAFC" },
        }
      }

      row.alignment = { horizontal: "center", vertical: "center" }
    })

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${date}.xlsx"`)

    await workbook.xlsx.write(res)
    res.end()
  } catch (error) {
    console.error("Excel export error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to export attendance",
    })
  } finally {
    connection.release()
  }
})

// Get attendance history
router.get("/history", async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const { start_date, end_date, intern_id } = req.query
    const date = start_date || new Date().toISOString().split("T")[0]

    // Get all interns
    const [allInterns] = await connection.query(
      `SELECT id, first_name, last_name, email, department FROM interns ORDER BY first_name ASC`,
    )

    // Get attendance records for the selected date
    const [attendanceRecords] = await connection.query(
      `SELECT a.intern_id, a.attendance_date, a.status, a.sign_in_time, a.is_override, a.override_reason
       FROM attendance a
       WHERE a.attendance_date = ?
       ORDER BY a.intern_id ASC`,
      [date],
    )

    // Create a map of attendance by intern_id for quick lookup
    const attendanceMap = {}
    attendanceRecords.forEach((record) => {
      attendanceMap[record.intern_id] = record
    })

    // Merge all interns with their attendance data (default to ABSENT)
    const mergedData = allInterns.map((intern) => {
      const attendance = attendanceMap[intern.id] || {
        intern_id: intern.id,
        attendance_date: date,
        status: "absent",
        sign_in_time: null,
        is_override: false,
        override_reason: null,
      }

      return {
        id: intern.id,
        intern_id: intern.id,
        first_name: intern.first_name,
        last_name: intern.last_name,
        email: intern.email,
        department: intern.department,
        attendance_date: attendance.attendance_date,
        status: attendance.status,
        sign_in_time: attendance.sign_in_time,
        is_override: attendance.is_override,
        override_reason: attendance.override_reason,
      }
    })

    res.json({
      success: true,
      records: mergedData,
      total_count: mergedData.length,
      date: date,
    })
  } catch (error) {
    console.error(" Attendance history error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history.",
    })
  } finally {
    connection.release()
  }
})

router.post("/sign-in", async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const { registration_id } = req.body
    const clientIP = getClientIP(req)
    const deviceFingerprint = getDeviceFingerprint(req)
    const today = new Date().toISOString().split("T")[0]

    if (!isLANAccess(clientIP)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You must be connected to the NTECH INTERNS network.",
      })
    }

    if (!registration_id || !/^INT\d{6}$/.test(registration_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID format.",
      })
    }

    const [interns] = await connection.query(
      `SELECT id, first_name, last_name, email, status 
       FROM interns 
       WHERE registration_id = ? AND status = 'active'`,
      [registration_id],
    )

    if (!interns || interns.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Intern not found or inactive.",
      })
    }

    const internId = interns[0].id

    const [existing] = await connection.query(
      `SELECT id FROM attendance 
       WHERE intern_id = ? AND attendance_date = ?`,
      [internId, today],
    )

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for today.",
      })
    }

    // Prevent reuse of the same device fingerprint for multiple interns on the same day
    const [deviceUsed] = await connection.query(
      `SELECT intern_id, registration_id FROM attendance 
       WHERE attendance_date = ? AND device_fingerprint = ?
       LIMIT 1`,
      [today, deviceFingerprint],
    )

    if (deviceUsed && deviceUsed.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This device has already been used to sign attendance for today.",
        used_by_registration_id: deviceUsed[0].registration_id || null,
        used_by_intern_id: deviceUsed[0].intern_id,
      })
    }

    const currentTime = new Date()
    await connection.query(
      `INSERT INTO attendance 
       (intern_id, attendance_date, status, registration_id, sign_in_time, ip_address, device_fingerprint, validation_method) 
       VALUES (?, ?, 'present', ?, ?, ?, ?, 'token')`,
      [internId, today, registration_id, currentTime, clientIP, deviceFingerprint],
    )

    res.json({
      success: true,
      message: `Attendance marked successfully for ${interns[0].first_name} ${interns[0].last_name}`,
      intern_name: `${interns[0].first_name} ${interns[0].last_name}`,
    })
  } catch (error) {
    console.error(" Attendance sign-in error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to mark attendance.",
    })
  } finally {
    connection.release()
  }
})

router.post("/override", async (req, res) => {
  const connection = await pool.getConnection()
  try {
    const { intern_id, date, status, reason, admin_id } = req.body

    if (!intern_id || !date || !status || !admin_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields.",
      })
    }

    if (!["present", "absent", "late", "excused"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: present, absent, late, excused",
      })
    }

    const [existing] = await connection.query(
      `SELECT status FROM attendance WHERE intern_id = ? AND attendance_date = ?`,
      [intern_id, date],
    )

    if (existing && existing.length > 0) {
      const oldStatus = existing[0].status
      await connection.query(
        `UPDATE attendance 
         SET status = ?, is_override = true, override_by = ?, override_reason = ?
         WHERE intern_id = ? AND attendance_date = ?`,
        [status, admin_id, reason, intern_id, date],
      )

      await connection.query(
        `INSERT INTO attendance_audit_logs 
         (admin_id, intern_id, action, old_value, new_value, reason) 
         VALUES (?, ?, 'override', ?, ?, ?)`,
        [admin_id, intern_id, oldStatus, status, reason],
      )
    } else {
      await connection.query(
        `INSERT INTO attendance 
         (intern_id, attendance_date, status, is_override, override_by, override_reason) 
         VALUES (?, ?, ?, true, ?, ?)`,
        [intern_id, date, status, admin_id, reason],
      )

      await connection.query(
        `INSERT INTO attendance_audit_logs 
         (admin_id, intern_id, action, new_value, reason) 
         VALUES (?, ?, 'create_override', ?, ?)`,
        [admin_id, intern_id, status, reason],
      )
    }

    res.json({
      success: true,
      message: "Attendance overridden successfully.",
    })
  } catch (error) {
    console.error("[v0] Attendance override error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to override attendance.",
    })
  } finally {
    connection.release()
  }
})

module.exports = router
