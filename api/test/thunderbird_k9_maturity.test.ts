import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  formatAutocryptHeader,
  parseAutocryptHeader,
  processInboundAutocrypt,
  generateAutocryptGossipHeaders,
  parseAutocryptGossipHeaders,
  recommendEncryption
} from '../src/modules/security/autocrypt';

import {
  generateThunderbirdAutoconfigXml,
  generateOutlookAutodiscoverXml,
  generateAppleMobileConfig
} from '../src/modules/protocols/autoconfig';

import {
  parseICalendar,
  generateIcsRsvpReply
} from '../src/modules/calendar/icalRsvp';

import {
  parseVCard,
  serializeVCard,
  generateCardDavMultiStatus
} from '../src/modules/contacts/carddavSync';

import {
  compileSieveScript,
  executeSieveRules,
  EmailContext
} from '../src/modules/productivity/sieveEngine';

import {
  computeQresyncDelta,
  SyncMessageState
} from '../src/modules/protocols/qresyncEngine';

import {
  resolveIdentityForSender,
  formatFromHeader,
  SenderIdentity
} from '../src/modules/customization/multiIdentity';

import {
  applyPrivacyShield
} from '../src/modules/security/privacyShield';

describe('Thunderbird & K-9 Mail Architecture Suite', () => {

  describe('1. Autocrypt Level 1 & Opportunistic OpenPGP Key Exchange', () => {
    const dummyKey = 'mQENBF4/e...dummyKeyData...';

    it('should format a compliant Autocrypt Level 1 header', () => {
      const header = formatAutocryptHeader({
        addr: 'alice@mailops.me',
        preferEncrypt: 'mutual',
        keyData: dummyKey
      });
      assert.match(header, /^addr=alice@mailops\.me; prefer-encrypt=mutual; type=p; keydata=/);
    });

    it('should parse an incoming Autocrypt header accurately', () => {
      const headerStr = `addr=bob@domain.com; prefer-encrypt=mutual; type=p; keydata=${dummyKey}`;
      const record = parseAutocryptHeader(headerStr);
      assert.ok(record);
      assert.strictEqual(record?.addr, 'bob@domain.com');
      assert.strictEqual(record?.preferEncrypt, 'mutual');
      assert.strictEqual(record?.keyData, dummyKey);
    });

    it('should process inbound email headers and extract sender Autocrypt record', () => {
      const headers = {
        'Autocrypt': `addr=alice@mailops.me; prefer-encrypt=mutual; keydata=${dummyKey}`
      };
      const record = processInboundAutocrypt(headers, 'alice@mailops.me');
      assert.ok(record);
      assert.strictEqual(record?.addr, 'alice@mailops.me');
    });

    it('should generate and parse Autocrypt-Gossip headers for multi-recipient threads', () => {
      const peers = [
        { email: 'bob@example.com', keyData: 'key1' },
        { email: 'carol@example.com', keyData: 'key2' }
      ];
      const gossipHeaders = generateAutocryptGossipHeaders(peers);
      assert.strictEqual(gossipHeaders.length, 2);

      const parsed = parseAutocryptGossipHeaders({ 'Autocrypt-Gossip': gossipHeaders });
      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[0].addr, 'bob@example.com');
      assert.strictEqual(parsed[1].addr, 'carol@example.com');
    });

    it('should recommend encryption when mutual preferences match', () => {
      const rec = {
        addr: 'alice@mailops.me',
        preferEncrypt: 'mutual' as const,
        keyData: dummyKey,
        type: 'p',
        lastSeen: new Date()
      };
      const decision = recommendEncryption(rec, 'mutual');
      assert.strictEqual(decision.shouldEncrypt, true);
    });
  });

  describe('2. Thunderbird, Apple & Outlook Auto-Configuration Protocols', () => {
    it('should generate valid Mozilla Thunderbird clientConfig XML', () => {
      const xml = generateThunderbirdAutoconfigXml({ domain: 'mailops.me' });
      assert.match(xml, /<emailProvider id="mailops\.me">/);
      assert.match(xml, /<incomingServer type="imap">/);
      assert.match(xml, /<outgoingServer type="smtp">/);
      assert.match(xml, /<port>993<\/port>/);
    });

    it('should generate valid Microsoft Outlook Autodiscover XML', () => {
      const xml = generateOutlookAutodiscoverXml('user@mailops.me', { domain: 'mailops.me' });
      assert.match(xml, /<Autodiscover/);
      assert.match(xml, /<Type>IMAP<\/Type>/);
      assert.match(xml, /<Type>SMTP<\/Type>/);
    });

    it('should generate valid Apple iOS / macOS .mobileconfig plist XML', () => {
      const plist = generateAppleMobileConfig('user@mailops.me', { domain: 'mailops.me' });
      assert.match(plist, /com\.apple\.mail\.managed/);
      assert.match(plist, /IncomingMailServerHostName/);
      assert.match(plist, /imap\.mailops\.me/);
    });
  });

  describe('3. iCalendar (RFC 5545 / RFC 5546) Meeting Invites & RSVP Engine', () => {
    const rawIcs = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      'UID:meeting-xyz-123',
      'SUMMARY:Q3 Product Roadmap Sync',
      'DESCRIPTION:Quarterly engineering planning and sprint milestones',
      'LOCATION:Google Meet / Zoom Room',
      'DTSTART:20260925T140000Z',
      'DTEND:20260925T150000Z',
      'ORGANIZER;CN=Team Lead:mailto:lead@company.com',
      'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;CN=Developer:mailto:dev@mailops.me',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    it('should accurately parse iCalendar meeting invites', () => {
      const event = parseICalendar(rawIcs);
      assert.ok(event);
      assert.strictEqual(event?.uid, 'meeting-xyz-123');
      assert.strictEqual(event?.summary, 'Q3 Product Roadmap Sync');
      assert.strictEqual(event?.location, 'Google Meet / Zoom Room');
      assert.strictEqual(event?.organizer?.email, 'lead@company.com');
      assert.strictEqual(event?.organizer?.name, 'Team Lead');
      assert.strictEqual(event?.attendees.length, 1);
    });

    it('should generate an RFC 5546 METHOD:REPLY RSVP response (.ics)', () => {
      const event = parseICalendar(rawIcs)!;
      const rsvpIcs = generateIcsRsvpReply({
        event,
        attendeeEmail: 'dev@mailops.me',
        attendeeName: 'Developer',
        status: 'ACCEPTED',
        comment: 'Looking forward to it!'
      });

      assert.match(rsvpIcs, /METHOD:REPLY/);
      assert.match(rsvpIcs, /PARTSTAT=ACCEPTED/);
      assert.match(rsvpIcs, /COMMENT:Looking forward to it!/);
      assert.match(rsvpIcs, /UID:meeting-xyz-123/);
    });
  });

  describe('4. CardDAV (RFC 6352) & vCard 4.0 Address Book Sync', () => {
    const rawVCard = [
      'BEGIN:VCARD',
      'VERSION:4.0',
      'UID:contact-001',
      'FN:Alice Johnson',
      'EMAIL;TYPE=work:alice@enterprise.com',
      'TEL;TYPE=cell:+1-555-0199',
      'ORG:Engineering Corp',
      'TITLE:Principal Architect',
      'END:VCARD'
    ].join('\r\n');

    it('should parse vCard format correctly', () => {
      const contact = parseVCard(rawVCard);
      assert.ok(contact);
      assert.strictEqual(contact?.uid, 'contact-001');
      assert.strictEqual(contact?.fn, 'Alice Johnson');
      assert.strictEqual(contact?.email, 'alice@enterprise.com');
      assert.strictEqual(contact?.org, 'Engineering Corp');
      assert.strictEqual(contact?.title, 'Principal Architect');
    });

    it('should serialize ContactEntry into vCard 4.0', () => {
      const contact = {
        uid: 'contact-002',
        fn: 'Bob Smith',
        email: 'bob@example.com',
        phone: '+1-555-0200'
      };
      const vcard = serializeVCard(contact);
      assert.match(vcard, /BEGIN:VCARD/);
      assert.match(vcard, /VERSION:4\.0/);
      assert.match(vcard, /FN:Bob Smith/);
      assert.match(vcard, /EMAIL;TYPE=work:bob@example\.com/);
    });

    it('should generate CardDAV Multi-Status XML', () => {
      const contacts = [{ uid: 'c1', fn: 'Alice', email: 'alice@domain.com' }];
      const xml = generateCardDavMultiStatus(contacts, '/addressbooks/user/default');
      assert.match(xml, /<D:multistatus/);
      assert.match(xml, /<D:href>\/addressbooks\/user\/default\/c1\.vcf<\/D:href>/);
      assert.match(xml, /text\/vcard; version=4\.0/);
    });
  });

  describe('5. Sieve Email Filtering Engine (RFC 5228)', () => {
    const sampleScript = `
      # Auto-filing newsletters
      if header :contains "List-Unsubscribe" "http" {
        fileinto "Newsletters";
        stop;
      }
      # Flagging urgent messages from boss
      if allof (header :contains "Subject" "Urgent", header :is "From" "boss@company.com") {
        fileinto "Priority";
      }
    `;

    it('should compile a Sieve script into executable AST rules', () => {
      const rules = compileSieveScript(sampleScript);
      assert.ok(rules.length >= 2);
      assert.strictEqual(rules[0].actions[0].type, 'fileinto');
      assert.strictEqual(rules[0].actions[0].param, 'Newsletters');
    });

    it('should execute Sieve rules against incoming email context', () => {
      const rules = compileSieveScript(sampleScript);
      const email: EmailContext = {
        from: 'news@weekly.org',
        to: 'user@mailops.me',
        subject: 'Weekly Tech Digest',
        headers: { 'list-unsubscribe': '<https://weekly.org/unsub>' },
        sizeBytes: 2048,
        body: 'Check out this week’s tech news!'
      };

      const result = executeSieveRules(email, rules);
      assert.strictEqual(result.action, 'fileinto');
      assert.strictEqual(result.targetFolder, 'Newsletters');
      assert.strictEqual(result.stopped, true);
    });
  });

  describe('6. QRESYNC (RFC 5162) Fast Sync Engine', () => {
    const serverMessages: SyncMessageState[] = [
      { uid: 101, modSeq: 10, flags: ['\\Seen'] },
      { uid: 102, modSeq: 15, flags: ['\\Seen', '\\Flagged'] },
      { uid: 103, modSeq: 25, flags: ['\\Seen'] },
      { uid: 104, modSeq: 30, flags: ['\\Seen', '\\Answered'] }
    ];

    it('should compute vanished UIDs and modified flags since last MODSEQ', () => {
      const delta = computeQresyncDelta(
        123456, // Current UIDVALIDITY
        30,     // Current HIGHESTMODSEQ
        serverMessages,
        {
          uidValidity: 123456,
          lastKnownModSeq: 20,
          knownUids: [100, 101, 102] // UID 100 was deleted on server
        }
      );

      assert.strictEqual(delta.fullResyncRequired, false);
      assert.deepStrictEqual(delta.response.vanishedUids, [100]);
      assert.strictEqual(delta.response.newMessages.length, 2); // UID 103 and 104
      assert.strictEqual(delta.response.highestModSeq, 30);
    });

    it('should trigger full resync when UIDVALIDITY changes', () => {
      const delta = computeQresyncDelta(
        999999, // New UIDVALIDITY
        30,
        serverMessages,
        {
          uidValidity: 123456, // Old UIDVALIDITY
          lastKnownModSeq: 20,
          knownUids: [101, 102]
        }
      );

      assert.strictEqual(delta.fullResyncRequired, true);
    });
  });

  describe('7. Multi-Identity & Persona Management', () => {
    const identities: SenderIdentity[] = [
      { id: '1', userId: 'u1', name: 'Personal Mailops', email: 'user@mailops.me', isDefault: true },
      { id: '2', userId: 'u1', name: 'Work Identity', email: 'work@enterprise.com', isDefault: false }
    ];

    it('should resolve the correct sender identity', () => {
      const resolved = resolveIdentityForSender(identities, 'work@enterprise.com');
      assert.strictEqual(resolved?.name, 'Work Identity');
      assert.strictEqual(resolved?.email, 'work@enterprise.com');
    });

    it('should resolve plus-addressed email to base identity', () => {
      const resolved = resolveIdentityForSender(identities, 'user+newsletter@mailops.me');
      assert.strictEqual(resolved?.email, 'user@mailops.me');
    });

    it('should format clean RFC 5322 From header', () => {
      const fromHeader = formatFromHeader(identities[0]);
      assert.strictEqual(fromHeader, '"Personal Mailops" <user@mailops.me>');
    });
  });

  describe('8. Privacy Shield & Remote Resource Blocker', () => {
    const sampleHtml = `
      <div>
        <p>Hello world</p>
        <img src="https://tracker.spy.com/pixel.png" width="1" height="1" />
        <img src="https://cdn.example.com/banner.jpg" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto" />
      </div>
    `;

    it('should block external images and remote stylesheets for un-whitelisted sender', () => {
      const result = applyPrivacyShield(sampleHtml, 'unknown@spammer.com', ['trusted@partner.com']);
      assert.strictEqual(result.isWhitelisted, false);
      assert.strictEqual(result.blockedRemoteResourcesCount, 3);
      assert.match(result.sanitizedHtml, /Remote image blocked for privacy/);
      assert.match(result.sanitizedHtml, /Remote stylesheet blocked/);
    });

    it('should allow all remote images if sender is whitelisted', () => {
      const result = applyPrivacyShield(sampleHtml, 'trusted@partner.com', ['trusted@partner.com']);
      assert.strictEqual(result.isWhitelisted, true);
      assert.strictEqual(result.blockedRemoteResourcesCount, 0);
      assert.match(result.sanitizedHtml, /https:\/\/cdn\.example\.com\/banner\.jpg/);
    });
  });

});
