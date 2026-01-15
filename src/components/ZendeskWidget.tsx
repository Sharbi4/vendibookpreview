import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    zE?: (...args: any[]) => void;
  }
}

const ZendeskWidget = () => {
  const { user, profile } = useAuth();

  useEffect(() => {
    const configureWidget = () => {
      if (!window.zE) return;

      try {
        if (user && profile) {
          // User is logged in - set conversation fields for the Messaging SDK
          // This pre-fills user info when they open the messenger
          window.zE('messenger:set', 'conversationFields', [
            { id: 'email', value: profile.email || user.email || '' },
            { id: 'name', value: profile.full_name || '' },
          ]);

          // Set locale
          window.zE('messenger:set', 'locale', 'en-US');
        } else {
          // User logged out - clear conversation fields
          window.zE('messenger:set', 'conversationFields', []);
        }
      } catch (error) {
        // Silently handle any API compatibility issues
        console.debug('Zendesk Messaging SDK configuration:', error);
      }
    };

    // Check if Zendesk is already loaded
    if (window.zE) {
      configureWidget();
    } else {
      // Wait for Zendesk to load
      const checkInterval = setInterval(() => {
        if (window.zE) {
          configureWidget();
          clearInterval(checkInterval);
        }
      }, 500);

      // Clean up after 10 seconds if it never loads
      const timeout = setTimeout(() => clearInterval(checkInterval), 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [user, profile]);

  return null;
};

export default ZendeskWidget;
