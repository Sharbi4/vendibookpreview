/**
 * Runtime loader for Plaid Link.
 *
 * Loaded from Plaid's CDN on demand so the marketplace bundle stays lean and
 * sellers who never buy verification never download it. No Plaid credentials
 * are ever present in the browser — only a short-lived server-issued link token.
 */

let scriptPromise: Promise<any> | null = null;

const LINK_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

export function loadPlaidLink(): Promise<any> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = (window as any).Plaid;
    if (existing) return resolve(existing);

    const script = document.createElement('script');
    script.src = LINK_SRC;
    script.async = true;
    script.onload = () => {
      const ns = (window as any).Plaid;
      if (ns) resolve(ns);
      else reject(new Error('The identity check did not finish loading.'));
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('We could not reach the identity provider. Check your connection.'));
    };
    document.head.appendChild(script);
  }).catch((err) => {
    scriptPromise = null;
    throw err;
  });

  return scriptPromise;
}

export interface PlaidLinkOutcome {
  /** The user finished the Link flow. This alone proves nothing. */
  submitted: boolean;
  /** The user closed Link early. */
  exited: boolean;
  errorMessage?: string;
}

/**
 * Opens Plaid Link and resolves when the modal closes.
 *
 * IMPORTANT: `submitted` only means information was handed to Plaid. The badge
 * and the payment capture are decided exclusively by the server after it reads
 * the authoritative Plaid status.
 */
export function openPlaidLink(linkToken: string): Promise<PlaidLinkOutcome> {
  return loadPlaidLink().then(
    (Plaid) =>
      new Promise<PlaidLinkOutcome>((resolve) => {
        let submitted = false;
        const handler = Plaid.create({
          token: linkToken,
          onSuccess: () => {
            submitted = true;
          },
          onExit: (err: { display_message?: string; error_message?: string } | null) => {
            resolve({
              submitted,
              exited: !submitted,
              errorMessage: err?.display_message ?? err?.error_message,
            });
          },
        });
        handler.open();
      }),
  );
}
