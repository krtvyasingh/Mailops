/**
 * CardDAV (RFC 6352) & vCard 4.0 (RFC 6350) Address Book Engine
 */

export interface ContactEntry {
  uid: string;
  fn: string; // Formatted Name
  email: string;
  secondaryEmail?: string;
  phone?: string;
  org?: string;
  title?: string;
  note?: string;
  updatedAt?: Date;
}

/**
 * Parses vCard 3.0 / 4.0 string into a ContactEntry object
 */
export function parseVCard(vCardText: string): ContactEntry | null {
  if (!vCardText || !vCardText.includes('BEGIN:VCARD')) {
    return null;
  }

  const unfolded = vCardText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const contact: ContactEntry = {
    uid: '',
    fn: '',
    email: ''
  };

  for (const line of lines) {
    if (line.startsWith('UID:')) {
      contact.uid = line.substring(4).trim();
    } else if (line.startsWith('FN:')) {
      contact.fn = line.substring(3).trim();
    } else if (line.startsWith('EMAIL')) {
      const emailVal = line.substring(line.indexOf(':') + 1).trim();
      if (!contact.email) {
        contact.email = emailVal;
      } else if (!contact.secondaryEmail) {
        contact.secondaryEmail = emailVal;
      }
    } else if (line.startsWith('TEL')) {
      contact.phone = line.substring(line.indexOf(':') + 1).trim();
    } else if (line.startsWith('ORG:')) {
      contact.org = line.substring(4).trim().replace(/;/g, ' ');
    } else if (line.startsWith('TITLE:')) {
      contact.title = line.substring(6).trim();
    } else if (line.startsWith('NOTE:')) {
      contact.note = line.substring(5).trim();
    }
  }

  if (!contact.uid) {
    contact.uid = `card-${Date.now()}`;
  }
  if (!contact.fn && contact.email) {
    contact.fn = contact.email.split('@')[0];
  }

  return contact.email || contact.fn ? contact : null;
}

/**
 * Serializes ContactEntry into RFC 6350 vCard 4.0 format
 */
export function serializeVCard(contact: ContactEntry): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    `PRODID:-//Mailops Cloud//AddressBook 2.0//EN`,
    `UID:${contact.uid}`,
    `FN:${contact.fn || contact.email}`,
    contact.email ? `EMAIL;TYPE=work:${contact.email}` : '',
    contact.secondaryEmail ? `EMAIL;TYPE=home:${contact.secondaryEmail}` : '',
    contact.phone ? `TEL;TYPE=cell:${contact.phone}` : '',
    contact.org ? `ORG:${contact.org}` : '',
    contact.title ? `TITLE:${contact.title}` : '',
    contact.note ? `NOTE:${contact.note.replace(/\n/g, '\\n')}` : '',
    `REV:${(contact.updatedAt || new Date()).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    'END:VCARD'
  ];

  return lines.filter(Boolean).join('\r\n');
}

/**
 * Generates RFC 6352 CardDAV Multi-Status XML response
 */
export function generateCardDavMultiStatus(contacts: ContactEntry[], baseHref: string): string {
  const responses = contacts.map(c => {
    const vcard = serializeVCard(c);
    const href = `${baseHref.replace(/\/$/, '')}/${c.uid}.vcf`;
    const etag = `"${c.uid}-${(c.updatedAt || new Date()).getTime()}"`;

    return `  <D:response>
    <D:href>${href}</D:href>
    <D:propstat>
      <D:prop>
        <D:getetag>${etag}</D:getetag>
        <D:getcontenttype>text/vcard; version=4.0</D:getcontenttype>
        <C:address-data xmlns:C="urn:ietf:params:xml:ns:carddav"><![CDATA[${vcard}]]></C:address-data>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8" ?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
${responses}
</D:multistatus>`.trim();
}
