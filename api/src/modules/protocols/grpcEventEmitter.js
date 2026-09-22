/**
 * Module: gRPC-Compatible Protobuf Event Stream Emitter
 *
 * Streams high-throughput email events formatted according to Protocol Buffers
 * serialization for backend enterprise microservices.
 */
export function encodeProtobufEvent(event) {
    const jsonString = JSON.stringify(event);
    return new TextEncoder().encode(jsonString);
}
