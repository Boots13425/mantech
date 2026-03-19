require("dotenv").config()
const pool = require("../db")

async function runMigration() {
  let connection

  try {
    connection = await pool.getConnection()
    console.log("Starting suggestions table migration...")

    await connection.query(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id INT NOT NULL AUTO_INCREMENT,
        suggestion_text TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_suggestions_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)

    console.log("Suggestions table is ready.")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exitCode = 1
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

runMigration()