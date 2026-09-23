/**
 * Auto-Configuration Protocol Service
 * Implements Thunderbird ISPDB XML schema, Microsoft Autodiscover XML, and Apple iOS MobileConfig profiles.
 */
/**
 * Generates official Mozilla Thunderbird XML clientConfig
 * Spec: https://wiki.mozilla.org/Thunderbird:Autoconfiguration:ConfigFileFormat
 */
export function generateThunderbirdAutoconfigXml(settings) {
    const domain = settings.domain;
    const name = settings.displayName || `Mailops (${domain})`;
    const imapHost = settings.imapHost || `imap.${domain}`;
    const imapPort = settings.imapPort || 993;
    const imapSocket = settings.imapSocketType || 'SSL';
    const smtpHost = settings.smtpHost || `smtp.${domain}`;
    const smtpPort = settings.smtpPort || 465;
    const smtpSocket = settings.smtpSocketType || 'SSL';
    return `<?xml version="1.0" encoding="UTF-8"?>
<clientConfig version="1.1">
  <emailProvider id="${domain}">
    <domain>${domain}</domain>
    <displayName>${name}</displayName>
    <displayShortName>${name.split(' ')[0]}</displayShortName>
    <incomingServer type="imap">
      <hostname>${imapHost}</hostname>
      <port>${imapPort}</port>
      <socketType>${imapSocket}</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </incomingServer>
    <outgoingServer type="smtp">
      <hostname>${smtpHost}</hostname>
      <port>${smtpPort}</port>
      <socketType>${smtpSocket}</socketType>
      <authentication>password-cleartext</authentication>
      <username>%EMAILADDRESS%</username>
    </outgoingServer>
  </emailProvider>
</clientConfig>`.trim();
}
/**
 * Standard ISPDB XML format alias
 */
export const generateIspdbAutoconfigXml = generateThunderbirdAutoconfigXml;
/**
 * Generates Microsoft Outlook Autodiscover POX XML
 * Spec: [MS-OXDISCO]
 */
export function generateOutlookAutodiscoverXml(email, settings) {
    const domain = settings.domain;
    const displayName = settings.displayName || email;
    const imapHost = settings.imapHost || `imap.${domain}`;
    const smtpHost = settings.smtpHost || `smtp.${domain}`;
    return `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/responseschema/2006">
  <Response xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a">
    <Account>
      <AccountType>email</AccountType>
      <Action>settings</Action>
      <Protocol>
        <Type>IMAP</Type>
        <Server>${imapHost}</Server>
        <Port>${settings.imapPort || 993}</Port>
        <DomainRequired>off</DomainRequired>
        <LoginName>${email}</LoginName>
        <SPA>off</SPA>
        <SSL>on</SSL>
        <AuthRequired>on</AuthRequired>
      </Protocol>
      <Protocol>
        <Type>SMTP</Type>
        <Server>${smtpHost}</Server>
        <Port>${settings.smtpPort || 465}</Port>
        <DomainRequired>off</DomainRequired>
        <LoginName>${email}</LoginName>
        <SPA>off</SPA>
        <SSL>on</SSL>
        <AuthRequired>on</AuthRequired>
      </Protocol>
      <User>
        <DisplayName>${displayName}</DisplayName>
        <EMailAddress>${email}</EMailAddress>
      </User>
    </Account>
  </Response>
</Autodiscover>`.trim();
}
/**
 * Generates Apple iOS / macOS .mobileconfig XML profile for 1-click native account setup
 */
export function generateAppleMobileConfig(email, settings) {
    const domain = settings.domain;
    const uuid = `mailops-${domain}-${Date.now()}`;
    const imapHost = settings.imapHost || `imap.${domain}`;
    const smtpHost = settings.smtpHost || `smtp.${domain}`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadDisplayName</key>
  <string>Mailops Email (${email})</string>
  <key>PayloadIdentifier</key>
  <string>me.mailops.profile.${domain}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${uuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>EmailAccountDescription</key>
      <string>${settings.displayName || 'Mailops Email'}</string>
      <key>EmailAccountType</key>
      <string>EmailTypeIMAP</string>
      <key>EmailAddress</key>
      <string>${email}</string>
      <key>IncomingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>IncomingMailServerHostName</key>
      <string>${imapHost}</string>
      <key>IncomingMailServerPortNumber</key>
      <integer>${settings.imapPort || 993}</integer>
      <key>IncomingMailServerUseSSL</key>
      <true/>
      <key>IncomingMailServerUsername</key>
      <string>${email}</string>
      <key>OutgoingMailServerAuthentication</key>
      <string>EmailAuthPassword</string>
      <key>OutgoingMailServerHostName</key>
      <string>${smtpHost}</string>
      <key>OutgoingMailServerPortNumber</key>
      <integer>${settings.smtpPort || 465}</integer>
      <key>OutgoingMailServerUseSSL</key>
      <true/>
      <key>OutgoingMailServerUsername</key>
      <string>${email}</string>
      <key>PayloadIdentifier</key>
      <string>me.mailops.email.${domain}</string>
      <key>PayloadType</key>
      <string>com.apple.mail.managed</string>
      <key>PayloadUUID</key>
      <string>${uuid}-email</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
</dict>
</plist>`.trim();
}
