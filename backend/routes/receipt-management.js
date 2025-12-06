const express = require("express")
const router = express.Router()
const mysql = require("mysql2/promise")
const PDFDocument = require("pdfkit")
const QRCode = require("qrcode")
const fs = require("fs")
const path = require("path")

// Initialize MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Generate unique receipt ID: ETS/YYYY/MM/SEQUENCE
async function generateReceiptId() {
  const connection = await pool.getConnection()
  try {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const yearMonth = `${year}${month}`

    // Get last receipt number for this month
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM receipts 
       WHERE DATE_FORMAT(payment_date, '%Y%m') = ?`,
      [yearMonth],
    )

    const sequence = String(rows[0].count + 1).padStart(3, "0")
    return `ETS/${year}/${month}/${sequence}`
  } finally {
    connection.release()
  }
}

// Get all receipts
router.get("/all", async (req, res) => {
  try {
    const connection = await pool.getConnection()
    try {
      const [receipts] = await connection.query(
        `SELECT r.id, r.receipt_id, i.first_name, i.last_name, r.payment_type, 
                r.amount_paid, r.payment_date, r.status, r.amount_due
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         WHERE r.status != 'Void'
         ORDER BY r.payment_date DESC
         LIMIT 100`,
      )

      res.json(receipts)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error fetching all receipts:", error)
    res.status(500).json({ message: "Failed to fetch receipts" })
  }
})

// Filter receipts
router.get("/filter", async (req, res) => {
  try {
    const { date, type } = req.query
    const connection = await pool.getConnection()

    try {
      let query = `SELECT r.id, r.receipt_id, i.first_name, i.last_name, r.payment_type, 
                          r.amount_paid, r.payment_date, r.status, r.amount_due
                   FROM receipts r
                   JOIN interns i ON r.intern_id = i.id
                   WHERE r.status != 'Void'`
      const params = []

      if (date) {
        query += ` AND DATE(r.payment_date) = ?`
        params.push(date)
      }

      if (type) {
        query += ` AND r.payment_type = ?`
        params.push(type)
      }

      query += ` ORDER BY r.payment_date DESC`

      const [receipts] = await connection.query(query, params)
      res.json(receipts)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error filtering receipts:", error)
    res.status(500).json({ message: "Failed to filter receipts" })
  }
})

// Fuzzy search interns
router.get("/search-interns", async (req, res) => {
  try {
    const { query } = req.query

    if (!query || query.length < 2) {
      return res.json([])
    }

    const connection = await pool.getConnection()
    try {
      const [interns] = await connection.query(
        `SELECT id, first_name, last_name, email, phone, status
         FROM interns 
         WHERE status = 'Active'
         AND (
           first_name LIKE ? 
           OR last_name LIKE ? 
           OR email LIKE ?
           OR CONCAT(first_name, ' ', last_name) LIKE ?
         )
         LIMIT 10`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
      )

      res.json(interns)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Search error:", error)
    res.status(500).json({ message: "Search failed" })
  }
})

// Get intern details by ID
router.get("/intern/:id", async (req, res) => {
  try {
    const { id } = req.params

    const connection = await pool.getConnection()
    try {
      const [interns] = await connection.query(
        `SELECT id, first_name, last_name, email, phone 
         FROM interns 
         WHERE id = ? AND status = 'Active'`,
        [id],
      )

      if (interns.length === 0) {
        return res.status(404).json({ message: "Intern not found" })
      }

      res.json(interns[0])
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error fetching intern:", error)
    res.status(500).json({ message: "Failed to fetch intern details" })
  }
})

// Create receipt
router.post("/create", async (req, res) => {
  try {
    const {
      internId,
      paymentDate,
      paymentType,
      feeTypeDescription,
      paymentDescription,
      amountDue,
      amountPaid,
      paymentMethod,
      notes,
      receivedBy,
      userId,
    } = req.body

    // Validation
    if (!internId || !paymentDate || !paymentType || !amountDue || !amountPaid || !paymentMethod) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Generate receipt ID
      const receiptId = await generateReceiptId()

      // Insert receipt
      const [result] = await connection.query(
        `INSERT INTO receipts 
         (receipt_id, intern_id, payment_date, payment_type, fee_type_description, 
          payment_description, amount_due, amount_paid, payment_method, received_by, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptId,
          internId,
          paymentDate,
          paymentType,
          feeTypeDescription || null,
          paymentDescription || null,
          amountDue,
          amountPaid,
          paymentMethod,
          receivedBy,
          notes || null,
          userId,
        ],
      )

      const receiptId_id = result.insertId

      // Create audit log
      await connection.query(
        `INSERT INTO receipt_audit_logs 
         (receipt_id, action, action_by, new_values)
         VALUES (?, 'CREATE', ?, ?)`,
        [
          receiptId_id,
          userId,
          JSON.stringify({
            receipt_id: receiptId,
            amount_due: amountDue,
            amount_paid: amountPaid,
          }),
        ],
      )

      await connection.commit()

      res.status(201).json({
        message: "Receipt created successfully",
        receiptId: receiptId,
        receipt_id: receiptId_id,
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Receipt creation error:", error)
    res.status(500).json({ message: "Failed to create receipt" })
  }
})

// Search receipts
router.get("/search", async (req, res) => {
  try {
    const { query, startDate, endDate, paymentType, minAmount, maxAmount, page = 1 } = req.query
    const pageSize = 20
    const offset = (page - 1) * pageSize

    const connection = await pool.getConnection()
    try {
      let whereClause = "WHERE r.status != 'Void'"
      const params = []

      // Receipt ID search
      if (query) {
        whereClause += " AND (r.receipt_id LIKE ? OR i.first_name LIKE ? OR i.last_name LIKE ?)"
        params.push(`%${query}%`, `%${query}%`, `%${query}%`)
      }

      // Date range
      if (startDate) {
        whereClause += " AND r.payment_date >= ?"
        params.push(startDate)
      }
      if (endDate) {
        whereClause += " AND r.payment_date <= ?"
        params.push(endDate)
      }

      // Payment type filter
      if (paymentType) {
        whereClause += " AND r.payment_type = ?"
        params.push(paymentType)
      }

      // Amount range
      if (minAmount) {
        whereClause += " AND r.amount_paid >= ?"
        params.push(minAmount)
      }
      if (maxAmount) {
        whereClause += " AND r.amount_paid <= ?"
        params.push(maxAmount)
      }

      // Count total
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total FROM receipts r 
         JOIN interns i ON r.intern_id = i.id
         ${whereClause}`,
        params,
      )

      // Get paginated results
      const [receipts] = await connection.query(
        `SELECT r.id, r.receipt_id, i.first_name, i.last_name, i.email,
                r.payment_type, r.amount_paid, r.payment_date, r.status
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         ${whereClause}
         ORDER BY r.payment_date DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      )

      res.json({
        total: countResult[0].total,
        page,
        pageSize,
        results: receipts,
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Search error:", error)
    res.status(500).json({ message: "Search failed" })
  }
})

// Get receipt details
router.get("/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params

    const connection = await pool.getConnection()
    try {
      const [receipts] = await connection.query(
        `SELECT r.*, i.first_name, i.last_name, i.email, i.phone
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         WHERE r.id = ? OR r.receipt_id = ?`,
        [receiptId, receiptId],
      )

      if (receipts.length === 0) {
        return res.status(404).json({ message: "Receipt not found" })
      }

      res.json(receipts[0])
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error fetching receipt:", error)
    res.status(500).json({ message: "Failed to fetch receipt" })
  }
})

// Generate receipt PDF
router.get("/print/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params

    const connection = await pool.getConnection()
    try {
      const [receipts] = await connection.query(
        `SELECT r.*, i.first_name, i.last_name, i.email, i.phone
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         WHERE r.id = ? OR r.receipt_id = ?`,
        [receiptId, receiptId],
      )

      if (receipts.length === 0) {
        return res.status(404).json({ message: "Receipt not found" })
      }

      const receipt = receipts[0]

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(receipt.receipt_id)

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      })

      // Response headers
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="receipt-${receipt.receipt_id}.pdf"`)

      // Header with branding
      doc.fontSize(20).font("Helvetica-Bold").text("ETS NTECH", 40, 40)
      doc.fontSize(10).font("Helvetica").text("Enterprise Technology Solutions", 40, 65)
      doc.moveTo(40, 85).lineTo(555, 85).stroke("#667eea")

      // Receipt title
      doc.fontSize(18).font("Helvetica-Bold").text("PAYMENT RECEIPT", 40, 110)

      // Receipt details box
      const detailsY = 160
      doc.fontSize(10)
      doc.font("Helvetica-Bold").text("Receipt ID:", 40, detailsY)
      doc.font("Helvetica").text(receipt.receipt_id, 150, detailsY)

      doc.font("Helvetica-Bold").text("Date:", 40, detailsY + 25)
      doc.font("Helvetica").text(new Date(receipt.payment_date).toLocaleDateString(), 150, detailsY + 25)

      doc.font("Helvetica-Bold").text("Status:", 40, detailsY + 50)
      doc.font("Helvetica").text(receipt.status, 150, detailsY + 50)

      // Intern Information
      const infoY = 280
      doc.fontSize(11).font("Helvetica-Bold").text("INTERN INFORMATION", 40, infoY)
      doc
        .moveTo(40, infoY + 20)
        .lineTo(555, infoY + 20)
        .stroke("#e2e8f0")

      doc.fontSize(10)
      doc.font("Helvetica-Bold").text("Full Name:", 40, infoY + 40)
      doc.font("Helvetica").text(`${receipt.first_name} ${receipt.last_name}`, 150, infoY + 40)

      doc.font("Helvetica-Bold").text("Email:", 40, infoY + 65)
      doc.font("Helvetica").text(receipt.email, 150, infoY + 65)

      doc.font("Helvetica-Bold").text("Phone:", 40, infoY + 90)
      doc.font("Helvetica").text(receipt.phone || "N/A", 150, infoY + 90)

      // Payment Details
      const paymentY = infoY + 140
      doc.fontSize(11).font("Helvetica-Bold").text("PAYMENT DETAILS", 40, paymentY)
      doc
        .moveTo(40, paymentY + 20)
        .lineTo(555, paymentY + 20)
        .stroke("#e2e8f0")

      doc.fontSize(10)
      doc.font("Helvetica-Bold").text("Payment Type:", 40, paymentY + 40)
      doc.font("Helvetica").text(receipt.payment_type, 150, paymentY + 40)

      if (receipt.fee_type_description) {
        doc.font("Helvetica-Bold").text("Fee Type:", 40, paymentY + 65)
        doc.font("Helvetica").text(receipt.fee_type_description, 150, paymentY + 65)
      }

      const descY = receipt.fee_type_description ? paymentY + 90 : paymentY + 65
      doc.font("Helvetica-Bold").text("Payment Method:", 40, descY)
      doc.font("Helvetica").text(receipt.payment_method, 150, descY)

      // Financial Summary with XAF currency
      const financeY = descY + 60
      doc.fontSize(11).font("Helvetica-Bold").text("FINANCIAL SUMMARY", 40, financeY)
      doc
        .moveTo(40, financeY + 20)
        .lineTo(555, financeY + 20)
        .stroke("#e2e8f0")

      doc.fontSize(10).font("Helvetica-Bold")
      doc.text("Amount Due:", 40, financeY + 45)
      doc.text("Amount Paid:", 40, financeY + 70)
      doc.text("Balance:", 40, financeY + 95)

      doc.font("Helvetica")
      doc.text(`${receipt.amount_due.toLocaleString()} XAF`, 200, financeY + 45)
      doc.text(`${receipt.amount_paid.toLocaleString()} XAF`, 200, financeY + 70)
      const balance = receipt.amount_due - receipt.amount_paid
      doc.text(`${balance.toLocaleString()} XAF`, 200, financeY + 95)

      // QR Code
      const qrY = financeY + 150
      const qrBuffer = Buffer.from(qrCodeUrl.split(",")[1], "base64")
      doc.image(qrBuffer, 450, qrY, { width: 80, height: 80 })

      // Footer
      const footerY = 750
      doc.moveTo(40, footerY).lineTo(555, footerY).stroke("#e2e8f0")
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("ETS NTECH | Enterprise Network Technology", 40, footerY + 20, {
          align: "center",
        })
      doc.text(
        "This receipt is an official acknowledgment of payment. Please retain for your records.",
        40,
        footerY + 35,
        { align: "center" },
      )

      // If void, add watermark
      if (receipt.status === "Void") {
        doc.fontSize(60).fillOpacity(0.1).text("VOID", 150, 350, { align: "center" }).fillOpacity(1)
      }

      doc.pipe(res)
      doc.end()
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("PDF generation error:", error)
    res.status(500).json({ message: "Failed to generate PDF" })
  }
})

// Void receipt
router.post("/void/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params
    const { voidReason, userId } = req.body

    if (!voidReason) {
      return res.status(400).json({ message: "Void reason is required" })
    }

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Update receipt status
      await connection.query(
        `UPDATE receipts 
         SET status = 'Void', void_reason = ?, voided_at = NOW(), voided_by = ?
         WHERE id = ? OR receipt_id = ?`,
        [voidReason, userId, receiptId, receiptId],
      )

      // Create audit log
      await connection.query(
        `INSERT INTO receipt_audit_logs 
         (receipt_id, action, action_by, new_values)
         SELECT id, 'VOID', ?, JSON_OBJECT('void_reason', ?)
         FROM receipts
         WHERE id = ? OR receipt_id = ?`,
        [userId, voidReason, receiptId, receiptId],
      )

      await connection.commit()

      res.json({ message: "Receipt voided successfully" })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Void error:", error)
    res.status(500).json({ message: "Failed to void receipt" })
  }
})

// Update receipt
router.put("/update/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params
    const { paymentDate, amountDue, amountPaid, paymentMethod, receivedBy, notes, userId } = req.body

    if (!paymentDate || amountDue === undefined || amountPaid === undefined) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Get current receipt for audit log
      const [currentReceipt] = await connection.query(`SELECT * FROM receipts WHERE id = ? OR receipt_id = ?`, [
        receiptId,
        receiptId,
      ])

      if (currentReceipt.length === 0) {
        return res.status(404).json({ message: "Receipt not found" })
      }

      // Update receipt
      await connection.query(
        `UPDATE receipts 
         SET payment_date = ?, amount_due = ?, amount_paid = ?, 
             payment_method = ?, received_by = ?, notes = ?, updated_at = NOW()
         WHERE id = ? OR receipt_id = ?`,
        [paymentDate, amountDue, amountPaid, paymentMethod, receivedBy, notes, receiptId, receiptId],
      )

      // Create audit log for update
      await connection.query(
        `INSERT INTO receipt_audit_logs 
         (receipt_id, action, action_by, old_values, new_values)
         SELECT id, 'UPDATE', ?, 
                JSON_OBJECT('amount_due', ?, 'amount_paid', ?),
                JSON_OBJECT('amount_due', ?, 'amount_paid', ?)
         FROM receipts
         WHERE id = ? OR receipt_id = ?`,
        [
          userId,
          currentReceipt[0].amount_due,
          currentReceipt[0].amount_paid,
          amountDue,
          amountPaid,
          receiptId,
          receiptId,
        ],
      )

      await connection.commit()
      res.json({ message: "Receipt updated successfully" })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Update error:", error)
    res.status(500).json({ message: "Failed to update receipt" })
  }
})

module.exports = router
