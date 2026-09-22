import { Hono } from 'hono';
import { generateThunderbirdAutoconfigXml, generateOutlookAutodiscoverXml, generateAppleMobileConfig } from '../modules/protocols/autoconfig';
export const autoconfigRouter = new Hono();
// Mozilla Thunderbird Auto-configuration XML endpoint
autoconfigRouter.get('/.well-known/autoconfig/mail/config-v1.1.xml', (c) => {
    const domain = c.req.query('domain') || c.req.header('host')?.split(':')[0] || 'mailops.me';
    const xml = generateThunderbirdAutoconfigXml({ domain });
    return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});
autoconfigRouter.get('/mail/config-v1.1.xml', (c) => {
    const domain = c.req.query('domain') || c.req.header('host')?.split(':')[0] || 'mailops.me';
    const xml = generateThunderbirdAutoconfigXml({ domain });
    return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});
// Microsoft Outlook Autodiscover POX XML endpoint
autoconfigRouter.post('/autodiscover/autodiscover.xml', async (c) => {
    const email = c.req.query('email') || 'user@mailops.me';
    const domain = email.split('@')[1] || 'mailops.me';
    const xml = generateOutlookAutodiscoverXml(email, { domain });
    return c.text(xml, 200, { 'Content-Type': 'text/xml; charset=utf-8' });
});
// Apple iOS / macOS .mobileconfig Profile generator
autoconfigRouter.get('/api/autoconfig/apple.mobileconfig', (c) => {
    const email = c.req.query('email') || 'user@mailops.me';
    const domain = email.split('@')[1] || 'mailops.me';
    const mobileConfig = generateAppleMobileConfig(email, { domain });
    return c.text(mobileConfig, 200, {
        'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
        'Content-Disposition': `attachment; filename="mailops-${domain}.mobileconfig"`
    });
});
