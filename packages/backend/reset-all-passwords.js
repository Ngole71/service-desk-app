const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetPasswords() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'service_desk'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Password hashed');

    // Update all users
    const result = await client.query(
      'UPDATE users SET password = $1',
      [hashedPassword]
    );

    console.log(`Updated ${result.rowCount} user(s)`);
    console.log(`All passwords reset to: ${newPassword}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

resetPasswords();
