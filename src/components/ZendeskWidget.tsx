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

      if (user && profile) {
        // User is logged in - prefill their info and customize experience
        window.zE('webWidget', 'prefill', {
          name: {
            value: profile.full_name || '',
            readOnly: !!profile.full_name,
          },
          email: {
            value: profile.email || user.email || '',
            readOnly: true,
          },
        });

        // Update launcher label for authenticated users
        window.zE('webWidget', 'updateSettings', {
          webWidget: {
            launcher: {
              chatLabel: {
                'en-US': 'Support',
              },
            },
            contactForm: {
              title: {
                'en-US': 'How can we help?',
              },
              fields: [
                { id: 'description', prefill: { '*': '' } },
              ],
            },
          },
        });

        // Identify the user for better support tracking
        window.zE('webWidget', 'identify', {
          name: profile.full_name || 'Vendibook User',
          email: profile.email || user.email || '',
        });
      } else {
        // User is logged out - reset to default
        window.zE('webWidget', 'reset');
        
        window.zE('webWidget', 'updateSettings', {
          webWidget: {
            launcher: {
              chatLabel: {
                'en-US': 'Need Help?',
              },
            },
            contactForm: {
              title: {
                'en-US': 'Contact Vendibook Support',
              },
            },
          },
        });
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
      setTimeout(() => clearInterval(checkInterval), 10000);

      return () => clearInterval(checkInterval);
    }
  }, [user, profile]);

  return null; // This component doesn't render anything
};

export default ZendeskWidget;
