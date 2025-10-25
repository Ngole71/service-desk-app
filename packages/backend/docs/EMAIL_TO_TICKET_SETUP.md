# Email-to-Ticket Setup Guide

This guide explains how to configure SendGrid Inbound Parse to automatically create and update support tickets from incoming emails.

## Overview

The email-to-ticket feature allows customers to:
- **Create new tickets** by sending an email to your support address
- **Reply to existing tickets** by replying to ticket notification emails
- **Automatically route tickets** to the correct tenant based on email subdomain

## Architecture

```
Customer Email → SendGrid → Inbound Parse → Webhook → Your API → Ticket/Comment Created
```

## Prerequisites

1. **SendGrid Account**: Sign up at [https://sendgrid.com](https://sendgrid.com)
2. **Domain Access**: Ability to add MX and CNAME records to your domain DNS
3. **Public Webhook URL**: Your API must be publicly accessible (use ngrok for local testing)

## Step 1: Configure DNS Records

You need to configure your domain to receive emails via SendGrid.

### Option A: Subdomain (Recommended)

Set up a subdomain like `support.yourcompany.com`:

```
Type: MX
Host: support
Value: mx.sendgrid.net
Priority: 10
```

### Option B: Root Domain

```
Type: MX
Host: @
Value: mx.sendgrid.net
Priority: 10
```

**Note**: Using a subdomain is recommended to avoid conflicts with your main email service.

## Step 2: Configure SendGrid Inbound Parse

1. Log in to your SendGrid account
2. Navigate to **Settings** → **Inbound Parse**
3. Click **Add Host & URL**

### Configuration Details

| Field | Value | Example |
|-------|-------|---------|
| Domain | Your domain/subdomain | `support.yourcompany.com` |
| URL | Your webhook endpoint | `https://your-api.com/webhooks/email/sendgrid` |
| Spam Check | ✅ Check incoming emails for spam | Recommended |
| Send Raw | ❌ Leave unchecked | N/A |
| POST the raw | ❌ Leave unchecked | N/A |

### Local Development with ngrok

For local testing, use ngrok to expose your local API:

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3000

# Use the ngrok URL in SendGrid
https://YOUR-NGROK-ID.ngrok.io/webhooks/email/sendgrid
```

## Step 3: Verify Environment Variables

Ensure your `.env` file contains:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Email to Ticket
EMAIL_TO_TICKET_DOMAIN=support.yourcompany.com
```

## Step 4: Test the Integration

### Test 1: Webhook Health Check

```bash
curl -X POST http://localhost:3000/webhooks/email/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Expected response:
```json
{
  "message": "Webhook is working",
  "received": {"test": "data"}
}
```

### Test 2: Create New Ticket

Send an email to: `support@yourcompany.com`

Subject: `Help with my account`

Body:
```
I'm having trouble accessing my account.
Can you please help?

Thanks,
John
```

**Expected Result**: New ticket created in the system

### Test 3: Reply to Existing Ticket

Reply to a ticket notification email. The subject should contain `[#XXXXXXXX]` where X is the short ticket ID.

**Expected Result**: Comment added to the existing ticket

### Automated Test Suite

Run the automated test suite:

```bash
node test-email-to-ticket.js
```

This will test:
- ✅ Webhook endpoint connectivity
- ✅ New ticket creation from email
- ✅ Email reply to existing ticket
- ✅ Email body cleaning (removes quotes and signatures)
- ✅ Tenant routing logic

## How It Works

### 1. New Ticket Creation

When a customer sends an email:

1. SendGrid receives the email
2. Triggers webhook to `/webhooks/email/sendgrid`
3. System extracts sender, subject, and body
4. Creates new ticket with:
   - **Title**: Email subject
   - **Description**: Cleaned email body
   - **Priority**: Medium (default)
   - **Creator**: Auto-created or existing customer user

### 2. Email Replies (Comments)

When a customer replies to a ticket notification:

1. Subject line is parsed for ticket ID: `[#669a2c1f]`
2. System looks up ticket by short ID (first 8 chars of UUID)
3. Adds email content as a comment to the ticket
4. Preserves conversation threading

### 3. Tenant Routing

Emails are routed to tenants based on recipient address:

```
support@demo.yourcompany.com   → demo tenant
support@acme.yourcompany.com   → acme tenant
support@yourcompany.com        → first active tenant (fallback)
```

### 4. Email Body Cleaning

The system automatically removes:
- Email signatures (text after `--`)
- Quoted replies (lines starting with `>`)
- Previous conversation history
- Email headers like "On X wrote:"

## Ticket Email Format

When a ticket is created or updated, customers receive an email notification. They can reply directly to this email:

```
From: Service Desk <noreply@yourcompany.com>
To: customer@example.com
Subject: [#669a2c1f] Your Support Request

Hello,

Your support ticket has been created:

Title: Help with my account
Status: Open
Priority: Medium

To reply to this ticket, simply reply to this email.

View ticket: https://support.yourcompany.com/tickets/669a2c1f
```

## Troubleshooting

### Issue: Emails not being received

**Check**:
1. DNS MX records are correctly configured
2. SendGrid Inbound Parse is pointing to the correct URL
3. Webhook URL is publicly accessible
4. Check SendGrid activity feed for delivery status

```bash
# Verify MX records
dig MX support.yourcompany.com

# Should show: mx.sendgrid.net
```

### Issue: Tickets created but replies not working

**Check**:
1. Email subject contains ticket ID in format `[#XXXXXXXX]`
2. Ticket ID exists in database
3. Check backend logs for errors:

```bash
# View backend logs
cd packages/backend
npm run start:dev
```

### Issue: Webhook returns 400 Bad Request

**Check**:
1. SendGrid is sending all required fields
2. DTO validation is passing
3. Check backend logs for specific validation errors

```bash
# Test webhook locally
curl -X POST http://localhost:3000/webhooks/email/sendgrid \
  -H "Content-Type: application/json" \
  -d '{
    "from": "customer@example.com",
    "to": "support@yourcompany.com",
    "subject": "Test ticket",
    "text": "This is a test",
    "charsets": "UTF-8",
    "SPF": "pass"
  }'
```

### Issue: User permissions or tenant routing

**Check**:
1. Users are being auto-created with CUSTOMER role
2. Tenant subdomain mapping is correct
3. Fallback tenant logic is working

```sql
-- Check auto-created users
SELECT email, role, "tenantId", "isActive"
FROM users
WHERE email = 'customer@example.com';
```

## Security Considerations

### 1. Webhook Authentication (Optional)

For production, consider adding webhook signature validation:

```typescript
// In email.controller.ts
const signature = req.headers['x-sendgrid-signature'];
const isValid = validateWebhookSignature(req.body, signature);

if (!isValid) {
  throw new UnauthorizedException('Invalid webhook signature');
}
```

### 2. Rate Limiting

Add rate limiting to prevent abuse:

```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests per minute
@Post('sendgrid')
async handleIncomingEmail(...) {}
```

### 3. Spam Filtering

SendGrid provides built-in spam filtering. Check the `spam_score` field:

```typescript
if (emailData.spam_score && parseFloat(emailData.spam_score) > 5.0) {
  this.logger.warn(`High spam score: ${emailData.spam_score}`);
  // Consider rejecting or flagging
}
```

## Production Deployment

### 1. Environment Variables

Set production environment variables:

```env
NODE_ENV=production
SENDGRID_API_KEY=SG.production-key-here
SENDGRID_FROM_EMAIL=noreply@yourproductiondomain.com
EMAIL_TO_TICKET_DOMAIN=support.yourproductiondomain.com
```

### 2. Update SendGrid Configuration

1. Update Inbound Parse URL to production API endpoint
2. Verify DNS records point to production domain
3. Test with real emails

### 3. Monitoring

Monitor the following:

```typescript
// Log all incoming emails
this.logger.log(`Received email from ${emailData.from} to ${emailData.to}`);

// Track ticket creation rate
// Track comment creation rate
// Monitor failed webhook attempts
```

### 4. Database Indexing

For better performance with short ID lookups:

```sql
-- Add index for LIKE queries on ticket IDs
CREATE INDEX idx_tickets_id_text ON tickets (CAST(id AS TEXT) text_pattern_ops);
```

## API Reference

### POST /webhooks/email/sendgrid

Receives incoming emails from SendGrid Inbound Parse.

**Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "from": "Customer Name <customer@example.com>",
  "to": "support@yourcompany.com",
  "subject": "Need help with login",
  "text": "Plain text email body",
  "html": "<p>HTML email body</p>",
  "charsets": "{\"to\":\"UTF-8\",\"from\":\"UTF-8\"}",
  "SPF": "pass"
}
```

**Response (New Ticket)**:
```json
{
  "success": true,
  "ticketId": "669a2c1f-e9fb-4742-9302-4164fb9bca7f",
  "message": "New ticket created"
}
```

**Response (Email Reply)**:
```json
{
  "success": true,
  "ticketId": "669a2c1f-e9fb-4742-9302-4164fb9bca7f",
  "message": "Comment added to existing ticket"
}
```

### POST /webhooks/email/test

Health check endpoint for testing webhook connectivity.

**Response**:
```json
{
  "message": "Webhook is working",
  "received": { /* request body */ }
}
```

## Additional Resources

- [SendGrid Inbound Parse Documentation](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook)
- [SendGrid Webhook Security](https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features)
- [Email Best Practices](https://docs.sendgrid.com/ui/sending-email/email-best-practices)

## Support

For issues or questions:

1. Check backend logs: `packages/backend/logs`
2. Review SendGrid activity feed
3. Run automated tests: `node test-email-to-ticket.js`
4. Check database for created tickets and comments

---

**Last Updated**: October 2025
**Version**: 1.0.0
