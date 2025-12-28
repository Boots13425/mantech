const express = require("express")
const router = express.Router()
const mysql = require("mysql2/promise")
const PDFDocument = require("pdfkit")
const QRCode = require("qrcode")
const fs = require("fs")
const path = require("path")
const nodemailer = require("nodemailer")
require("dotenv").config()

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

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

// Helper function to generate PDF and save to file (for email attachment)
async function generateReceiptPDFFile(receiptId) {
  return new Promise(async (resolve, reject) => {
    try {
      const connection = await pool.getConnection()
      let receipt

      try {
        // Get receipt with total paid from payments table + initial amount_paid (capped at amount_due)
        const [receipts] = await connection.query(
          `SELECT r.*, i.first_name, i.last_name, i.email, i.phone,
                  LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
           FROM receipts r
           JOIN interns i ON r.intern_id = i.id
           LEFT JOIN payments p ON r.id = p.receipt_id
           WHERE r.id = ? OR r.receipt_id = ?
           GROUP BY r.id`,
          [receiptId, receiptId],
        )

        if (receipts.length === 0) {
          return reject(new Error("Receipt not found"))
        }

        receipt = receipts[0]
      } finally {
        connection.release()
      }

      // Calculate payment status
      const totalPaid = receipt.total_paid
      const balance = receipt.amount_due - totalPaid
      const paymentStatus = balance === 0 ? "Paid in Full" : balance > 0 ? "Pending Payment" : "Overpayment Error"
      const statusColor = paymentStatus === "Paid in Full" ? "#10b981" : paymentStatus === "Pending Payment" ? "#f59e0b" : "#ef4444"

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(receipt.receipt_id)

      // Generate unique filename
      const fileName = `receipt-${receipt.receipt_id}-${Date.now()}.pdf`
      const filePath = path.join(__dirname, "../temp", fileName)

      // Create temp directory if it doesn't exist
      const tempDir = path.dirname(filePath)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      })

      const stream = fs.createWriteStream(filePath)

      // Header with branding
      doc.fontSize(20).font("Helvetica-Bold").text("ETS NTECH", 40, 40)
      doc.fontSize(10).font("Helvetica").text("Enterprise Network Technology", 40, 65)
      doc.moveTo(40, 85).lineTo(555, 85).stroke("#2563eb")

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
      doc.font("Helvetica").fillColor(statusColor).text(paymentStatus, 150, detailsY + 50).fillColor("#000000")

      // Intern Information
      const infoY = 280
      doc.fontSize(11).font("Helvetica-Bold").text("INTERN INFORMATION", 40, infoY)
      doc.moveTo(40, infoY + 20).lineTo(555, infoY + 20).stroke("#e2e8f0")

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
      doc.moveTo(40, paymentY + 20).lineTo(555, paymentY + 20).stroke("#e2e8f0")

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

      doc.font("Helvetica-Bold").text("Received By:", 40, descY + 25)
      doc.font("Helvetica").text(receipt.received_by || "N/A", 150, descY + 25)

      // Financial Summary
      const financeY = descY + 60
      doc.fontSize(11).font("Helvetica-Bold").text("FINANCIAL SUMMARY", 40, financeY)
      doc.moveTo(40, financeY + 20).lineTo(555, financeY + 20).stroke("#e2e8f0")

      doc.fontSize(10).font("Helvetica-Bold")
      doc.text("Amount Due:", 40, financeY + 45)
      doc.text("Amount Paid:", 40, financeY + 70)
      doc.text("Balance:", 40, financeY + 95)

      doc.font("Helvetica")
      doc.text(`${receipt.amount_due.toLocaleString()} XAF`, 200, financeY + 45)
      doc.text(`${totalPaid.toLocaleString()} XAF`, 200, financeY + 70)
      doc.text(`${balance.toLocaleString()} XAF`, 200, financeY + 95)

      // QR Code
      const qrY = financeY + 150
      const qrBuffer = Buffer.from(qrCodeUrl.split(",")[1], "base64")
      doc.image(qrBuffer, 450, qrY, { width: 80, height: 80 })

      // Footer
      const footerY = 750
      doc.moveTo(40, footerY).lineTo(555, footerY).stroke("#e2e8f0")
      doc.fontSize(8).font("Helvetica").text("ETS NTECH | Enterprise Network Technology", 40, footerY + 20, { align: "center" })
      doc.text("This receipt is an official acknowledgment of payment. Please retain for your records.", 40, footerY + 35, { align: "center" })

      // If void, add watermark
      if (receipt.status === "Void") {
        doc.fontSize(60).fillOpacity(0.1).text("VOID", 150, 350, { align: "center" }).fillOpacity(1)
      }

      // Pipe the PDF to the file stream
      doc.pipe(stream)

      // Handle stream finish event - this fires when all data is written
      stream.on("finish", () => {
        // Verify file exists and has content before resolving
        try {
          const stats = fs.statSync(filePath)
          if (stats.size > 0) {
            resolve(filePath)
          } else {
            reject(new Error("PDF file was created but is empty"))
          }
        } catch (err) {
          reject(new Error("PDF file was not created: " + err.message))
        }
      })

      stream.on("error", (error) => {
        reject(error)
      })

      doc.on("error", (error) => {
        reject(error)
      })

      // End the document - this will trigger the stream to finish
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

// Helper function to send receipt email
async function sendReceiptEmail(receiptId, isPartialPayment = false) {
  try {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn("Email credentials not configured in .env file. Email will not be sent.")
      return
    }

    const connection = await pool.getConnection()
    let receipt

    try {
      // Get receipt with intern details
      const [receipts] = await connection.query(
        `SELECT r.*, i.first_name, i.last_name, i.email, i.phone,
                LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         LEFT JOIN payments p ON r.id = p.receipt_id
         WHERE r.id = ? OR r.receipt_id = ?
         GROUP BY r.id`,
        [receiptId, receiptId],
      )

      if (receipts.length === 0) {
        console.error("Receipt not found for email:", receiptId)
        return
      }

      receipt = receipts[0]
    } finally {
      connection.release()
    }

    // Generate PDF file and wait for it to be fully written
    const pdfPath = await generateReceiptPDFFile(receiptId)
    
    // Verify PDF file exists and is readable before attaching
    if (!fs.existsSync(pdfPath)) {
      console.error("PDF file was not created:", pdfPath)
      return
    }
    
    const stats = fs.statSync(pdfPath)
    if (stats.size === 0) {
      console.error("PDF file is empty:", pdfPath)
      return
    }
    
    console.log(`PDF generated successfully: ${pdfPath} (${stats.size} bytes)`)

    // Calculate payment status for email
    const totalPaid = receipt.total_paid
    const balance = receipt.amount_due - totalPaid
    const paymentStatus = balance === 0 ? "Paid in Full" : "Pending Payment"

    // Email subject based on payment type
    const subject = isPartialPayment
      ? `Payment Update - Receipt ${receipt.receipt_id} - ETS NTECH`
      : `Payment Receipt ${receipt.receipt_id} - ETS NTECH`

    // Email body
    const emailBody = isPartialPayment
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Payment Update</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">ETS NTECH - Enterprise Network Technology</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="color: #2d3748; font-size: 16px; margin: 0 0 20px 0;">
              Hi <strong>${receipt.first_name}</strong>,
            </p>
            
            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              This is to confirm that a partial payment has been recorded for your receipt <strong>${receipt.receipt_id}</strong>.
            </p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Payment Summary:</strong>
              </p>
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                • Total Amount Due: <strong>${receipt.amount_due.toLocaleString()} XAF</strong><br>
                • Total Paid: <strong>${totalPaid.toLocaleString()} XAF</strong><br>
                • Outstanding Balance: <strong>${balance.toLocaleString()} XAF</strong><br>
                • Status: <strong>${paymentStatus}</strong>
              </p>
            </div>
            
            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 20px 0;">
              An updated receipt has been attached to this email. Please keep it for your records.
            </p>
            
            <p style="color: #4a5568; font-size: 14px; margin: 30px 0 0 0;">
              Best regards,<br>
              <strong>The ETS NTECH Team</strong>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              Enterprise Network Technology | Transforming Ideas into Reality
            </p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Payment Receipt</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">ETS NTECH - Enterprise Network Technology</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="color: #2d3748; font-size: 16px; margin: 0 0 20px 0;">
              Hi <strong>${receipt.first_name}</strong>,
            </p>
            
            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for your payment. This email confirms that we have received your payment for receipt <strong>${receipt.receipt_id}</strong>.
            </p>
            
            <div style="background: #f0fff4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #22543d; font-size: 14px; margin: 0 0 8px 0;">
                <strong>Payment Details:</strong>
              </p>
              <p style="color: #22543d; font-size: 14px; margin: 0;">
                • Receipt ID: <strong>${receipt.receipt_id}</strong><br>
                • Payment Type: <strong>${receipt.payment_type}</strong><br>
                • Amount Due: <strong>${receipt.amount_due.toLocaleString()} XAF</strong><br>
                • Amount Paid: <strong>${totalPaid.toLocaleString()} XAF</strong><br>
                • Balance: <strong>${balance.toLocaleString()} XAF</strong><br>
                • Status: <strong>${paymentStatus}</strong>
              </p>
            </div>
            
            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 20px 0;">
              Your receipt has been attached to this email. Please keep it for your records.
            </p>
            
            <p style="color: #4a5568; font-size: 14px; margin: 30px 0 0 0;">
              Best regards,<br>
              <strong>The ETS NTECH Team</strong>
            </p>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
              Enterprise Network Technology | Transforming Ideas into Reality
            </p>
          </div>
        </div>
      `

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: receipt.email,
      subject: subject,
      html: emailBody,
      attachments: [
        {
          filename: `receipt-${receipt.receipt_id}.pdf`,
          path: pdfPath,
        },
      ],
    }

    await transporter.sendMail(mailOptions)
    console.log(`Receipt email sent successfully to ${receipt.email} for receipt ${receipt.receipt_id}`)

    // Clean up temp file after sending (with delay to ensure email is sent)
    setTimeout(() => {
      try {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath)
        }
      } catch (err) {
        console.error("Error deleting temp PDF file:", err)
      }
    }, 10000) // 10 second delay
  } catch (error) {
    console.error("Error sending receipt email:", error.message)
    // Don't throw - allow receipt creation to succeed even if email fails
  }
}

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
                r.amount_paid, r.payment_date, r.status, r.amount_due,
                LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         LEFT JOIN payments p ON r.id = p.receipt_id
         WHERE r.status != 'Void'
         GROUP BY r.id
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
                          r.amount_paid, r.payment_date, r.status, r.amount_due,
                          LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
                   FROM receipts r
                   JOIN interns i ON r.intern_id = i.id
                   LEFT JOIN payments p ON r.id = p.receipt_id
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

      query += ` GROUP BY r.id ORDER BY r.payment_date DESC`

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

      // Send receipt email asynchronously (non-blocking)
      // This ensures receipt creation succeeds even if email fails
      sendReceiptEmail(receiptId_id, false).catch((emailError) => {
        console.error("Failed to send receipt email:", emailError.message)
        // Log to file or monitoring service for later retry
      })

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

      // Get paginated results with total_paid (capped at amount_due)
      const [receipts] = await connection.query(
        `SELECT r.id, r.receipt_id, i.first_name, i.last_name, i.email,
                r.payment_type, r.amount_paid, r.payment_date, r.status, r.amount_due,
                LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         LEFT JOIN payments p ON r.id = p.receipt_id
         ${whereClause}
         GROUP BY r.id
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
      // Get receipt with total paid from payments table + initial amount_paid (capped at amount_due)
      const [receipts] = await connection.query(
        `SELECT r.*, i.first_name, i.last_name, i.email, i.phone,
                LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         LEFT JOIN payments p ON r.id = p.receipt_id
         WHERE r.id = ? OR r.receipt_id = ?
         GROUP BY r.id`,
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
      // Get receipt with total paid from payments table + initial amount_paid (capped at amount_due)
      const [receipts] = await connection.query(
        `SELECT r.*, i.first_name, i.last_name, i.email, i.phone,
                LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) as total_paid
         FROM receipts r
         JOIN interns i ON r.intern_id = i.id
         LEFT JOIN payments p ON r.id = p.receipt_id
         WHERE r.id = ? OR r.receipt_id = ?
         GROUP BY r.id`,
        [receiptId, receiptId],
      )

      if (receipts.length === 0) {
        return res.status(404).json({ message: "Receipt not found" })
      }

      const receipt = receipts[0]
      
      // total_paid now includes initial amount_paid + partial payments, capped at amount_due
      const totalPaid = receipt.total_paid
      const balance = receipt.amount_due - totalPaid
      
      // Calculate payment status the same way as preview
      const paymentStatus = balance === 0 ? "Paid in Full" : balance > 0 ? "Pending Payment" : "Overpayment Error"
      const statusColor = paymentStatus === "Paid in Full" ? "#10b981" : paymentStatus === "Pending Payment" ? "#f59e0b" : "#ef4444"

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
      doc.fontSize(10).font("Helvetica").text("Enterprise Network Technology", 40, 65)
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
      doc.font("Helvetica").fillColor(statusColor).text(paymentStatus, 150, detailsY + 50).fillColor("#000000")

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

      doc.font("Helvetica-Bold").text("Received By:", 40, descY + 25)
      doc.font("Helvetica").text(receipt.received_by || "N/A", 150, descY + 25)

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
      doc.text(`${totalPaid.toLocaleString()} XAF`, 200, financeY + 70)
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

router.get("/payment-history/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params

    const connection = await pool.getConnection()
    try {
      const [payments] = await connection.query(
        `SELECT p.id, p.payment_amount, p.payment_method, p.payment_date, 
                p.recorded_at, u.email as recorded_by_email
         FROM payments p
         JOIN users u ON p.recorded_by = u.id
         JOIN receipts r ON p.receipt_id = r.id
         WHERE r.id = ? OR r.receipt_id = ?
         ORDER BY p.payment_date ASC`,
        [receiptId, receiptId],
      )

      res.json(payments)
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error fetching payment history:", error)
    res.status(500).json({ message: "Failed to fetch payment history" })
  }
})

router.post("/add-payment/:receiptId", async (req, res) => {
  try {
    const { receiptId } = req.params
    const { paymentAmount, paymentMethod, paymentDate, notes, userId } = req.body

    if (!paymentAmount || !paymentMethod || !paymentDate) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    if (paymentAmount <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than 0" })
    }

    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()

      // Get receipt details with total paid including initial amount_paid
      const [receipts] = await connection.query(
        `SELECT r.*, (COALESCE(SUM(p.payment_amount), 0) + r.amount_paid) as total_paid
         FROM receipts r
         LEFT JOIN payments p ON r.id = p.receipt_id
         WHERE r.id = ? OR r.receipt_id = ?
         GROUP BY r.id`,
        [receiptId, receiptId],
      )

      if (receipts.length === 0) {
        return res.status(404).json({ message: "Receipt not found" })
      }

      const receipt = receipts[0]
      const totalPaid = receipt.total_paid + paymentAmount
      const remainingBalance = receipt.amount_due - totalPaid

      // Validate overpayment
      if (remainingBalance < 0) {
        await connection.rollback()
        connection.release()
        return res.status(400).json({
          message: `Overpayment error. Remaining balance is ${Math.abs(remainingBalance).toLocaleString()} XAF. You can only pay up to ${(receipt.amount_due - receipt.total_paid).toLocaleString()} XAF.`,
        })
      }

      // Insert payment record
      await connection.query(
        `INSERT INTO payments (receipt_id, payment_amount, payment_method, payment_date, recorded_by, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [receipt.id, paymentAmount, paymentMethod, paymentDate, userId, notes || null],
      )

      // Update receipt payment status
      const newStatus = remainingBalance === 0 ? "Paid in Full" : "Pending Payment"
      await connection.query(
        `UPDATE receipts 
         SET payment_status = ?, initial_payment_recorded = TRUE
         WHERE id = ?`,
        [newStatus, receipt.id],
      )

      // Create audit log
      await connection.query(
        `INSERT INTO receipt_audit_logs (receipt_id, action, action_by, new_values)
         VALUES (?, 'PARTIAL_PAYMENT', ?, ?)`,
        [receipt.id, userId, JSON.stringify({ payment_amount: paymentAmount, new_status: newStatus })],
      )

      await connection.commit()

      // Send updated receipt email asynchronously (non-blocking)
      // This ensures payment recording succeeds even if email fails
      sendReceiptEmail(receipt.id, true).catch((emailError) => {
        console.error("Failed to send receipt email:", emailError.message)
        // Log to file or monitoring service for later retry
      })

      res.status(201).json({
        message: "Partial payment recorded successfully",
        newStatus,
        remainingBalance,
        totalPaid,
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error("Error recording partial payment:", error)
    res.status(500).json({ message: "Failed to record partial payment" })
  }
})

module.exports = router
