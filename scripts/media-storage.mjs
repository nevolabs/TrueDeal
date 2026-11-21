import { createHash } from 'node:crypto';

export function imageObjectPath(folder, bytes, extension) {
  if (!/^(?:[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}|brand)$/.test(folder) || !['jpg', 'png', 'webp'].includes(extension)) throw new Error('Invalid image destination.');
  return `${folder}/${createHash('sha256').update(bytes).digest('hex')}.${extension}`;
}

export async function publishImage(client, bucket, path, bytes, contentType) {
  const storage = client.storage.from(bucket);
  const { error } = await storage.upload(path, bytes, { contentType, cacheControl: '31536000', upsert: false });
  if (error) {
    if (String(error.statusCode) !== '409') throw new Error(`Image upload failed (${error.statusCode || 'unknown'}).`);
    // Never overwrite an immutable object. Verify a duplicate before reusing it.
    const existing = await storage.download(path);
    if (existing.error || !existing.data) throw new Error(`Could not verify existing image ${bucket}/${path} (${existing.error?.statusCode || 'network error'}). Rerun after connectivity recovers.`);
    if (!Buffer.from(await existing.data.arrayBuffer()).equals(bytes)) throw new Error(`Existing image ${bucket}/${path} does not match its content-addressed object path.`);
  }
  return { path, url: storage.getPublicUrl(path).data.publicUrl };
}
