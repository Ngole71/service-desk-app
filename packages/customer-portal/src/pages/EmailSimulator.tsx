import { useState, useEffect } from 'react';
import { Send, Mail, CheckCircle, XCircle, Loader } from 'lucide-react';

interface EmailSimulatorProps {
  userEmail?: string;
  userName?: string;
}

interface SimulationResult {
  success: boolean;
  ticketId?: string;
  message: string;
  error?: string;
}

export default function EmailSimulator({ userEmail, userName }: EmailSimulatorProps) {
  const [from, setFrom] = useState(userEmail || 'customer@example.com');
  const [fromName, setFromName] = useState(userName || 'Test Customer');

  // Update when user props change
  useEffect(() => {
    if (userEmail) setFrom(userEmail);
    if (userName) setFromName(userName);
  }, [userEmail, userName]);
  const [to, setTo] = useState('support@demo.yourcompany.com');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleSimulateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Simulate SendGrid webhook payload
      const payload = {
        from: `${fromName} <${from}>`,
        to: to,
        subject: subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        headers: 'Received: by simulator.test',
        envelope: JSON.stringify({
          to: [to],
          from: from,
        }),
        charsets: JSON.stringify({
          to: 'UTF-8',
          from: 'UTF-8',
          subject: 'UTF-8',
        }),
        SPF: 'pass',
      };

      const response = await fetch(`${API_URL}/webhooks/email/sendgrid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          ticketId: data.ticketId,
          message: data.message,
        });

        // Clear form on success
        setSubject('');
        setBody('');
      } else {
        setResult({
          success: false,
          message: 'Failed to process email',
          error: data.message || JSON.stringify(data),
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSampleNewTicket = () => {
    setSubject('Help with password reset');
    setBody(
      `Hi Support Team,

I'm having trouble resetting my password. When I click the "Forgot Password" link, I don't receive any email.

Can you please help me regain access to my account?

Thanks,
${fromName}`
    );
  };

  const loadSampleReply = () => {
    // You would need to get a real ticket ID from your system
    setSubject('[#669a2c1f] Re: Help with password reset');
    setBody(
      `Hi,

I tried the steps you suggested but I'm still not receiving the reset email.
I checked my spam folder and it's not there either.

Could you please check if my email address is correct in the system?

Thanks,
${fromName}`
    );
  };

  const loadSampleWithQuotes = () => {
    setSubject('Question about my invoice');
    setBody(
      `I have a question about my recent invoice.

--
${fromName}
Example Corp

On Wed, Oct 25, 2025 at 1:00 PM Support <support@demo.com> wrote:
> Thanks for contacting us!
> How can we help?`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Email-to-Ticket Simulator
              </h1>
              <p className="text-sm text-gray-600">
                Test the email ticketing flow without SendGrid
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Fill out the form below to simulate sending an email to support
              </li>
              <li>
                • The system will create a ticket or add a comment (for replies)
              </li>
              <li>
                • Go to the Admin Portal to see the ticket appear in real-time
              </li>
              <li>• Test email body cleaning by using sample emails with quotes</li>
            </ul>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Sample Emails
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={loadSampleNewTicket}
              className="px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              📧 New Ticket
            </button>
            <button
              onClick={loadSampleReply}
              className="px-4 py-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
            >
              💬 Reply to Ticket
            </button>
            <button
              onClick={loadSampleWithQuotes}
              className="px-4 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
            >
              🧹 Email with Quotes
            </button>
          </div>
        </div>

        {/* Email Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSimulateEmail}>
            {/* From Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email
                </label>
                <input
                  type="email"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="customer@example.com"
                  required
                />
              </div>
            </div>

            {/* To */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To (Support Email)
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="support@demo.yourcompany.com"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Tip: Use different subdomains to test tenant routing (e.g.,
                support@demo.com, support@acme.com)
              </p>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Help with my account"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Tip: Include [#XXXXXXXX] to simulate a reply to an existing
                ticket
              </p>
            </div>

            {/* Body */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter your email message here..."
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Processing Email...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Email
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result Display */}
        {result && (
          <div
            className={`rounded-lg shadow-sm p-6 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Success!' : 'Error'}
                </h3>
                <p
                  className={`text-sm mb-2 ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.message}
                </p>
                {result.ticketId && (
                  <div className="bg-white rounded px-3 py-2 mt-3">
                    <p className="text-xs text-gray-600 mb-1">Ticket ID:</p>
                    <code className="text-sm font-mono text-gray-900">
                      {result.ticketId}
                    </code>
                    <p className="text-xs text-gray-600 mt-2">
                      Short ID for replies:{' '}
                      <code className="font-mono">
                        [{result.ticketId.substring(0, 8)}]
                      </code>
                    </p>
                  </div>
                )}
                {result.error && (
                  <div className="bg-white rounded px-3 py-2 mt-3">
                    <p className="text-xs text-gray-600 mb-1">Error Details:</p>
                    <code className="text-xs font-mono text-red-600 block whitespace-pre-wrap">
                      {result.error}
                    </code>
                  </div>
                )}
                {result.success && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      Next Steps:
                    </p>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>
                        ✓ Go to Admin Portal → Tickets to see the new ticket
                      </li>
                      <li>
                        ✓ Try replying using the short ID in the subject line
                      </li>
                      <li>✓ Check that email body was cleaned properly</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-gray-100 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">Testing Tips</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>New Ticket:</strong> Use a fresh subject line without any
              ticket ID
            </div>
            <div>
              <strong>Reply to Ticket:</strong> Include{' '}
              <code className="bg-white px-2 py-1 rounded">[#XXXXXXXX]</code> in
              the subject
            </div>
            <div>
              <strong>Tenant Routing:</strong> Change the recipient domain to
              test different tenants
            </div>
            <div>
              <strong>Body Cleaning:</strong> Include quoted text (lines starting
              with &gt;) to test cleaning
            </div>
            <div>
              <strong>Real-time Updates:</strong> Keep the Admin Portal open to
              see tickets appear instantly via WebSocket
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
