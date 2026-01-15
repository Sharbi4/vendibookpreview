import { 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  FileCheck, 
  Scale, 
  Headphones,
  LucideIcon
} from 'lucide-react';

export interface TrustFAQ {
  question: string;
  answer: string;
}

export interface TrustStep {
  step: number;
  title: string;
  description: string;
}

export interface TrustTile {
  id: string;
  icon: LucideIcon;
  title: string;
  explainer: string;
  modal: {
    title: string;
    description: string[];
    steps: TrustStep[];
    faqs: TrustFAQ[];
    primaryCta: {
      label: string;
      href: string;
      requiresAuth?: boolean;
      authLabel?: string;
      authHref?: string;
    };
    secondaryCta: {
      label: string;
      href: string;
    };
  };
}

export const trustTiles: TrustTile[] = [
  {
    id: 'identity-verified',
    icon: ShieldCheck,
    title: 'Identity Verified',
    explainer: 'Every host completes Stripe Identity verification before listing.',
    modal: {
      title: 'Identity Verified',
      description: [
        'All Vendibook hosts complete government ID verification through Stripe Identity - the same technology trusted by Airbnb, Lyft, and Shopify. This prevents impersonation, builds buyer confidence, and ensures accountability.',
        'Verified sellers earn trust badges that appear on their profile and every listing. For high-value transactions (over $5,000), buyers may also be prompted to verify their identity to protect both parties.',
        'Verification data is processed securely by Stripe and never shared with other users. You control your data, and verification typically completes in under 2 minutes.'
      ],
      steps: [
        { step: 1, title: 'Connect Stripe', description: 'Host creates a Stripe Connect account to receive payments.' },
        { step: 2, title: 'Complete Verification', description: 'Submit government ID and take a selfie via Stripe Identity.' },
        { step: 3, title: 'Earn Your Badge', description: 'Identity Verified badge appears on your profile and listings.' },
        { step: 4, title: 'High-Value Protection', description: 'Some transactions require buyer verification for added security.' }
      ],
      faqs: [
        { question: 'What data is collected during verification?', answer: 'Stripe collects your government ID (front/back) and a live selfie to confirm your identity. Vendibook does not store your ID - only the verification status.' },
        { question: 'How long does verification take?', answer: 'Most verifications complete in under 2 minutes. In rare cases, manual review may take up to 24 hours.' },
        { question: 'What if my verification fails?', answer: 'You can retry with a different ID or contact support. Common issues include blurry photos, expired IDs, or mismatched names.' }
      ],
      primaryCta: { label: 'Learn More', href: '/how-it-works', requiresAuth: true, authLabel: 'Start Listing', authHref: '/create-listing' },
      secondaryCta: { label: 'Contact Support', href: '/contact' }
    }
  },
  {
    id: 'secure-payments',
    icon: CreditCard,
    title: 'Secure Payments',
    explainer: 'Payments processed through Stripe with fraud protection built in.',
    modal: {
      title: 'Secure Payments',
      description: [
        'Every Vendibook transaction is processed through Stripe - the payment infrastructure trusted by millions of businesses worldwide. Your card details are never shared with hosts or stored on our servers.',
        'Stripe fraud detection uses machine learning to identify suspicious activity in real time. Combined with 3D Secure authentication and PCI-compliant encryption, your payment is protected at every step.',
        'You will receive instant email receipts, transaction history in your dashboard, and full visibility into every charge. No surprises, no hidden fees, no off-platform payment requests.'
      ],
      steps: [
        { step: 1, title: 'Checkout Securely', description: 'Enter payment details on our Stripe-powered checkout page.' },
        { step: 2, title: 'Payment Authorized', description: 'Stripe verifies your card and checks for fraud signals.' },
        { step: 3, title: 'Funds Held Safely', description: 'Payment is captured and held until the transaction milestone is met.' }
      ],
      faqs: [
        { question: 'Can I pay off-platform?', answer: 'No. Off-platform payments bypass all buyer protections, escrow, and dispute resolution. We strongly discourage this and cannot assist with off-platform issues.' },
        { question: 'Are fees included in the listed price?', answer: 'Yes. The price you see includes platform fees. Payment processing fees are transparent and shown at checkout.' },
        { question: 'Is my card information stored?', answer: 'Card details are stored securely by Stripe (not Vendibook) if you opt to save your card. You can manage or delete saved cards anytime.' }
      ],
      primaryCta: { label: 'Learn More', href: '/how-it-works', requiresAuth: true, authLabel: 'Start Listing', authHref: '/create-listing' },
      secondaryCta: { label: 'Contact Support', href: '/contact' }
    }
  },
  {
    id: 'escrow-payout',
    icon: Wallet,
    title: 'Escrow + Payout Approval',
    explainer: 'Funds are held until delivery is confirmed by both parties.',
    modal: {
      title: 'Escrow + Payout Approval',
      description: [
        'Vendibook holds buyer funds in escrow until the transaction is complete. For sales, this means delivery and acceptance. For rentals, this means return and condition confirmation. Hosts do not get paid until you are satisfied.',
        'After delivery or pickup, buyers have a 48-hour acceptance window to confirm the asset matches the listing. If no dispute is raised, funds auto-release to the host. This protects both parties without slowing down legitimate transactions.',
        'For rentals, payout triggers after the return date plus condition verification. Damage claims must be filed within 24 hours of return. Clear timelines mean no surprises for anyone.'
      ],
      steps: [
        { step: 1, title: 'Complete Checkout', description: 'Buyer pays at booking. Funds are captured and held securely.' },
        { step: 2, title: 'Asset Handoff', description: 'Delivery, pickup, or rental start date is scheduled between parties.' },
        { step: 3, title: 'Confirm Receipt', description: 'Buyer confirms condition within 48 hours - or window auto-completes.' },
        { step: 4, title: 'Payout Released', description: 'Host receives funds via Stripe after confirmation or window closes.' }
      ],
      faqs: [
        { question: 'When do hosts get paid?', answer: 'For sales: 48 hours after delivery confirmation (or auto-release if no dispute). For rentals: after return date + condition confirmation. Payout arrives in 2-3 business days.' },
        { question: 'What if the buyer does not confirm?', answer: 'If no dispute is raised within the acceptance window, funds auto-release to the host. Buyers are notified before the window closes.' },
        { question: 'What if there is damage during a rental?', answer: 'Hosts must file a damage claim within 24 hours of return, with photo evidence. Vendibook reviews and may hold or adjust the payout accordingly.' }
      ],
      primaryCta: { label: 'Learn More', href: '/how-it-works', requiresAuth: true, authLabel: 'Start Listing', authHref: '/create-listing' },
      secondaryCta: { label: 'Contact Support', href: '/contact' }
    }
  },
  {
    id: 'required-documents',
    icon: FileCheck,
    title: 'Required Documents',
    explainer: 'Verified credentials reduce fraud and protect all parties.',
    modal: {
      title: 'Required Documents',
      description: [
        'Depending on the listing type, hosts and renters may need to upload specific documents. This reduces fraud, ensures compliance, and protects both parties in case of disputes.',
        'Documents are reviewed by Vendibook and stored securely. Only verification status is visible to other users - never the documents themselves. Approved documents unlock trust badges and improve listing visibility.',
        'Expired documents trigger reminders and may pause listings until updated. Keeping your documents current ensures uninterrupted access to the marketplace.'
      ],
      steps: [
        { step: 1, title: 'Upload in Dashboard', description: 'Navigate to your profile and upload required documents.' },
        { step: 2, title: 'Review in Progress', description: 'Status shows Pending while our team verifies authenticity.' },
        { step: 3, title: 'Approval and Badges', description: 'Approved docs unlock badges and increase your trust ranking.' }
      ],
      faqs: [
        { question: 'Who can see my documents?', answer: 'Only Vendibook verification team reviews your documents. Other users see only your verification badges - never the documents themselves.' },
        { question: 'Can I list without documents?', answer: 'Some listings require documents before publishing (e.g., food trucks need food handler cards). Others allow listing but show limited trust badges until documents are verified.' },
        { question: 'How do I update expired documents?', answer: 'Go to your dashboard, remove the expired document, and upload the new version. Re-verification typically takes 24-48 hours.' }
      ],
      primaryCta: { label: 'Verify Documents', href: '/dashboard', requiresAuth: true, authLabel: 'Start Listing', authHref: '/create-listing' },
      secondaryCta: { label: 'Contact Support', href: '/contact' }
    }
  },
  {
    id: 'dispute-resolution',
    icon: Scale,
    title: 'Dispute Resolution',
    explainer: 'Structured process with evidence upload and fair outcomes.',
    modal: {
      title: 'Dispute Resolution',
      description: [
        'When issues arise, Vendibook provides a structured dispute process with clear timelines, evidence requirements, and fair outcomes. Most disputes resolve within 5 business days.',
        'Common dispute types include: item not as described (sales), damage during rental, non-delivery, and cancellation issues. Each type has specific evidence requirements and resolution paths.',
        'Both parties can submit photos, messages, documents, and written statements. Our support team reviews all evidence, contacts parties as needed, and issues a binding resolution per our Terms of Service.'
      ],
      steps: [
        { step: 1, title: 'Open a Dispute', description: 'Go to your transaction page and click Report Issue within the eligible window.' },
        { step: 2, title: 'Submit Evidence', description: 'Upload photos, screenshots, documents, and a written explanation.' },
        { step: 3, title: 'Counterparty Response', description: 'The other party has 48 hours to respond with their evidence.' },
        { step: 4, title: 'Review and Resolution', description: 'Vendibook reviews all evidence and issues a decision within 5 business days.' },
        { step: 5, title: 'Outcome Executed', description: 'Outcomes may include: full refund, partial refund, payout release, or escalation to claims.' }
      ],
      faqs: [
        { question: 'How long do disputes take?', answer: 'Most disputes resolve within 5 business days after both parties submit evidence. Complex cases may take up to 10 business days.' },
        { question: 'What evidence is needed?', answer: 'Photos of the issue, screenshots of listing details, communication records, and any relevant documents (receipts, contracts). More evidence = faster resolution.' },
        { question: 'Can I appeal a decision?', answer: 'Yes. You have 7 days to submit an appeal with new evidence. Appeals are reviewed by a senior support specialist.' }
      ],
      primaryCta: { label: 'Learn More', href: '/how-it-works', requiresAuth: true, authLabel: 'View Transactions', authHref: '/dashboard' },
      secondaryCta: { label: 'Contact Support', href: '/contact' }
    }
  },
  {
    id: 'support-24-7',
    icon: Headphones,
    title: '24/7 Support',
    explainer: 'Real humans available around the clock for urgent issues.',
    modal: {
      title: '24/7 Support',
      description: [
        'Vendibook offers 24/7 support through in-app chat, with priority routing for users with active transactions. During business hours, most inquiries receive a response within 2 hours. Urgent transaction issues are escalated immediately.',
        'Our support flow starts with AI-assisted triage to route you to the right specialist - payments, disputes, listings, or account issues. Complex problems are handed off to human agents without losing context.',
        'For critical issues during active bookings or sales (e.g., lockouts, delivery no-shows), use the Urgent flag in chat to skip the queue. We are here to make sure your transaction completes smoothly.'
      ],
      steps: [
        { step: 1, title: 'Open Chat', description: 'Tap the chat bubble in the app or website footer.' },
        { step: 2, title: 'Select Issue Type', description: 'Choose from: Payments, Delivery, Dispute, or Account.' },
        { step: 3, title: 'AI Triage + Handoff', description: 'Quick questions are answered instantly; complex issues route to a specialist.' }
      ],
      faqs: [
        { question: 'How fast is response time?', answer: 'During business hours: under 2 hours for most inquiries. Active transaction issues: under 30 minutes. Urgent flags: immediate escalation.' },
        { question: 'Do you offer phone support?', answer: 'Phone support is available for escalated disputes and active-transaction emergencies. Request a callback through chat.' },
        { question: 'What if it is urgent mid-transaction?', answer: 'Use the Urgent flag in chat. This bypasses the queue and alerts our on-call team. Reserved for time-sensitive issues during active bookings/sales.' }
      ],
      primaryCta: { label: 'Start Chat', href: '/contact', requiresAuth: false },
      secondaryCta: { label: 'Help Center', href: '/help' }
    }
  }
];

export interface DocumentItem {
  name: string;
  required: boolean;
  note?: string;
}

export interface DocumentChecklist {
  identity: DocumentItem[];
  foodCompliance: DocumentItem[];
  insurance: DocumentItem[];
  ownership: DocumentItem[];
  business: DocumentItem[];
}

export const documentChecklist: DocumentChecklist = {
  identity: [
    { name: 'Driver\'s License', required: true },
    { name: 'Government-issued ID', required: true }
  ],
  foodCompliance: [
    { name: 'Food Handler Card', required: false, note: 'Required for food truck/trailer rentals' },
    { name: 'SafeServe Certification', required: false, note: 'Where applicable by state' }
  ],
  insurance: [
    { name: 'Commercial Liability Insurance', required: false, note: 'Required for some listing types' },
    { name: 'General Liability Insurance', required: false }
  ],
  ownership: [
    { name: 'Title or Bill of Sale', required: false, note: 'For sales listings' },
    { name: 'VIN/Serial Verification', required: false }
  ],
  business: [
    { name: 'EIN/LLC Documentation', required: false, note: 'Unlocks Business Verified badge' }
  ]
};
