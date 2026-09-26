# Android integration fixes — 2026-09-26

Implemented locally in the Android Studio project:
- Exact HTTPS host validation for vendibook.com and www.vendibook.com; preserve payment query parameters and ordinary fragments.
- Receive both running-app and cold-launch links. Suppress duplicate deliveries; remove listeners on unmount. Native hooks do not run on the website.
- Establish Supabase sessions from recovery/confirmation links before navigating. Remove consumed credentials from the routed URL. Failed session verification does not open the protected destination.
- Native signup and password-reset emails use https://vendibook.com rather than localhost. Browser previews retain their existing origin.
- Android manifest includes App Link intent filters plus camera, microphone, and audio-settings permissions. Camera/microphone hardware is optional; runtime permission requests remain user-controlled through Capacitor.
- Hardware Back dismisses dialogs before navigating; at the root it minimizes the app. Disable Android backup of app data.
- Production config permits no cleartext HTTP and does not allow external Vendibook pages to replace the bundled app inside its WebView. Development server configuration remains opt-in.

Validation: 16 focused tests passed; Vite production build passed. No payment capture, provider credentials, or sandbox/live settings changed.

Still required before a device/release sign-off:
1. Publish /.well-known/assetlinks.json on both claimed hostnames, without redirects. Use package_name com.vendibook.app and the actual SHA-256 signing certificate fingerprints (Google Play App Signing certificate for Play releases; debug certificate only for a controlled test association). Do not substitute an upload certificate or invent a fingerprint.
2. Verify Supabase permits the production confirmation and password-reset destinations. Test signup, recovery, and checkout return with the app closed and already running.
3. Native Google OAuth still uses the existing Lovable OAuth integration. Its embedded-browser/native behavior requires an actual device test and provider callback configuration; the App Link fix alone does not establish Google OAuth compatibility.
4. Native push remains disabled until Firebase/FCM credentials, Android notification permission handling, device-token storage, and authenticated backend delivery are configured. No placeholder notification delivery was added.
5. Test PayPal sandbox approval/cancel/decline/pending on a real device. Check that provider windows open and that the return reaches the same transaction. This patch does not redesign the embedded checkout or certify provider WebView compatibility.
6. Test camera/microphone grant and denial, photo selection, keyboard layout, and walkthroughs on a physical Android device.

Use the normal project build then Capacitor sync from an unrestricted local terminal before signing a release. This environment's Capacitor CLI failed in os.userInfo; the rebuilt dist assets and serialized Capacitor config were copied into the existing Android assets directory without changing installed plugins. Local native changes were already uncommitted and are preserved. Do not reset this checkout or replace it with the older GitHub config.

Android verification result: assembleDebug reached resource processing but failed Java compilation with AccessDeniedException on the Android SDK core-for-system-modules.jar and a Gradle-transformed dependency JAR in this execution environment. No installable APK was verified. Run the build in Android Studio before distributing the app.

