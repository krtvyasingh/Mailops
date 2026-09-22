/**
 * Feature 99: White-Label Multi-Tenant SaaS Mode
 *
 * Enables agencies and enterprise organizations to deploy custom-branded
 * instances of Mailops with custom domains, logo assets, CSS stylesheets,
 * and isolated D1/R2 tenant boundaries.
 */
const tenants = new Map();
export function registerTenant(config) {
    const tenantId = `tenant_${Math.random().toString(36).substring(2, 9)}`;
    const tenant = {
        ...config,
        tenantId,
        createdAt: new Date(),
    };
    tenants.set(tenantId, tenant);
    return tenant;
}
export function getTenantByHost(host) {
    const cleanHost = host.toLowerCase().split(':')[0];
    for (const tenant of tenants.values()) {
        if (tenant.customDomain.toLowerCase() === cleanHost) {
            return tenant;
        }
    }
    return null;
}
export function generateWhiteLabelHtmlInjection(tenant) {
    return `
    <style>
      :root {
        --primary-brand-color: ${tenant.primaryColor};
        --accent-brand-color: ${tenant.accentColor};
      }
      ${tenant.customCss || ''}
    </style>
    <script>
      window.__MA street_TENANT_CONFIG__ = ${JSON.stringify({
        companyName: tenant.companyName,
        logo: tenant.brandLogoUrl,
        support: tenant.supportEmail,
        features: tenant.featuresEnabled,
    })};
    </script>
  `;
}
