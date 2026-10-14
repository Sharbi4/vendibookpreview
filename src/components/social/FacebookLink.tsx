/** Vendibook's Facebook page. One source for the header and footer. */
export const VENDIBOOK_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61575463393177';

/** Facebook's "f" mark on its brand-blue rounded square, linking to the Vendibook page. */
export default function FacebookLink({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <a
      href={VENDIBOOK_FACEBOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Vendibook on Facebook"
      title="Vendibook on Facebook"
      className={`inline-flex shrink-0 items-center justify-center rounded-[22%] bg-[#1877F2] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} aria-hidden="true" fill="#fff">
        <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V7.05c0-1.03.28-1.73 1.76-1.73z" />
      </svg>
    </a>
  );
}
