// Intern Registration Routes
const express = require("express")
const router = express.Router()
const nodemailer = require("nodemailer")
const PDFDocument = require("pdfkit")
const fs = require("fs")
const path = require("path")
const mysql = require('mysql2/promise')
require('dotenv').config()

// Create a MySQL pool for this router (keeps router standalone)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mantech_db',
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

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone format
function isValidPhone(phone) {
  const phoneRegex = /^\d{9,}$/
  return phoneRegex.test(phone.replace(/\D/g, ""))
}

// Validate date range
function isValidDateRange(startDate, endDate) {
  return new Date(startDate) < new Date(endDate)
}

// Register Intern Endpoint
router.post("/register-intern", async (req, res) => {
  try {
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
    } = req.body

    // Validate required fields
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

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format.",
      })
    }

    // Validate phone format
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        message: "Invalid phone number format.",
      })
    }

    // Validate date range
    if (!isValidDateRange(startDate, endDate)) {
      return res.status(400).json({
        message: "End date must be after start date.",
      })
    }

    // Use a connection from the pool to query/insert into MySQL
    const connection = await pool.getConnection()
    let internData

    try {
      // Check if intern already registered with this email
      const [existingRows] = await connection.query('SELECT id FROM interns WHERE email = ?', [email])

      if (existingRows.length > 0) {
        connection.release()
        return res.status(400).json({
          message: 'An intern with this email is already registered.',
        })
      }

      // Insert intern into database
      const insertQuery = `INSERT INTO interns 
        (first_name, last_name, email, phone, school, degree, year_of_study, gpa, 
         department, start_date, end_date, mentor, skills, notes, registration_date, status)
        VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')`

      const [insertResult] = await connection.query(insertQuery, [
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
      ])

      const insertedId = insertResult.insertId

      // Retrieve the newly inserted intern row
      const [rows] = await connection.query(
        'SELECT id, first_name, last_name, email, registration_date FROM interns WHERE id = ?',
        [insertedId],
      )

      internData = rows[0]
    } catch (dbError) {
      try {
        connection.release()
      } catch (releaseError) {
        console.error('Connection release error:', releaseError)
      }

      // Handle duplicate email entry gracefully (race condition)
      if (dbError.code === 'ER_DUP_ENTRY' && dbError.sqlMessage && dbError.sqlMessage.includes('email')) {
        return res.status(400).json({
          message: 'An intern with this email is already registered.',
        })
      }

      // Re-throw other database errors
      throw dbError
    } finally {
      try {
        connection.release()
      } catch (e) {
        console.error('Connection release error:', e)
      }
    }

    // Generate receipt PDF
    const receiptPDF = await generateReceiptPDF({
      id: internData.id,
      firstName: internData.first_name,
      lastName: internData.last_name,
      email: internData.email,
      registrationDate: internData.registration_date,
      department,
      startDate,
      endDate,
    })

    // Send welcome email with receipt attachment
    await sendWelcomeEmail(email, firstName, lastName, receiptPDF)

    res.status(201).json({
      message: "Intern registered successfully. Receipt sent to email.",
      internId: internData.id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      message: "An error occurred during registration. Please try again.",
    })
  }
})

// Generate Receipt PDF
async function generateReceiptPDF(internData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      })

      // Generate unique filename
      const fileName = `receipt-${internData.id}-${Date.now()}.pdf`
      const filePath = path.join(__dirname, "../temp", fileName)

      // Create temp directory if it doesn't exist
      const tempDir = path.dirname(filePath)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      const stream = fs.createWriteStream(filePath)

      // Build PDF content
      // Header
      doc.fontSize(16).font("Helvetica-Bold").text("ETS NTECH", 40, 40)
      doc.fontSize(10).font("Helvetica").text("Enterprise Technology Solutions", 40, 60)

      // Receipt Title
      doc.moveTo(40, 90).lineTo(555, 90).stroke()
      doc.fontSize(20).font("Helvetica-Bold").text("INTERNSHIP RECEIPT", 40, 110)

      // Receipt details box
      const detailsY = 160
      doc.fontSize(9).font("Helvetica-Bold").text("Receipt #:", 40, detailsY)
      doc.font("Helvetica").text(`INT-${internData.id.toString().padStart(6, "0")}`, 120, detailsY)

      doc.font("Helvetica-Bold").text("Date:", 40, detailsY + 20)
      doc.font("Helvetica").text(new Date(internData.registrationDate).toLocaleDateString(), 120, detailsY + 20)

      // Intern Information Section
      const infoY = 240
      doc.fontSize(11).font("Helvetica-Bold").text("INTERN INFORMATION", 40, infoY)
      doc
        .moveTo(40, infoY + 20)
        .lineTo(555, infoY + 20)
        .stroke("lightgrey")

      doc.fontSize(10)
      const fieldY = infoY + 40
      const fieldSpacing = 25

      doc.font("Helvetica-Bold").text("Full Name:", 40, fieldY)
      doc.font("Helvetica").text(`${internData.firstName} ${internData.lastName}`, 150, fieldY)

      doc.font("Helvetica-Bold").text("Email:", 40, fieldY + fieldSpacing)
      doc.font("Helvetica").text(internData.email, 150, fieldY + fieldSpacing)

      // Internship Details
      const internshipY = fieldY + fieldSpacing * 3
      doc.fontSize(11).font("Helvetica-Bold").text("INTERNSHIP DETAILS", 40, internshipY)
      doc
        .moveTo(40, internshipY + 20)
        .lineTo(555, internshipY + 20)
        .stroke("lightgrey")

      doc.fontSize(10)
      const internFieldY = internshipY + 40

      doc.font("Helvetica-Bold").text("Department:", 40, internFieldY)
      doc.font("Helvetica").text(internData.department, 150, internFieldY)

      doc.font("Helvetica-Bold").text("Start Date:", 40, internFieldY + fieldSpacing)
      doc.font("Helvetica").text(new Date(internData.startDate).toLocaleDateString(), 150, internFieldY + fieldSpacing)

      doc.font("Helvetica-Bold").text("End Date:", 40, internFieldY + fieldSpacing * 2)
      doc
        .font("Helvetica")
        .text(new Date(internData.endDate).toLocaleDateString(), 150, internFieldY + fieldSpacing * 2)

      // Welcome message
      const messageY = internFieldY + fieldSpacing * 4
      doc.fontSize(11).font("Helvetica-Bold").text("WELCOME TO ETS NTECH", 40, messageY)
      doc
        .moveTo(40, messageY + 20)
        .lineTo(555, messageY + 20)
        .stroke("lightgrey")

      doc
        .fontSize(9)
        .font("Helvetica")
        .text(
          "Welcome to Enterprise Network Technology! We are excited to have you join our team as an intern. This receipt confirms your registration and marks the beginning of your internship journey with us.\n\nYou will have access to world-class mentoring, hands-on experience, and exposure to real-world technology challenges. We look forward to your contributions and growth during this period.\n\nIf you have any questions or need assistance, please do not hesitate to reach out to your assigned mentor or the HR department.",
          40,
          messageY + 35,
          { width: 515, align: "left" },
        )

      // Footer
      const footerY = 750
      doc.moveTo(40, footerY).lineTo(555, footerY).stroke("lightgrey")
      doc
        .fontSize(8)
        .font("Helvetica")
        .text("ETS NTECH | Enterprise Network Technology", 40, footerY + 20, { align: "center" })
      doc.text("This receipt is a formal acknowledgment of your internship registration.", 40, footerY + 35, {
        align: "center",
      })

      doc.pipe(stream)
      doc.end()

      stream.on("finish", () => {
        resolve(filePath)
      })

      stream.on("error", (err) => {
        reject(err)
      })
    } catch (error) {
      reject(error)
    }
  })
}

// Send Welcome Email with Receipt
async function sendWelcomeEmail(email, firstName, lastName, receiptPath) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Welcome to ETS NTECH - Internship Confirmation, ${firstName}!`,
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">Welcome to ETS NTECH</h1>
                    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Enterprise Network Technology </p>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
                    <p style="color: #2d3748; font-size: 16px; margin: 0 0 20px 0;">
                        Hi <strong>${firstName}</strong>,
                    </p>
                    
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                        We are delighted to confirm your internship registration with Enterprise Network Technology (ETS NTECH). This is the beginning of an exciting journey where you'll gain practical experience, work with innovative technologies, and contribute to real-world projects.
                    </p>
                    
                    <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="color: #22543d; font-size: 14px; margin: 0;">
                            <strong>Attached to this email is your internship receipt.</strong> Please keep it for your records. Your registration ID is: <strong>INT-${email.split("@")[0]}</strong>
                        </p>
                    </div>
                    
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                        <strong>What's Next?</strong><br>
                        • Your mentor will reach out to you shortly with orientation details<br>
                        • Please review our policies at etcntech.org<br>
                        • Mark your calendar for your first day<br>
                        • Come prepared with enthusiasm and your laptop
                    </p>
                    
                    <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                        If you have any questions before your start date, please feel free to contact our HR team or reply to this email.
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
        `,
    attachments: [
      {
        filename: `ETS-NTECH-Receipt-${Date.now()}.pdf`,
        path: receiptPath,
      },
    ],
  }

  try {
    await transporter.sendMail(mailOptions)

    // Clean up temp file after sending
    setTimeout(() => {
      try {
        fs.unlinkSync(receiptPath)
      } catch (err) {
        console.error("Error deleting temp file:", err)
      }
    }, 5000)
  } catch (error) {
    console.error("Email send error:", error)
    throw new Error("Failed to send email")
  }
}

module.exports = router
