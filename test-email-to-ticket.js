#!/usr/bin/env node

/**
 * Test script for Email-to-Ticket functionality
 * Simulates SendGrid Inbound Parse webhook
 */

const http = require('http');

const API_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }

    req.end();
  });
}

async function testEmailWebhook() {
  console.log('\n🧪 Email-to-Ticket Integration Test\n');
  console.log('=' + '='.repeat(50) + '\n');

  let createdTicketId = null;

  // Test 1: Webhook health check
  console.log('📡 Test 1: Webhook Health Check...');
  try {
    const res = await makeRequest(`${API_URL}/webhooks/email/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { test: 'data' }
    });

    if (res.status === 200 || res.status === 201) {
      console.log('✅ Webhook endpoint is accessible');
      console.log(`   Response: ${res.data.message}\n`);
    } else {
      console.log(`❌ Webhook test failed with status ${res.status}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 2: Create new ticket from email
  console.log('📧 Test 2: Create New Ticket from Email...');
  try {
    const emailData = {
      to: 'support@demo.yourcompany.com',
      from: 'customer@example.com <Customer Name>',
      subject: 'Help with password reset',
      text: 'I am having trouble resetting my password. Can you please help?\n\nThanks,\nCustomer',
      html: '<p>I am having trouble resetting my password. Can you please help?</p><p>Thanks,<br>Customer</p>',
      headers: 'Received: by mail.example.com',
      envelope: '{"to":["support@demo.yourcompany.com"],"from":"customer@example.com"}',
      charsets: '{"to":"UTF-8","from":"UTF-8","subject":"UTF-8"}',
      SPF: 'pass'
    };

    const res = await makeRequest(`${API_URL}/webhooks/email/sendgrid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: emailData
    });

    if (res.status === 200 || res.status === 201) {
      console.log('✅ New ticket created from email');
      console.log(`   Ticket ID: ${res.data.ticketId}`);
      console.log(`   Message: ${res.data.message}\n`);
      createdTicketId = res.data.ticketId;
    } else {
      console.log(`❌ Failed with status ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.data, null, 2)}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 3: Reply to existing ticket (if we got a ticket ID)
  if (createdTicketId) {
    console.log('💬 Test 3: Reply to Existing Ticket via Email...');

    // Extract short ID (first 8 chars)
    const shortId = createdTicketId.substring(0, 8);

    try {
      const replyData = {
        to: 'support@demo.yourcompany.com',
        from: 'customer@example.com <Customer Name>',
        subject: `Re: Help with password reset [#${shortId}]`,
        text: 'I tried the steps you suggested but still having issues.\n\n> On previous message:\n> I am having trouble resetting my password.',
        html: '<p>I tried the steps you suggested but still having issues.</p>',
        headers: 'In-Reply-To: <original-message-id@example.com>',
        envelope: '{"to":["support@demo.yourcompany.com"],"from":"customer@example.com"}',
        charsets: '{"to":"UTF-8","from":"UTF-8","subject":"UTF-8"}',
        SPF: 'pass'
      };

      const res = await makeRequest(`${API_URL}/webhooks/email/sendgrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: replyData
      });

      if (res.status === 200 || res.status === 201) {
        console.log('✅ Comment added to existing ticket');
        console.log(`   Ticket ID: ${res.data.ticketId}`);
        console.log(`   Message: ${res.data.message}\n`);
      } else {
        console.log(`❌ Failed with status ${res.status}`);
        console.log(`   Response: ${JSON.stringify(res.data, null, 2)}\n`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  } else {
    console.log('⚠️  Test 3: Skipped (no ticket ID from Test 2)\n');
  }

  // Test 4: Email with quoted text (should be cleaned)
  console.log('🧹 Test 4: Email with Quoted Text (Body Cleaning)...');
  try {
    const emailWithQuotes = {
      to: 'support@demo.yourcompany.com',
      from: 'another@example.com <Another User>',
      subject: 'Question about billing',
      text: `I have a question about my recent invoice.

--
This is my signature
Another User
CEO, Example Corp

On Wed, Oct 25, 2025 at 1:00 PM Support <support@demo.com> wrote:
> Thanks for contacting us!
> How can we help?`,
      html: '<p>I have a question about my recent invoice.</p>',
      headers: 'Received: by mail.example.com',
      envelope: '{"to":["support@demo.yourcompany.com"],"from":"another@example.com"}',
      charsets: '{"to":"UTF-8","from":"UTF-8","subject":"UTF-8"}',
      SPF: 'pass'
    };

    const res = await makeRequest(`${API_URL}/webhooks/email/sendgrid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: emailWithQuotes
    });

    if (res.status === 200 || res.status === 201) {
      console.log('✅ Email processed with body cleaning');
      console.log(`   Ticket ID: ${res.data.ticketId}`);
      console.log(`   Message: ${res.data.message}`);
      console.log('   Note: Check that quoted text and signature were removed\n');
    } else {
      console.log(`❌ Failed with status ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.data, null, 2)}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  // Test 5: Email to unknown tenant (should use default)
  console.log('🏢 Test 5: Email to Unknown Subdomain (Fallback)...');
  try {
    const emailData = {
      to: 'support@unknown-tenant.yourcompany.com',
      from: 'test@example.com <Test User>',
      subject: 'Test ticket for unknown tenant',
      text: 'This should create a ticket in the default/first active tenant.',
      html: '<p>This should create a ticket in the default/first active tenant.</p>',
      headers: 'Received: by mail.example.com',
      envelope: '{"to":["support@unknown-tenant.yourcompany.com"],"from":"test@example.com"}',
      charsets: '{"to":"UTF-8","from":"UTF-8","subject":"UTF-8"}',
      SPF: 'pass'
    };

    const res = await makeRequest(`${API_URL}/webhooks/email/sendgrid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: emailData
    });

    if (res.status === 200 || res.status === 201) {
      console.log('✅ Ticket created with fallback tenant logic');
      console.log(`   Ticket ID: ${res.data.ticketId}`);
      console.log(`   Message: ${res.data.message}\n`);
    } else if (res.status === 200 && res.data.success === false) {
      console.log('✅ Correctly handled unknown tenant');
      console.log(`   Message: ${res.data.message}\n`);
    } else {
      console.log(`❌ Failed with status ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.data, null, 2)}\n`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
  }

  console.log('=' + '='.repeat(50));
  console.log('\n✨ Email-to-Ticket tests completed!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Check the database to verify tickets were created');
  console.log('   2. Verify email body cleaning removed quoted text');
  console.log('   3. Check that comments were added to the correct ticket');
  console.log('   4. Set up SendGrid Inbound Parse with webhook URL');
  console.log('\n   Webhook URL: http://localhost:3000/webhooks/email/sendgrid\n');
}

// Run tests
testEmailWebhook().catch(error => {
  console.error('\n💥 Fatal error running tests:', error);
  process.exit(1);
});
