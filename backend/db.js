const mysql = require("mysql2")

const pool = mysql.createPool({
	// Use env vars when available; fall back to sensible defaults
	host: process.env.DB_HOST || "localhost",
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASS || "",
	database: process.env.DB_NAME || "mantech_db",
	waitForConnections: true,
	connectionLimit: parseInt(process.env.DB_CONN_LIMIT, 10) || 10,
	queueLimit: 0,
})

module.exports = pool
