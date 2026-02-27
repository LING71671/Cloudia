import type { Context } from 'hono';
import type { Env } from '../db/queries';
import { MAX_IMAGE_SIZE } from '@cloudia/shared';

export const uploadHandler = async (c: Context<{ Bindings: Env }>) => {
  const clientId = c.req.header('X-Client-ID');
  if (!clientId) return c.json({ error: 'X-Client-ID header required' }, 401);

  const contentType = c.req.header('Content-Type') ?? 'application/octet-stream';
  const body = await c.req.arrayBuffer();

  if (body.byteLength > MAX_IMAGE_SIZE) {
    return c.json({ error: 'File too large (max 10MB)' }, 413);
  }

  const key = crypto.randomUUID();
  await c.env.MEDIA.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: { uploadedBy: clientId },
  });

  return c.json({ key, url: `/api/media/${key}` });
};

export const downloadHandler = async (c: Context<{ Bindings: Env }>) => {
  const key = c.req.param('key');
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
};
