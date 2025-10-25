const { Client } = require('pg');

async function cleanupTestData() {
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

    // Start transaction
    await client.query('BEGIN');

    // 1. Delete all comments (cascades or direct delete)
    const commentsResult = await client.query('DELETE FROM comments');
    console.log(`Deleted ${commentsResult.rowCount} comment(s)`);

    // 2. Delete all attachments
    const attachmentsResult = await client.query('DELETE FROM attachments');
    console.log(`Deleted ${attachmentsResult.rowCount} attachment(s)`);

    // 3. Delete all tickets
    const ticketsResult = await client.query('DELETE FROM tickets');
    console.log(`Deleted ${ticketsResult.rowCount} ticket(s)`);

    // 4. Delete all users EXCEPT admin@demo.com
    const usersResult = await client.query(
      "DELETE FROM users WHERE email != 'admin@demo.com'"
    );
    console.log(`Deleted ${usersResult.rowCount} user(s)`);

    // 5. Delete all customer organizations
    const customersResult = await client.query('DELETE FROM customers');
    console.log(`Deleted ${customersResult.rowCount} customer organization(s)`);

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Test data cleanup completed successfully!');
    console.log('\nRemaining data:');
    console.log('- admin@demo.com user (for admin access)');
    console.log('- Demo Tenant tenant');
    console.log('\nYou can now start fresh with clean data.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error);
    console.error('Transaction rolled back.');
  } finally {
    await client.end();
  }
}

cleanupTestData();
