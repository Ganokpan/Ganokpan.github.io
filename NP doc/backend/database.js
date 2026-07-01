const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'np_data_list',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database connected successfully.');
    connection.release();
  } catch (error) {
    console.error('❌ Failed to connect to MySQL Database.');
    console.error(`Please verify your MySQL configuration in backend/.env`);
    console.error(`Error details: ${error.message}`);
    console.error('Ensure that you have created the database using backend/schema.sql');
  }
})();

module.exports = {
  pool,
  query: async (sql, params) => {
    const [results] = await pool.execute(sql, params);
    return results;
  }
};
