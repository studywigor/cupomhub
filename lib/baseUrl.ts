// lib/baseUrl.ts
// lib/baseUrl.ts
import { headers } from 'next/headers';

export async function getBaseUrl() {
  const hdrs = await headers(); // 👈 await here
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  if (!host) return '';
  return `${proto}://${host}`;
}
