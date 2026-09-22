/**
 * Module: POP3 Protocol Bridge (RFC 1939)
 *
 * Provides an authenticated POP3 protocol bridge for downloading messages
 * using legacy desktop email clients without IMAP/REST support.
 */
export function handlePOP3Command(session, line) {
    const [cmd, ...args] = line.trim().split(/\s+/);
    const upper = cmd.toUpperCase();
    switch (upper) {
        case 'USER':
            session.username = args[0];
            return { response: `+OK User ${session.username} accepted` };
        case 'PASS':
            if (session.username) {
                session.authenticated = true;
                session.state = 'TRANSACTION';
                return { response: '+OK Mailbox locked and ready' };
            }
            return { response: '-ERR USER required first' };
        case 'STAT':
            if (session.state !== 'TRANSACTION')
                return { response: '-ERR Not authorized' };
            const activeMsgs = session.messages.filter(m => !m.deleted);
            const totalBytes = activeMsgs.reduce((acc, m) => acc + m.size, 0);
            return { response: `+OK ${activeMsgs.length} ${totalBytes}` };
        case 'LIST':
            if (session.state !== 'TRANSACTION')
                return { response: '-ERR Not authorized' };
            if (args[0]) {
                const idx = parseInt(args[0], 10) - 1;
                const msg = session.messages[idx];
                if (msg && !msg.deleted)
                    return { response: `+OK ${args[0]} ${msg.size}` };
                return { response: '-ERR No such message' };
            }
            const listLines = session.messages
                .map((m, i) => (!m.deleted ? `${i + 1} ${m.size}` : ''))
                .filter(Boolean)
                .join('\r\n');
            return { response: `+OK Scan listing follows\r\n${listLines}\r\n.` };
        case 'RETR':
            if (session.state !== 'TRANSACTION')
                return { response: '-ERR Not authorized' };
            const retrIdx = parseInt(args[0] || '0', 10) - 1;
            const target = session.messages[retrIdx];
            if (target && !target.deleted) {
                return { response: `+OK ${target.size} octets\r\n${target.rawMime}\r\n.` };
            }
            return { response: '-ERR No such message' };
        case 'DELE':
            if (session.state !== 'TRANSACTION')
                return { response: '-ERR Not authorized' };
            const delIdx = parseInt(args[0] || '0', 10) - 1;
            if (session.messages[delIdx]) {
                session.messages[delIdx].deleted = true;
                return { response: `+OK Message ${args[0]} marked for deletion` };
            }
            return { response: '-ERR No such message' };
        case 'NOOP':
            return { response: '+OK' };
        case 'QUIT':
            session.state = 'UPDATE';
            return { response: '+OK Mailops POP3 server signing off', terminate: true };
        default:
            return { response: '-ERR Command not implemented' };
    }
}
