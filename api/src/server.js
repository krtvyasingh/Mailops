/**
 * Standalone Node.js / Docker Server for Mailops
 * Serves API endpoints, static React frontend assets, and protocol listeners.
 */
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// Import route definitions
import { autoconfigRouter } from './routes/autoconfig';
import { dnsRouter } from './routes/dns';
import { sendRouter } from './routes/send';
import { aiRouter } from './routes/ai';
import { productivityRouter } from './routes/productivity';
import { collaborationRouter } from './routes/collaboration';
import { securityRouter } from './routes/security';
import { customizationRouter } from './routes/customization';
import { accountsRouter } from './routes/accounts';
import { MailopsTCPDaemon } from './server/tcpDaemon';
const serverApp = new Hono();
// Global Middleware
serverApp.use('*', cors());
// Healthcheck endpoint for Docker container probes
serverApp.get('/api/health', (c) => {
    return c.json({
        status: 'healthy',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage()
    });
});
// Mount all core API and Autoconfig routers
serverApp.route('/', autoconfigRouter);
serverApp.route('/api/accounts', accountsRouter);
serverApp.route('/api/dns', dnsRouter);
serverApp.route('/api/send', sendRouter);
serverApp.route('/api/ai', aiRouter);
serverApp.route('/api/productivity', productivityRouter);
serverApp.route('/api/collaboration', collaborationRouter);
serverApp.route('/api/security', securityRouter);
serverApp.route('/api/customization', customizationRouter);
// In-memory / Mock inbox endpoint for standalone local or containerized execution
serverApp.get('/api/inbox', (c) => {
    return c.json([
        {
            id: 'welcome-001',
            fromAddr: 'system@mailops.me',
            toAddr: 'user@mailops.me',
            subject: 'Welcome to your Self-Hosted Mailops Instance 📬',
            textBody: 'Your Mailops container is running successfully with zero external dependencies!\n\nUse this dashboard to manage custom domains, inspect inbound/outbound queues, and test deliverability.',
            direction: 'inbound',
            createdAt: new Date().toISOString(),
            read: false
        }
    ]);
});
// Static assets serving for built React Web UI (web/dist)
const clientDistPath = join(process.cwd(), 'web', 'dist');
if (existsSync(clientDistPath)) {
    serverApp.use('/*', serveStatic({ root: './web/dist' }));
    // SPA fallback for unmatched routes
    serverApp.get('*', (c) => {
        const indexPath = join(clientDistPath, 'index.html');
        if (existsSync(indexPath)) {
            const html = readFileSync(indexPath, 'utf-8');
            return c.html(html);
        }
        return c.text('Mailops API is operational (Client dist not built)', 200);
    });
}
else {
    serverApp.get('/', (c) => {
        return c.text('Mailops API & Protocol Server is running (Docker Mode)');
    });
}
// Configuration
const PORT = Number(process.env.PORT) || 3000;
const ENABLE_TCP_DAEMON = process.env.ENABLE_TCP_DAEMON === 'true' || process.env.ENABLE_TCP_DAEMON === '1';
// Launch HTTP Server
const server = serve({
    fetch: serverApp.fetch,
    port: PORT
}, (info) => {
    console.log(`[Mailops Docker] HTTP Server listening on http://0.0.0.0:${info.port}`);
    console.log(`[Mailops Docker] Healthcheck available at http://0.0.0.0:${info.port}/api/health`);
});
// Optionally launch raw TCP IMAP/SMTP listener daemons
if (ENABLE_TCP_DAEMON) {
    try {
        const imapPort = Number(process.env.IMAP_PORT) || 1143;
        const smtpPort = Number(process.env.SMTP_PORT) || 1025;
        const tcpDaemon = new MailopsTCPDaemon({ imapPort, smtpPort });
        tcpDaemon.start().then(() => {
            console.log(`[Mailops Docker] Raw TCP Daemons active: IMAP on port ${imapPort}, SMTP on port ${smtpPort}`);
        }).catch(err => {
            console.error('[Mailops Docker] TCP Daemon start failed:', err);
        });
        process.on('SIGTERM', () => {
            console.log('[Mailops Docker] Stopping TCP Daemons...');
            tcpDaemon.stop();
        });
    }
    catch (err) {
        console.error('[Mailops Docker] Failed to initialize TCP Daemons:', err);
    }
}
// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('[Mailops Docker] SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('[Mailops Docker] HTTP Server closed.');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('[Mailops Docker] SIGINT received. Shutting down...');
    server.close(() => {
        process.exit(0);
    });
});
