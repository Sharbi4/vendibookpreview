export function safeNotificationPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/dashboard';
  try {
    const url = new URL(raw, 'https://vendibook.com');
    if (url.origin !== 'https://vendibook.com' || url.username || url.password || url.pathname.startsWith('//') || /%2f|%5c/i.test(url.pathname)) return '/dashboard';
    return url.pathname + url.search + url.hash;
  } catch { return '/dashboard'; }
}
export function classifyFcm(status: number, body: any): 'sent' | 'unregistered' | 'retry' | 'failed' {
  if (status >= 200 && status < 300) return 'sent';
  if (body?.error?.details?.some((d: any) => d['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' && d.errorCode === 'UNREGISTERED')) return 'unregistered';
  return status === 429 || status >= 500 ? 'retry' : 'failed';
}
