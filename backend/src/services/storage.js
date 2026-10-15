// File storage. STORAGE_DRIVER=local (development) | s3 (any S3-compatible bucket, e.g. Neon Object Storage, Cloudflare R2).
// Keys: public/... (photos, job/event images, served through the API) and private/... (proof documents,
// reachable only through short-lived signed URLs issued after a scope check).
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { config } from '../config/index.js';
import { badRequest } from '../lib/errors.js';

export const LIMITS = {
  image: { max: 2 * 1024 * 1024, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
  proof: { max: 5 * 1024 * 1024, mimes: ['application/pdf', 'image/jpeg', 'image/png'] },
};
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

/** Checks the real type from the file's bytes (not its name or the client's Content-Type). */
export async function sniff(buffer, kind) {
  const lim = LIMITS[kind];
  if (!buffer?.length) throw badRequest('Choose a file to upload.');
  if (buffer.length > lim.max) throw badRequest(`File is too large (max ${lim.max / 1024 / 1024} MB).`);
  const ft = await fileTypeFromBuffer(buffer);
  if (!ft || !lim.mimes.includes(ft.mime)) throw badRequest(kind === 'image' ? 'Upload a JPEG, PNG or WebP image.' : 'Upload a PDF, JPEG or PNG file.');
  return ft.mime;
}

const newKey = (prefix, mime) => `${prefix}/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[mime]}`;
const safeKey = (key) => {
  if (!/^(public|private)\/[\w\-/.]+$/.test(key) || key.includes('..')) throw badRequest('Invalid file key.');
  return key;
};

// --- local driver -------------------------------------------------------------------------------
const localRoot = () => path.resolve(config.STORAGE_LOCAL_DIR);
const local = {
  async put(key, buffer) { const p = path.join(localRoot(), key); await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, buffer); },
  async get(key) { const p = path.join(localRoot(), safeKey(key)); await fs.access(p); return createReadStream(p); },
  async remove(key) { await fs.rm(path.join(localRoot(), safeKey(key)), { force: true }); },
};

// --- s3 driver (lazy so local development does not load the AWS SDK) -----------------------------
let s3;
async function s3client() {
  if (!s3) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3 = new S3Client({
      region: config.S3_REGION, endpoint: config.S3_ENDPOINT || undefined, forcePathStyle: !!config.S3_ENDPOINT,
      credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY },
    });
  }
  return s3;
}
const remote = {
  async put(key, buffer, mime) { const { PutObjectCommand } = await import('@aws-sdk/client-s3'); await (await s3client()).send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, Body: buffer, ContentType: mime })); },
  async get(key) { const { GetObjectCommand } = await import('@aws-sdk/client-s3'); return (await (await s3client()).send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: safeKey(key) }))).Body; },
  async remove(key) { const { DeleteObjectCommand } = await import('@aws-sdk/client-s3'); await (await s3client()).send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: safeKey(key) })); },
};
const driver = () => (config.STORAGE_DRIVER === 's3' ? remote : local);

/** Validates and stores an upload; returns { key, mime, size }. */
export async function saveUpload(buffer, kind) {
  const mime = await sniff(buffer, kind);
  const key = newKey(kind === 'proof' ? 'private' : 'public', mime);
  await driver().put(key, buffer, mime);
  return { key, mime, size: buffer.length };
}

export const getObject = (key) => driver().get(key);
export const removeObject = (key) => driver().remove(key).catch(() => {});
export const mimeOf = (key) => Object.entries(EXT).find(([, e]) => key.endsWith(`.${e}`))?.[0] || 'application/octet-stream';

/** Public files are served through the API on the same origin. */
export const publicUrl = (key) => (key ? `/api/v1/files/${key}` : null);

const sign = (key, exp) => crypto.createHmac('sha256', config.FILE_SIGNING_SECRET).update(`${key}|${exp}`).digest('base64url');

/** Short-lived URL for a private object (default 5 minutes). */
export async function signedUrl(key, ttlSec = 300) {
  if (config.STORAGE_DRIVER === 's3') {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    return getSignedUrl(await s3client(), new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: safeKey(key) }), { expiresIn: ttlSec });
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `/api/v1/files/${key}?exp=${exp}&sig=${sign(key, exp)}`;
}

export function verifySignature(key, exp, sig) {
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = Buffer.from(sign(key, Number(exp)));
  const got = Buffer.from(String(sig));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
