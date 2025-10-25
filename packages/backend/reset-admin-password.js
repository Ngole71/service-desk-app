const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function resetPassword() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'service_desk',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Hash the password
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Password hashed');

    // Update admin user
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, 'admin@demo.com']
    );

    console.log(`Updated ${result.rowCount} user(s)`);
    console.log('Admin password reset to: password123');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

resetPassword();
