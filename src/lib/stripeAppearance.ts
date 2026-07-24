/**
 * Vendibook Satin Lux brand tokens applied to Stripe's Custom Checkout
 * (ui_mode: 'custom') Payment Element via the Appearance API.
 *
 * Docs: https://docs.stripe.com/elements/appearance-api
 */
import type { Appearance, CssFontSource } from '@stripe/stripe-js';

export const stripeAppearance: Appearance = {
  theme: 'night',
  labels: 'floating',
  variables: {
    fontFamily: 'Poppins, system-ui, -apple-system, Segoe UI, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '12px',
    colorPrimary: '#FF5124',
    colorBackground: '#141416',
    colorText: '#F5F5F5',
    colorTextSecondary: '#A1A1AA',
    colorTextPlaceholder: '#6B6B72',
    colorDanger: '#F26D6D',
    colorIconTab: '#A1A1AA',
    colorIconTabSelected: '#FF5124',
    spacingUnit: '4px',
    // Express Checkout Element (Apple Pay / Google Pay / Link) button shape
    buttonBorderRadius: '12px',
  },
  rules: {
    '.Input': {
      backgroundColor: '#0F0F11',
      border: '1px solid #26262B',
      color: '#F5F5F5',
      boxShadow: 'none',
      transition: 'border-color 120ms ease, box-shadow 120ms ease',
    },
    '.Input:focus': {
      border: '1px solid #FF5124',
      boxShadow: '0 0 0 3px rgba(255, 81, 36, 0.28)',
      outline: 'none',
    },
    '.Input--invalid': {
      border: '1px solid #F26D6D',
      boxShadow: '0 0 0 3px rgba(242, 109, 109, 0.24)',
    },
    '.Tab': {
      backgroundColor: '#0F0F11',
      border: '1px solid #26262B',
      color: '#F5F5F5',
    },
    '.Tab:hover': {
      borderColor: '#3A3A42',
      color: '#F5F5F5',
    },
    '.Tab--selected': {
      backgroundColor: 'rgba(255, 81, 36, 0.12)',
      borderColor: '#FF5124',
      color: '#FF5124',
    },
    '.Tab--selected:focus': {
      boxShadow: '0 0 0 3px rgba(255, 81, 36, 0.28)',
    },
    '.Label': {
      color: '#A1A1AA',
      fontWeight: '500',
    },
    '.Label--floating': {
      color: '#A1A1AA',
    },
    '.Block': {
      backgroundColor: '#0F0F11',
      border: '1px solid #26262B',
    },
    '.CodeInput': {
      backgroundColor: '#0F0F11',
      border: '1px solid #26262B',
      color: '#F5F5F5',
    },
    '.Error': {
      color: '#F26D6D',
    },
  },
};

/**
 * Load Poppins inside Stripe's iframe so the Payment Element
 * matches vendibook.com typography.
 */
export const stripeFonts: CssFontSource[] = [
  {
    cssSrc: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
  },
];
