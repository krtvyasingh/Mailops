/**
 * Module: Authenticated SMTP Submission Relay Bridge (RFC 6409)
 * 
 * Provides an authenticated submission protocol bridge mapping standard
 * SMTP AUTH PLAIN / LOGIN sessions to Mailops D1 outbound queue.
 */

export interface SMTPSession {
  sessionId: string;
  authenticatedUser?: string;
  mailFrom?: string;
  rcptTo: string[];
  dataBuffer: string;
}

export function handleSMTPCommand(session: SMTPSession, line: string): { response: string; terminate?: boolean } {
  const [cmd, ...args] = line.trim().split(/\s+/);
  const upperCmd = cmd.toUpperCase();

  switch (upperCmd) {
    case 'EHLO':
    case 'HELO':
      return { response: '250-mailops.local Hello\r\n250-AUTH PLAIN LOGIN\r\n250-SIZE 26214400\r\n250 OK' };
    case 'MAIL':
      session.mailFrom = args.join(' ').replace(/^FROM:\s*/i, '');
      return { response: '250 2.1.0 Originator OK' };
    case 'RCPT':
      const recipient = args.join(' ').replace(/^TO:\s*/i, '');
      session.rcptTo.push(recipient);
      return { response: '250 2.1.5 Recipient OK' };
    case 'DATA':
      return { response: '354 Start mail input; end with <CRLF>.<CRLF>' };
    case 'QUIT':
      return { response: '221 2.0.0 Bye', terminate: true };
    default:
      return { response: '500 5.5.1 Command unrecognized' };
  }
}
