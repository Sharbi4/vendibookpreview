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

export interface PlaidLinkNamespace {
  create: (config: {
    token: string;
    onSuccess: (publicToken: unknown, metadata: unknown) => void;
    onExit: (err: { display_message?: string; error_message?: string } | null) => void;
  }) => { open: () => void; exit?: (opts?: unknown) => void; destroy?: () => void };
}

/**
 * Opens Plaid Link and resolves exactly once.
 *
 * Plaid may fire `onSuccess` and then close WITHOUT ever firing `onExit`, so
 * success resolves immediately. `onExit` only resolves when success has not
 * already settled the promise — otherwise the caller would hang forever.
 *
 * IMPORTANT: `submitted` only means information was handed to Plaid. The badge
 * and the payment capture are decided exclusively by the server after it reads
 * the authoritative Plaid status.
 */
export function openPlaidLinkWith(
  Plaid: PlaidLinkNamespace,
  linkToken: string,
): Promise<PlaidLinkOutcome> {
  return new Promise<PlaidLinkOutcome>((resolve) => {
    let settled = false;
    let handler: ReturnType<PlaidLinkNamespace['create']> | null = null;

    const teardown = () => {
      try {
        handler?.destroy?.();
      } catch {
        /* Link already torn down */
      }
    };

    const settle = (outcome: PlaidLinkOutcome) => {
      if (settled) return;
      settled = true;
      // Defer teardown so Plaid can finish its own close sequence first.
      setTimeout(teardown, 0);
      resolve(outcome);
    };

    handler = Plaid.create({
      token: linkToken,
      onSuccess: () => settle({ submitted: true, exited: false }),
      onExit: (err) =>
        settle({
          submitted: false,
          exited: true,
          errorMessage: err?.display_message ?? err?.error_message,
        }),
    });

    handler.open();
  });
}

export function openPlaidLink(linkToken: string): Promise<PlaidLinkOutcome> {
  return loadPlaidLink().then((Plaid) => openPlaidLinkWith(Plaid as PlaidLinkNamespace, linkToken));
}
