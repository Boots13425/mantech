const path = require("path")
require("dotenv").config({ path: path.resolve(__dirname, ".env") })

const fs = require("fs")
const mysql = require("mysql2/promise")
const nodemailer = require("nodemailer")
const PDFDocument = require("pdfkit")

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10)
const smtpSecure =
  process.env.SMTP_SECURE !== undefined
    ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
    : smtpPort === 465

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.zoho.com",
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function ensureTempDir() {
  const tempDir = path.join(__dirname, "temp")
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  return tempDir
}

async function generateWelcomeReceiptPDF(intern) {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = ensureTempDir()
      const filePath = path.join(tempDir, `manual-welcome-receipt-${intern.id}-${Date.now()}.pdf`)

      const doc = new PDFDocument({ size: "A4", margin: 40 })
      const stream = fs.createWriteStream(filePath)

      stream.on("finish", () => resolve(filePath))
      stream.on("error", reject)

      doc.pipe(stream)

      doc.fontSize(18).font("Helvetica-Bold").text("ETS NTECH", 40, 40)
      doc.fontSize(10).font("Helvetica").text("Enterprise Network Technology", 40, 62)

      doc.moveTo(40, 90).lineTo(555, 90).stroke()

      doc.fontSize(20).font("Helvetica-Bold").text("INTERNSHIP REGISTRATION RECEIPT", 40, 110)

      let y = 160
      const gap = 24

      doc.fontSize(11).font("Helvetica-Bold").text("Registration ID:", 40, y)
      doc.font("Helvetica").text(intern.registration_id || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Full Name:", 40, y)
      doc.font("Helvetica").text(`${intern.first_name || ""} ${intern.last_name || ""}`.trim(), 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Email:", 40, y)
      doc.font("Helvetica").text(intern.email || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Phone:", 40, y)
      doc.font("Helvetica").text(intern.phone || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("School:", 40, y)
      doc.font("Helvetica").text(intern.school || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Degree:", 40, y)
      doc.font("Helvetica").text(intern.degree || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Year of Study:", 40, y)
      doc.font("Helvetica").text(intern.year_of_study || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Department:", 40, y)
      doc.font("Helvetica").text(intern.department || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Start Date:", 40, y)
      doc.font("Helvetica").text(formatDate(intern.start_date), 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("End Date:", 40, y)
      doc.font("Helvetica").text(formatDate(intern.end_date), 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Registration Date:", 40, y)
      doc.font("Helvetica").text(formatDateTime(intern.registration_date), 180, y)

      doc.moveTo(40, y + 40).lineTo(555, y + 40).stroke()

      doc.fontSize(10)
        .font("Helvetica")
        .fillColor("#444")
        .text(
          "This document confirms that the above-named candidate has been successfully registered for internship at ETS NTECH.",
          40,
          y + 60,
          { width: 500, align: "left" }
        )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

async function generateReceiptPDF(receipt) {
  return new Promise((resolve, reject) => {
    try {
      const tempDir = ensureTempDir()
      const filePath = path.join(tempDir, `manual-payment-receipt-${receipt.id}-${Date.now()}.pdf`)

      const doc = new PDFDocument({ size: "A4", margin: 40 })
      const stream = fs.createWriteStream(filePath)

      stream.on("finish", () => resolve(filePath))
      stream.on("error", reject)

      doc.pipe(stream)

      doc.fontSize(18).font("Helvetica-Bold").text("ETS NTECH", 40, 40)
      doc.fontSize(10).font("Helvetica").text("Enterprise Network Technology", 40, 62)

      doc.moveTo(40, 90).lineTo(555, 90).stroke()

      doc.fontSize(20).font("Helvetica-Bold").text("PAYMENT RECEIPT", 40, 110)

      let y = 160
      const gap = 24

      doc.fontSize(11).font("Helvetica-Bold").text("Receipt ID:", 40, y)
      doc.font("Helvetica").text(receipt.receipt_id || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Intern Name:", 40, y)
      doc.font("Helvetica").text(`${receipt.first_name || ""} ${receipt.last_name || ""}`.trim(), 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Email:", 40, y)
      doc.font("Helvetica").text(receipt.email || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Phone:", 40, y)
      doc.font("Helvetica").text(receipt.phone || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Payment Date:", 40, y)
      doc.font("Helvetica").text(formatDate(receipt.payment_date), 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Payment Type:", 40, y)
      doc.font("Helvetica").text(receipt.payment_type || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Amount Due:", 40, y)
      doc.font("Helvetica").text(`${Number(receipt.amount_due || 0).toLocaleString()} XAF`, 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Amount Paid:", 40, y)
      doc.font("Helvetica").text(`${Number(receipt.total_paid || receipt.amount_paid || 0).toLocaleString()} XAF`, 180, y)

      const balance = Number(receipt.amount_due || 0) - Number(receipt.total_paid || receipt.amount_paid || 0)

      y += gap
      doc.font("Helvetica-Bold").text("Balance:", 40, y)
      doc.font("Helvetica").text(`${balance.toLocaleString()} XAF`, 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Payment Method:", 40, y)
      doc.font("Helvetica").text(receipt.payment_method || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Received By:", 40, y)
      doc.font("Helvetica").text(receipt.received_by || "N/A", 180, y)

      y += gap
      doc.font("Helvetica-Bold").text("Notes:", 40, y)
      doc.font("Helvetica").text(receipt.notes || "N/A", 180, y, { width: 320 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

function formatDate(value) {
  if (!value) return "N/A"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "N/A"
  return d.toLocaleDateString("en-GB")
}

function formatDateTime(value) {
  if (!value) return "N/A"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "N/A"
  return d.toLocaleString("en-GB")
}

async function sendWelcomeEmailByInternId(internId) {
  const connection = await pool.getConnection()
  let pdfPath = null

  try {
    const [rows] = await connection.query(
      `SELECT id, registration_id, first_name, last_name, email, phone, school, degree,
              year_of_study, department, start_date, end_date, registration_date
       FROM interns
       WHERE id = ?`,
      [internId]
    )

    if (rows.length === 0) {
      throw new Error(`No intern found with id ${internId}`)
    }

    const intern = rows[0]

    if (!intern.email) {
      throw new Error(`Intern ${internId} has no email address`)
    }

    pdfPath = await generateWelcomeReceiptPDF(intern)

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: intern.email,
      subject: `Welcome to ETS NTECH - Internship Confirmation, ${intern.first_name}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to ETS NTECH</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Enterprise Network Technology</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="color: #2d3748; font-size: 16px;">Hi <strong>${intern.first_name}</strong>,</p>

            <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
              We are delighted to confirm your internship registration with Enterprise Network Technology (ETS NTECH).
            </p>

            <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #22543d; font-size: 14px; margin: 0;">
                <strong>Attached to this email is your internship receipt.</strong>
                Your Registration ID is <strong>${intern.registration_id}</strong>.
              </p>
            </div>

            <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
              Please keep the attached document for your records.
            </p>

            <p style="color: #4a5568; font-size: 14px;">
              Best regards,<br>
              <strong>The ETS NTECH Team</strong>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `ETS-NTECH-Registration-Receipt-${intern.registration_id}.pdf`,
          path: pdfPath,
        },
      ],
    })

    console.log(`Welcome email sent successfully to ${intern.email}`)
  } finally {
    connection.release()
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath)
    }
  }
}

async function sendReceiptEmailByReceiptId(receiptIdInput) {
  const connection = await pool.getConnection()
  let pdfPath = null

  try {
    const [rows] = await connection.query(
      `SELECT r.*, i.first_name, i.last_name, i.email, i.phone,
              LEAST((COALESCE(SUM(p.payment_amount), 0) + r.amount_paid), r.amount_due) AS total_paid
       FROM receipts r
       JOIN interns i ON r.intern_id = i.id
       LEFT JOIN payments p ON r.id = p.receipt_id
       WHERE r.id = ? OR r.receipt_id = ?
       GROUP BY r.id`,
      [receiptIdInput, receiptIdInput]
    )

    if (rows.length === 0) {
      throw new Error(`No receipt found with id/reference ${receiptIdInput}`)
    }

    const receipt = rows[0]

    if (!receipt.email) {
      throw new Error(`Receipt ${receipt.receipt_id} has no intern email address`)
    }

    const balance = Number(receipt.amount_due || 0) - Number(receipt.total_paid || 0)
    const paymentStatus = balance === 0 ? "Paid in Full" : "Pending Payment"

    pdfPath = await generateReceiptPDF(receipt)

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: receipt.email,
      subject: `Payment Receipt ${receipt.receipt_id} - ETS NTECH`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Payment Receipt</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">ETS NTECH - Enterprise Network Technology</p>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="color: #2d3748; font-size: 16px;">Hi <strong>${receipt.first_name}</strong>,</p>

            <p style="color: #4a5568; font-size: 14px; line-height: 1.6;">
              Thank you for your payment. This email confirms receipt <strong>${receipt.receipt_id}</strong>.
            </p>

            <div style="background: #f0fff4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #22543d; font-size: 14px; margin: 0;">
                Amount Due: <strong>${Number(receipt.amount_due || 0).toLocaleString()} XAF</strong><br>
                Amount Paid: <strong>${Number(receipt.total_paid || 0).toLocaleString()} XAF</strong><br>
                Balance: <strong>${balance.toLocaleString()} XAF</strong><br>
                Status: <strong>${paymentStatus}</strong>
              </p>
            </div>

            <p style="color: #4a5568; font-size: 14px;">
              The receipt is attached to this email.
            </p>

            <p style="color: #4a5568; font-size: 14px;">
              Best regards,<br>
              <strong>The ETS NTECH Team</strong>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `receipt-${receipt.receipt_id}.pdf`,
          path: pdfPath,
        },
      ],
    })

    console.log(`Receipt email sent successfully to ${receipt.email} for ${receipt.receipt_id}`)
  } finally {
    connection.release()
    if (pdfPath && fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath)
    }
  }
}

async function main() {
  const mode = process.argv[2]
  const value = process.argv[3]

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER or SMTP_PASS is missing in backend/.env")
  }

  if (!process.env.DB_NAME) {
    throw new Error("DB_NAME is missing in backend/.env")
  }

  await transporter.verify()
  console.log("SMTP connection verified successfully.")

  if (mode === "welcome") {
    if (!value) throw new Error("Usage: node manual-send-email.js welcome <internId>")
    await sendWelcomeEmailByInternId(value)
  } else if (mode === "receipt") {
    if (!value) throw new Error("Usage: node manual-send-email.js receipt <receiptId or receipt_code>")
    await sendReceiptEmailByReceiptId(value)
  } else {
    throw new Error(
      "Invalid mode. Use one of:\n" +
      "  node manual-send-email.js welcome <internId>\n" +
      "  node manual-send-email.js receipt <receiptId or receipt_code>"
    )
  }

  await pool.end()
}

main()
  .then(() => {
    console.log("Done.")
    process.exit(0)
  })
  .catch(async (error) => {
    console.error("Manual email send failed:", error.message)
    try {
      await pool.end()
    } catch (_) {}
    process.exit(1)
  })