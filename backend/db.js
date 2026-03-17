require("dotenv").config()
const mysql = require("mysql2/promise")

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
  database: process.env.DB_NAME || "mantech_db",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || "10", 10),
  queueLimit: 0,
  charset: process.env.DB_CHARSET || "utf8mb4",
}

const pool = mysql.createPool(dbConfig)

module.exports = pool
module.exports.dbConfig = dbConfig
