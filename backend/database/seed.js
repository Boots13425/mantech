const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mantech_db'
});

async function seedDatabase() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🌱 Starting database seeding...\n');
        
        // Hash the default password
        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        // Insert default admin user
        await connection.query(
            'INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)',
            ['admin@ets-ntech.org', hashedPassword, 'Admin User']
        );
        console.log('✅ Default admin user created');
        console.log('   Email: admin@ets-ntech.org');
        console.log('   Password: Admin@123\n');
        
        // Insert sample interns
        const interns = [
            ['tester', 'test', 'tester@gmail.com', '+237612345678', '2005-03-15']
        ];
        
        for (const intern of interns) {
            await connection.query(
                'INSERT INTO interns (first_name, last_name, email, phone, date_of_birth, registration_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [...intern, new Date().toISOString().split('T')[0], 'active']
            );
        }
        console.log('✅ Sample interns created\n');
        
        console.log('🎉 Database seeding completed successfully!');
        
    } catch (error) {
        console.error('❌ Seeding error:', error.message);
    } finally {
        await connection.release();
        await pool.end();
    }
}

seedDatabase();