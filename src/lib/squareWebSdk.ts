/**
 * Loads Square's Web Payments SDK once per page. Card numbers are entered in
 * Square-hosted iframes and never touch Vendibook code; the browser only ever
 * receives a single-use token.
 */
/** The slice of Square's Web Payments SDK Vendibook uses. */
export interface SquareCard {
  attach(target: HTMLElement | string | null): Promise<void>;
  tokenize(details?: Record<string, unknown>): Promise<{ status: string; token?: string }>;
  destroy(): Promise<boolean | void>;
}
export interface SquarePaymentsSdk {
  payments(applicationId: string, locationId: string): { card(): Promise<SquareCard> };
}
type SquareWindow = Window & { Square?: SquarePaymentsSdk };

let sdkPromise: Promise<SquarePaymentsSdk> | undefined;
let sdkEnvironment: string | undefined;

export function loadSquareWebSdk(environment: 'sandbox' | 'production'): Promise<SquarePaymentsSdk> {
  const existing = (window as SquareWindow).Square;
  if (existing && (!sdkEnvironment || sdkEnvironment === environment)) {
    sdkEnvironment = environment;
    return Promise.resolve(existing);
  }
  if (sdkEnvironment && sdkEnvironment !== environment) {
    return Promise.reject(new Error('Reload the page to switch payment environments.'));
  }
  sdkEnvironment = environment;
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = environment === 'production'
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.onload = () => {
        const sdk = (window as SquareWindow).Square;
        if (sdk) resolve(sdk);
        else reject(new Error('Secure card entry could not load. Check your connection and refresh.'));
      };
      script.onerror = () => {
        sdkPromise = undefined;
        sdkEnvironment = undefined;
        script.remove();
        reject(new Error('Secure card entry could not load. Check your connection and refresh.'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}
