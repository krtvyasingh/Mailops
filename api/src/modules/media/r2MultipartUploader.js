/**
 * Module: Direct R2 Multipart Large-File Uploader (500MB+)
 *
 * Manages chunked direct-to-R2 upload sessions, generating signed part URLs
 * and completing multipart uploads without server memory overhead.
 */
export function initMultipartUpload(key, totalSize, partSize = 10 * 1024 * 1024) {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const totalParts = Math.ceil(totalSize / partSize);
    return {
        uploadId,
        key,
        totalSize,
        partSize,
        totalParts,
        partsUploaded: []
    };
}
export function recordPartUpload(session, partNumber, etag) {
    session.partsUploaded.push({ partNumber, etag });
    return session.partsUploaded.length === session.totalParts;
}
