import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    zE?: (...args: any[]) => void;
  }
}

// Only show Zendesk widget on these routes
const ALLOWED_ROUTES = ['/', '/contact', '/help', '/faq'];

const ZendeskWidget = () => {
  const { user, profile } = useAuth();
  const location = useLocation();

  const isAllowedRoute = ALLOWED_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    // Show/hide widget based on route
    if (window.zE) {
      try {
        if (isAllowedRoute) {
          window.zE('messenger', 'show');
        } else {
          window.zE('messenger', 'hide');
        }
      } catch (error) {
        console.debug('Zendesk messenger visibility:', error);
      }
    } else {
      // Wait for Zendesk to load
      const checkInterval = setInterval(() => {
        if (window.zE) {
          try {
            if (isAllowedRoute) {
              window.zE('messenger', 'show');
            } else {
              window.zE('messenger', 'hide');
            }
          } catch (e) {}
          clearInterval(checkInterval);
        }
      }, 500);
      const timeout = setTimeout(() => clearInterval(checkInterval), 10000);
      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [isAllowedRoute, location.pathname]);

  useEffect(() => {
    if (!isAllowedRoute) return;

    const configureWidget = () => {
      if (!window.zE) return;

      try {
        if (user && profile) {
          window.zE('messenger:set', 'conversationFields', [
            { id: 'email', value: profile.email || user.email || '' },
            { id: 'name', value: profile.full_name || '' },
          ]);
          window.zE('messenger:set', 'locale', 'en-US');
        } else {
          window.zE('messenger:set', 'conversationFields', []);
        }
      } catch (error) {
        console.debug('Zendesk Messaging SDK configuration:', error);
      }
    };

    if (window.zE) {
      configureWidget();
    } else {
      const checkInterval = setInterval(() => {
        if (window.zE) {
          configureWidget();
          clearInterval(checkInterval);
        }
      }, 500);

      const timeout = setTimeout(() => clearInterval(checkInterval), 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [user, profile, isAllowedRoute]);

  return null;
};

export default ZendeskWidget;
