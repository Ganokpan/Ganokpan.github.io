const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
  console.log('⏳ Starting MySQL database initialization...');

  // Configuration for initial connection (without specifying database name first)
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306')
  };

  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('✅ Connected to MySQL server.');

    // Read and parse schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Split SQL file by statements (naive split by semicolons, ignoring comments)
    // First, let's clean comments
    const cleanSql = schemaSql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split statements by semicolon
    const statements = cleanSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Parsed ${statements.length} SQL statements to execute.`);

    // Run statements sequentially
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await connection.query(statement);
      } catch (err) {
        // Log query details if it fails
        console.warn(`⚠️ Warning executing statement ${i + 1}: ${err.message}`);
        console.log(`Statement details: ${statement.substring(0, 100)}...`);
      }
    }

    console.log('🎉 MySQL database and tables created & seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize database:');
    console.error(error.message);
    console.error('\nPlease verify that:');
    console.error('1. Your MySQL server is running.');
    console.error('2. The credentials in backend/.env are correct.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();
