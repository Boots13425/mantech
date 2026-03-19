const express = require("express")
const router = express.Router()
const pool = require("../db")

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" })
  }
  next()
}

router.post("/", async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const rawSuggestion = typeof req.body?.suggestion === "string" ? req.body.suggestion : ""
    const suggestion = rawSuggestion.trim()

    if (!suggestion) {
      return res.status(400).json({
        success: false,
        message: "Please enter a suggestion before submitting.",
      })
    }

    if (suggestion.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Suggestion is too short. Please provide a little more detail.",
      })
    }

    if (suggestion.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Suggestion is too long. Please keep it under 2000 characters.",
      })
    }

    await connection.query(
      `INSERT INTO suggestions (suggestion_text) VALUES (?)`,
      [suggestion]
    )

    res.json({
      success: true,
      message: "Thank you. Your suggestion has been submitted successfully.",
    })
  } catch (error) {
    console.error("Suggestion submission error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to submit suggestion.",
    })
  } finally {
    connection.release()
  }
})

router.get("/admin", requireAdmin, async (req, res) => {
  const connection = await pool.getConnection()

  try {
    const [rows] = await connection.query(
      `SELECT id, suggestion_text, created_at
       FROM suggestions
       ORDER BY created_at DESC, id DESC`
    )

    res.json({
      success: true,
      count: rows.length,
      suggestions: rows,
    })
  } catch (error) {
    console.error("Admin suggestions fetch error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to load suggestions.",
    })
  } finally {
    connection.release()
  }
})

module.exports = router