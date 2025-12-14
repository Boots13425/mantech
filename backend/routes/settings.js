const express = require('express')
const path = require('path')
const router = express.Router()

// Serve settings page (mounted at /settings)
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/settings.html'))
})

// Placeholder API endpoints for settings can be added here
// e.g., GET /settings/info, POST /settings/platform, etc.

module.exports = router
