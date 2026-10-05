/**
 * Loads Square's Web Payments SDK once per page. Card numbers are entered in
 * Square-hosted iframes and never touch Vendibook code; the browser only ever
 * receives a single-use token.
 */
let sdkPromise: Promise<any> | undefined;
let sdkEnvironment: string | undefined;

export function loadSquareWebSdk(environment: 'sandbox' | 'production'): Promise<any> {
  const existing = (window as any).Square;
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
      script.onload = () => resolve((window as any).Square);
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
