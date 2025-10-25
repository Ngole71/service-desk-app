# Email-to-Ticket Simulator Guide

## Overview

The Email Simulator is a built-in testing tool in the Customer Portal that lets you test the entire email-to-ticket flow **without needing SendGrid or a custom domain**.

## Quick Start

1. **Open Customer Portal**: http://localhost:3004
2. **Login** with test credentials:
   - Email: `testcustomer@demo.com`
   - Password: `password123`
3. **Click the "📧 Email Test" tab** in the navigation

## How It Works

The Email Simulator sends data directly to your backend's email webhook endpoint (`/webhooks/email/sendgrid`) in the exact same format that SendGrid would send it. This lets you:

- ✅ Test ticket creation from emails
- ✅ Test email replies to existing tickets
- ✅ Test email body cleaning (removes quotes/signatures)
- ✅ Test tenant routing
- ✅ See real-time ticket updates in Admin Portal

**No SendGrid or ngrok required!**

## Testing Scenarios

### 1. Create New Ticket from Email

1. Click **"📧 New Ticket"** button to load sample
2. Customize the subject and body if desired
3. Click **"Send Email"**
4. ✅ You'll get a success message with the new ticket ID
5. Switch to **Admin Portal** (http://localhost:3001) to see the ticket appear

### 2. Reply to Existing Ticket

1. First, create a ticket using scenario #1 above
2. Copy the **short ID** from the success message (e.g., `[669a2c1f]`)
3. Click **"💬 Reply to Ticket"** button
4. Update the subject to include your ticket ID: `[#669a2c1f] Re: Help with password reset`
5. Click **"Send Email"**
6. ✅ Comment will be added to the existing ticket
7. Check Admin Portal to see the new comment

### 3. Test Email Body Cleaning

1. Click **"🧹 Email with Quotes"** button
2. Notice the body contains:
   - Signature (after `--`)
   - Quoted reply text (starts with `>`)
   - Previous conversation ("On X wrote:")
3. Click **"Send Email"**
4. ✅ Go to Admin Portal and view the ticket
5. Verify that quoted text and signature were removed from the description

### 4. Test Tenant Routing

1. Change the **To (Support Email)** field:
   - `support@demo.yourcompany.com` → demo tenant
   - `support@acme.yourcompany.com` → acme tenant
   - `support@yourcompany.com` → first active tenant (fallback)
2. Send the email
3. ✅ Ticket will be created in the appropriate tenant

## Form Fields

| Field | Description | Example |
|-------|-------------|---------|
| **From Name** | Customer's display name | John Doe |
| **From Email** | Customer's email address | customer@example.com |
| **To** | Support email (determines tenant) | support@demo.yourcompany.com |
| **Subject** | Email subject (include `[#ID]` for replies) | Help with password reset |
| **Body** | Email content (will be cleaned) | Full email message text |

## Real-Time Testing Flow

### Setup (One-Time)

1. **Terminal 1**: Backend running on port 3000
2. **Terminal 2**: Admin Portal on port 3001
3. **Terminal 3**: Customer Portal on port 3004

### Test Flow

1. **Customer Portal** → Click "📧 Email Test" tab
2. **Fill out form** → Use sample emails or custom content
3. **Click "Send Email"** → Simulates SendGrid webhook
4. **See success** → Get ticket ID and confirmation
5. **Admin Portal** → Watch ticket appear in real-time (auto-refreshes every 5 seconds)
6. **View ticket details** → See cleaned email body, user info, timestamps
7. **Test replies** → Use ticket short ID to add comments

## Tips & Tricks

### Getting Ticket IDs for Replies

After creating a ticket, the success message shows:
```
Ticket ID: 669a2c1f-e9fb-4742-9302-4164fb9bca7f
Short ID for replies: [669a2c1f]
```

Use the short ID in your subject: `[#669a2c1f] Re: Your original subject`

### Testing Different User Emails

Change the "From Email" to simulate different customers:
- `customer1@example.com`
- `customer2@example.com`
- `john@acme.com`

The system will **auto-create customer accounts** for new email addresses.

### Verifying Email Body Cleaning

Create a ticket with this body:
```
I have a question about my account.

--
John Doe
CEO, Example Corp

On Wed, Oct 25, 2025 at 1:00 PM Support <support@demo.com> wrote:
> Thanks for contacting us!
```

The ticket description should only contain:
```
I have a question about my account.
```

### Testing Auto-User Creation

1. Use a brand new email: `newuser@test.com`
2. Send an email
3. Check Admin Portal → Users
4. ✅ New customer account created automatically with role: CUSTOMER

## Comparison: Simulator vs Real SendGrid

| Feature | Simulator | Real SendGrid |
|---------|-----------|---------------|
| Setup Time | 0 minutes | 30+ minutes |
| Domain Required | ❌ No | ✅ Yes |
| DNS Configuration | ❌ No | ✅ Yes (MX records) |
| ngrok/Public URL | ❌ No | ✅ Yes |
| Tests Ticket Creation | ✅ Yes | ✅ Yes |
| Tests Email Replies | ✅ Yes | ✅ Yes |
| Tests Body Cleaning | ✅ Yes | ✅ Yes |
| Real Email Delivery | ❌ No | ✅ Yes |
| Production Ready | ❌ No (testing only) | ✅ Yes |

## Troubleshooting

### Error: "Network error"

**Solution**: Make sure backend is running on port 3000
```bash
cd packages/backend
npm run start:dev
```

### Error: "Failed to process email"

**Solution**: Check backend logs for specific error. Common issues:
- Invalid email format
- Missing required fields
- Database connection issues

### Ticket not appearing in Admin Portal

**Solutions**:
1. Wait 5 seconds for auto-refresh
2. Manually refresh the page
3. Check that you're viewing the correct tenant
4. Verify ticket was created (check console/network tab)

### Comment not added to ticket

**Solutions**:
1. Make sure subject contains `[#shortID]` format
2. Verify ticket ID is correct
3. Check that ticket exists in the database
4. Ensure ticket is not CLOSED

## Advanced Usage

### Custom Webhook Payload

The simulator sends this JSON to `/webhooks/email/sendgrid`:

```json
{
  "from": "Customer Name <customer@example.com>",
  "to": "support@demo.yourcompany.com",
  "subject": "Help with login",
  "text": "Plain text body...",
  "html": "<p>HTML body...</p>",
  "headers": "Received: by simulator.test",
  "envelope": "{\"to\":[\"support@demo.yourcompany.com\"],\"from\":\"customer@example.com\"}",
  "charsets": "{\"to\":\"UTF-8\",\"from\":\"UTF-8\",\"subject\":\"UTF-8\"}",
  "SPF": "pass"
}
```

### Testing with curl

You can also test the webhook directly:

```bash
curl -X POST http://localhost:3000/webhooks/email/sendgrid \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Test User <test@example.com>",
    "to": "support@demo.yourcompany.com",
    "subject": "Test ticket",
    "text": "This is a test ticket from curl",
    "charsets": "{\"to\":\"UTF-8\"}",
    "SPF": "pass"
  }'
```

### Running Automated Tests

Run the full test suite:

```bash
node test-email-to-ticket.js
```

This tests all scenarios programmatically.

## Next Steps

Once you're satisfied with testing:

1. **Set up SendGrid** (see `packages/backend/docs/EMAIL_TO_TICKET_SETUP.md`)
2. **Configure DNS** (add MX records for your domain)
3. **Update `.env`** with production SendGrid API key
4. **Test with real emails** using your configured domain
5. **Deploy to production**

---

**Happy Testing!** 🎉

The Email Simulator gives you a complete testing environment for the email-to-ticket feature without any external dependencies.
