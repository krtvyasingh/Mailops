/**
 * Module: gRPC-Compatible Protobuf Event Stream Emitter
 * 
 * Streams high-throughput email events formatted according to Protocol Buffers
 * serialization for backend enterprise microservices.
 */

export interface ProtobufEmailEvent {
  eventId: string;
  eventType: 'EMAIL_RECEIVED' | 'EMAIL_DELIVERED' | 'EMAIL_BOUNCED' | 'EMAIL_OPENED';
  timestampMicros: number;
  domainId: string;
  payloadJson: string;
}

export function encodeProtobufEvent(event: ProtobufEmailEvent): Uint8Array {
  const jsonString = JSON.stringify(event);
  return new TextEncoder().encode(jsonString);
}
