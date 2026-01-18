import { useState, useEffect, useMemo } from 'react';
import { Mail, Send, Eye, ChevronDown, Check, Loader2, Edit2, RotateCcw, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Helper to get field type hints
const getFieldType = (key: string, value: unknown): 'text' | 'number' | 'array' | 'textarea' => {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return 'number';
  if (key.toLowerCase().includes('message') || key.toLowerCase().includes('response') || key.toLowerCase().includes('reason')) return 'textarea';
  return 'text';
};

// Helper to format field labels
const formatFieldLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Email template definitions with sample data
const emailTemplates = {
  booking: {
    label: 'Booking Emails',
    templates: [
      {
        id: 'booking_request_host',
        name: 'New Booking Request (to Host)',
        description: 'Sent when a shopper submits a booking request',
        sampleData: {
          bookingRef: 'A1B2C3D4',
          listingTitle: 'Gourmet Food Truck - Austin TX',
          guestName: 'John Smith',
          startDate: 'Monday, February 15, 2025',
          endDate: 'Friday, February 19, 2025',
          totalPrice: 1250,
          message: 'Looking forward to using your truck for our festival!',
        },
      },
      {
        id: 'booking_request_shopper',
        name: 'Booking Request Submitted (to Shopper)',
        description: 'Confirmation sent to shopper after submitting request',
        sampleData: {
          bookingRef: 'A1B2C3D4',
          listingTitle: 'Gourmet Food Truck - Austin TX',
          shopperName: 'John Smith',
          startDate: 'Monday, February 15, 2025',
          endDate: 'Friday, February 19, 2025',
          totalPrice: 1250,
        },
      },
      {
        id: 'booking_approved',
        name: 'Booking Approved',
        description: 'Sent to shopper when host approves the booking',
        sampleData: {
          bookingRef: 'A1B2C3D4',
          listingTitle: 'Gourmet Food Truck - Austin TX',
          shopperName: 'John Smith',
          startDate: 'Monday, February 15, 2025',
          endDate: 'Friday, February 19, 2025',
          totalPrice: 1250,
          hostResponse: 'Great! Looking forward to working with you.',
        },
      },
      {
        id: 'booking_declined',
        name: 'Booking Declined',
        description: 'Sent to shopper when host declines the booking',
        sampleData: {
          bookingRef: 'A1B2C3D4',
          listingTitle: 'Gourmet Food Truck - Austin TX',
          shopperName: 'John Smith',
          startDate: 'Monday, February 15, 2025',
          endDate: 'Friday, February 19, 2025',
          hostResponse: 'Sorry, the truck is already booked for those dates.',
        },
      },
      {
        id: 'booking_confirmation',
        name: 'Booking Confirmation',
        description: 'Detailed confirmation after booking is approved',
        sampleData: {
          bookingRef: 'A1B2C3D4',
          listingTitle: 'Gourmet Food Truck - Austin TX',
          fullName: 'John Smith',
          startDate: '2025-02-15',
          endDate: '2025-02-19',
          totalPrice: 1250,
          hostName: 'Sarah Wilson',
          fulfillmentType: 'pickup',
          address: '123 Main Street, Austin, TX 78701',
        },
      },
    ],
  },
  sale: {
    label: 'Sale Emails',
    templates: [
      {
        id: 'sale_payment_received_buyer',
        name: 'Payment Received (to Buyer)',
        description: 'Sent when buyer completes payment',
        sampleData: {
          listingTitle: 'Commercial Espresso Machine',
          amount: 2500,
          sellerName: 'Mike Johnson',
          fulfillmentType: 'delivery',
        },
      },
      {
        id: 'sale_payment_received_seller',
        name: 'New Sale (to Seller)',
        description: 'Sent to seller when payment is received',
        sampleData: {
          listingTitle: 'Commercial Espresso Machine',
          amount: 2500,
          sellerPayout: 2250,
          buyerName: 'John Smith',
          fulfillmentType: 'delivery',
        },
      },
      {
        id: 'sale_completed',
        name: 'Transaction Complete',
        description: 'Sent when both parties confirm transaction',
        sampleData: {
          listingTitle: 'Commercial Espresso Machine',
          amount: 2500,
          sellerPayout: 2250,
        },
      },
    ],
  },
  account: {
    label: 'Account Emails',
    templates: [
      {
        id: 'welcome_host',
        name: 'Welcome Email (Host)',
        description: 'Sent when a new host signs up',
        sampleData: {
          fullName: 'Sarah Wilson',
          role: 'host',
        },
      },
      {
        id: 'welcome_shopper',
        name: 'Welcome Email (Shopper)',
        description: 'Sent when a new shopper signs up',
        sampleData: {
          fullName: 'John Smith',
          role: 'shopper',
        },
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        description: 'Sent when user requests password reset',
        sampleData: {
          userName: 'John Smith',
          resetLink: 'https://vendibookpreview.lovable.app/reset-password?token=example',
        },
      },
      {
        id: 'stripe_onboarding_reminder',
        name: 'Stripe Onboarding Reminder',
        description: 'Sent to hosts who started but haven\'t completed Stripe setup',
        sampleData: {
          fullName: 'Sarah Wilson',
        },
      },
    ],
  },
  documents: {
    label: 'Document Emails',
    templates: [
      {
        id: 'document_approved',
        name: 'Document Approved',
        description: 'Sent when a document is approved',
        sampleData: {
          documentType: "Driver's License",
          listingTitle: 'Gourmet Food Truck - Austin TX',
        },
      },
      {
        id: 'document_rejected',
        name: 'Document Rejected',
        description: 'Sent when a document is rejected',
        sampleData: {
          documentType: "Driver's License",
          listingTitle: 'Gourmet Food Truck - Austin TX',
          rejectionReason: 'Image is too blurry to read',
        },
      },
      {
        id: 'document_reminder',
        name: 'Document Reminder',
        description: 'Reminder to upload required documents',
        sampleData: {
          listingTitle: 'Gourmet Food Truck - Austin TX',
          requiredDocuments: ["Driver's License", 'Business License'],
          daysRemaining: 3,
        },
      },
    ],
  },
  notifications: {
    label: 'Notification Emails',
    templates: [
      {
        id: 'new_message',
        name: 'New Message',
        description: 'Sent when user receives a new message',
        sampleData: {
          senderName: 'Sarah Wilson',
          messagePreview: 'Hi! I wanted to ask about the availability...',
          listingTitle: 'Gourmet Food Truck - Austin TX',
        },
      },
      {
        id: 'pending_request_reminder',
        name: 'Pending Request Reminder',
        description: 'Reminder to host about pending booking requests',
        sampleData: {
          pendingCount: 3,
          oldestRequest: '2 hours ago',
        },
      },
      {
        id: 'draft_reminder',
        name: 'Draft Listing Reminder',
        description: 'Reminder to complete draft listings',
        sampleData: {
          draftCount: 2,
          draftTitles: ['Food Truck - Dallas', 'Trailer - Houston'],
        },
      },
    ],
  },
};

// Generate HTML for each template
const generateEmailHtml = (templateId: string, data: Record<string, unknown>): string => {
  const logoUrl = 'https://vendibookpreview.lovable.app/images/vendibook-email-logo.png';
  
  const baseStyles = `
    font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f9fafb;
  `;

  const wrapHtml = (content: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @font-face {
          font-family: 'Sofia Pro Soft';
          src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
          font-weight: 300;
          font-style: normal;
        }
      </style>
    </head>
    <body style="${baseStyles}">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://vendibookpreview.lovable.app" style="display: inline-block;">
            <img src="${logoUrl}" alt="VendiBook" style="max-width: 180px; height: auto;" />
          </a>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${content}
          <p style="color: #888; font-size: 14px; margin-top: 30px;">
            — The VendiBook Team<br>
            <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  switch (templateId) {
    case 'booking_request_host':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">New Booking Request 📩</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          You have received a new booking request for <strong>${data.listingTitle}</strong>.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Booking Reference:</strong> #${data.bookingRef}</p>
          <p style="margin: 0 0 10px 0;"><strong>Guest:</strong> ${data.guestName}</p>
          <p style="margin: 0 0 10px 0;"><strong>Dates:</strong> ${data.startDate} - ${data.endDate}</p>
          <p style="margin: 0 0 10px 0;"><strong>Total:</strong> $${data.totalPrice}</p>
          ${data.message ? `<p style="margin: 0;"><strong>Message:</strong> ${data.message}</p>` : ''}
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Please review and respond to this request as soon as possible.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Booking Request
          </a>
        </div>
      `);

    case 'booking_request_shopper':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Booking Request Submitted ✓</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${data.shopperName},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your booking request for <strong>${data.listingTitle}</strong> has been submitted successfully.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Booking Reference:</strong> #${data.bookingRef}</p>
          <p style="margin: 0 0 10px 0;"><strong>Dates:</strong> ${data.startDate} - ${data.endDate}</p>
          <p style="margin: 0;"><strong>Total:</strong> $${data.totalPrice}</p>
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          The host will review your request and respond soon. We'll notify you once they respond.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Booking Status
          </a>
        </div>
      `);

    case 'booking_approved':
      return wrapHtml(`
        <h1 style="color: #16a34a; font-size: 24px; margin: 0 0 20px 0;">Booking Approved! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Great news, ${data.shopperName}!
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your booking for <strong>${data.listingTitle}</strong> has been approved by the host.
        </p>
        <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Booking Reference:</strong> #${data.bookingRef}</p>
          <p style="margin: 0 0 10px 0;"><strong>Confirmed Dates:</strong> ${data.startDate} - ${data.endDate}</p>
          <p style="margin: 0;"><strong>Total:</strong> $${data.totalPrice}</p>
        </div>
        ${data.hostResponse ? `
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Message from host:</p>
            <p style="margin: 0; color: #4a4a4a;">${data.hostResponse}</p>
          </div>
        ` : ''}
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Booking Details
          </a>
        </div>
      `);

    case 'booking_declined':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Booking Not Available</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${data.shopperName},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 12px 0;">
          <strong>Booking Reference:</strong> #${data.bookingRef}
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Unfortunately, the host was unable to approve your booking request for <strong>${data.listingTitle}</strong> for ${data.startDate} - ${data.endDate}.
        </p>
        ${data.hostResponse ? `
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Message from host:</p>
            <p style="margin: 0; color: #4a4a4a;">${data.hostResponse}</p>
          </div>
        ` : ''}
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Don't worry! There are plenty of other great options available. Browse more listings on VendiBook.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/browse" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Browse Listings
          </a>
        </div>
      `);

    case 'booking_confirmation':
      const fulfillmentLabel = data.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup';
      return wrapHtml(`
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 50%; width: 64px; height: 64px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 32px;">✓</span>
          </div>
        </div>
        <h1 style="color: #1a1a1a; font-size: 28px; margin: 0 0 8px 0; text-align: center;">Booking Confirmed!</h1>
        <p style="color: #6b7280; font-size: 16px; text-align: center; margin: 0 0 24px 0;">
          Your booking is all set. Here are your details.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <div style="text-align: center; margin-bottom: 16px;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">BOOKING REFERENCE</p>
            <p style="color: #1f2937; font-size: 16px; margin: 0; font-weight: 600;">#${data.bookingRef}</p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
            <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0;">${data.listingTitle}</h3>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Hosted by ${data.hostName}</p>
          </div>
        </div>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h4 style="color: #166534; margin: 0 0 12px 0;">${fulfillmentLabel} Details</h4>
          <p style="color: #166534; margin: 0;">${data.address || data.deliveryAddress || 'Address provided after booking'}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Booking
          </a>
        </div>
      `);

    case 'sale_payment_received_buyer':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Payment Confirmed! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your payment of <strong>$${(data.amount as number).toLocaleString()}</strong> for <strong>${data.listingTitle}</strong> has been received and is now held in escrow.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 12px;">What's Next?</h3>
          <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Coordinate ${data.fulfillmentType === 'delivery' ? 'delivery' : 'pickup'} with the seller (${data.sellerName})</li>
            <li>Once you receive the item, confirm receipt in your dashboard</li>
            <li>Funds will be released to the seller after both parties confirm</li>
          </ul>
        </div>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 24px;">
          Your payment is protected by our escrow system until the transaction is complete.
        </p>
      `);

    case 'sale_payment_received_seller':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">You Made a Sale! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          <strong>${data.buyerName}</strong> has purchased <strong>${data.listingTitle}</strong> for <strong>$${(data.amount as number).toLocaleString()}</strong>.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 12px;">Transaction Details</h3>
          <table style="width: 100%; color: #4a4a4a;">
            <tr><td style="padding: 8px 0;">Sale Amount:</td><td style="text-align: right;"><strong>$${(data.amount as number).toLocaleString()}</strong></td></tr>
            <tr><td style="padding: 8px 0;">You'll Receive:</td><td style="text-align: right; color: #16a34a;"><strong>$${(data.sellerPayout as number).toLocaleString()}</strong></td></tr>
            <tr><td style="padding: 8px 0;">Fulfillment:</td><td style="text-align: right;">${data.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}</td></tr>
          </table>
        </div>
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="color: #92400e; margin: 0 0 12px;">Next Steps</h3>
          <ol style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Coordinate ${data.fulfillmentType === 'delivery' ? 'delivery' : 'pickup'} with the buyer</li>
            <li>After ${data.fulfillmentType === 'delivery' ? 'delivery' : 'pickup'}, confirm delivery in your dashboard</li>
            <li>Payment will be released once both parties confirm</li>
          </ol>
        </div>
      `);

    case 'sale_completed':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Transaction Complete! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your purchase of <strong>${data.listingTitle}</strong> is now complete. Both parties have confirmed the transaction.
        </p>
        <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: #166534; margin: 0; font-size: 18px; font-weight: 600;">
            ✓ Transaction Completed Successfully
          </p>
        </div>
        <p style="color: #4a4a4a; font-size: 16px;">
          Thank you for using VendiBook! We hope you enjoy your purchase.
        </p>
      `);

    case 'welcome_host':
    case 'welcome_shopper':
      const isHost = templateId === 'welcome_host';
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Welcome to VendiBook! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${data.fullName},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          ${isHost 
            ? "We're thrilled to have you join VendiBook as a host! Get ready to list your equipment and start earning."
            : "We're excited to have you join VendiBook! Start exploring amazing food trucks, trailers, and equipment available for rent or purchase."
          }
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1a1a1a; margin: 0 0 12px;">Getting Started</h3>
          <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.8;">
            ${isHost ? `
              <li>Complete your profile</li>
              <li>Add your first listing</li>
              <li>Set up Stripe to receive payments</li>
            ` : `
              <li>Complete your profile</li>
              <li>Browse available listings</li>
              <li>Save your favorites</li>
            `}
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/${isHost ? 'dashboard' : 'browse'}" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ${isHost ? 'Go to Dashboard' : 'Browse Listings'}
          </a>
        </div>
      `);

    case 'password_reset':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Reset Your Password</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${data.userName || 'there'},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          We received a request to reset your password. Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.resetLink}" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #6a6a6a; font-size: 14px; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email. This link will expire in 24 hours.
        </p>
      `);

    case 'stripe_onboarding_reminder':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Complete Your Payment Setup 💳</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${data.fullName},
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          You're almost ready to start earning on VendiBook! Just one more step - complete your payment setup to receive payments from renters and buyers.
        </p>
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-weight: 600;">
            ⚠️ Your listings won't be visible until payment setup is complete.
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Complete Setup
          </a>
        </div>
      `);

    case 'document_approved':
      return wrapHtml(`
        <h1 style="color: #16a34a; font-size: 24px; margin: 0 0 20px 0;">Document Approved ✓</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your <strong>${data.documentType}</strong> for <strong>${data.listingTitle}</strong> has been reviewed and approved.
        </p>
        <div style="background: #dcfce7; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="color: #166534; margin: 0; font-size: 16px; font-weight: 600;">
            ✓ ${data.documentType} Approved
          </p>
        </div>
      `);

    case 'document_rejected':
      return wrapHtml(`
        <h1 style="color: #dc2626; font-size: 24px; margin: 0 0 20px 0;">Document Needs Attention</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your <strong>${data.documentType}</strong> for <strong>${data.listingTitle}</strong> could not be approved.
        </p>
        <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #991b1b; margin: 0 0 8px 0; font-weight: 600;">Reason:</p>
          <p style="color: #991b1b; margin: 0;">${data.rejectionReason}</p>
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Please upload a new document that addresses the issue above.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Upload New Document
          </a>
        </div>
      `);

    case 'document_reminder':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Document Reminder 📄</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Don't forget to upload your required documents for <strong>${data.listingTitle}</strong>.
        </p>
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0 0 12px 0; font-weight: 600;">Required Documents:</p>
          <ul style="color: #78350f; margin: 0; padding-left: 20px;">
            ${(data.requiredDocuments as string[]).map((doc: string) => `<li>${doc}</li>`).join('')}
          </ul>
          <p style="color: #92400e; margin: 12px 0 0 0; font-weight: 600;">
            ⏰ ${data.daysRemaining} days remaining
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Upload Documents
          </a>
        </div>
      `);

    case 'new_message':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">New Message 💬</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          You have a new message from <strong>${data.senderName}</strong> about <strong>${data.listingTitle}</strong>.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #6a6a6a; margin: 0 0 8px 0; font-size: 14px;">Message preview:</p>
          <p style="color: #1a1a1a; margin: 0; font-style: italic;">"${data.messagePreview}"</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/messages" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Message
          </a>
        </div>
      `);

    case 'pending_request_reminder':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Pending Booking Requests ⏰</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          You have <strong>${data.pendingCount} pending booking request${(data.pendingCount as number) > 1 ? 's' : ''}</strong> waiting for your response.
        </p>
        <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #92400e; margin: 0; font-weight: 600;">
            Oldest request: ${data.oldestRequest}
          </p>
          <p style="color: #78350f; margin: 8px 0 0 0; font-size: 14px;">
            Quick responses lead to more bookings! 🚀
          </p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            View Requests
          </a>
        </div>
      `);

    case 'draft_reminder':
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Complete Your Listings 📝</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          You have <strong>${data.draftCount} draft listing${(data.draftCount as number) > 1 ? 's' : ''}</strong> waiting to be published.
        </p>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="color: #6a6a6a; margin: 0 0 8px 0; font-size: 14px;">Your drafts:</p>
          <ul style="color: #1a1a1a; margin: 0; padding-left: 20px;">
            ${(data.draftTitles as string[]).map((title: string) => `<li>${title}</li>`).join('')}
          </ul>
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          Finish and publish your listings to start receiving bookings!
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://vendibookpreview.lovable.app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Complete Listings
          </a>
        </div>
      `);

    default:
      return wrapHtml(`
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 20px 0;">Email Preview</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Template not found: ${templateId}
        </p>
      `);
  }
};

const EmailPreviewCard = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('booking');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['booking']));
  const [customData, setCustomData] = useState<Record<string, unknown>>({});
  const [isEditingData, setIsEditingData] = useState(false);

  const currentTemplates = emailTemplates[selectedCategory as keyof typeof emailTemplates]?.templates || [];
  const currentTemplate = currentTemplates.find(t => t.id === selectedTemplate);
  
  // Initialize customData when template changes
  useEffect(() => {
    if (currentTemplate) {
      setCustomData({ ...currentTemplate.sampleData });
      setIsEditingData(false);
    }
  }, [selectedTemplate, currentTemplate?.id]);

  // Merge original sample data with custom edits
  const mergedData = useMemo(() => {
    if (!currentTemplate) return {};
    return { ...currentTemplate.sampleData, ...customData };
  }, [currentTemplate, customData]);

  const previewHtml = currentTemplate ? generateEmailHtml(currentTemplate.id, mergedData) : '';

  const hasChanges = useMemo(() => {
    if (!currentTemplate) return false;
    return JSON.stringify(currentTemplate.sampleData) !== JSON.stringify(customData);
  }, [currentTemplate, customData]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleDataChange = (key: string, value: unknown) => {
    setCustomData(prev => ({ ...prev, [key]: value }));
  };

  const handleResetData = () => {
    if (currentTemplate) {
      setCustomData({ ...currentTemplate.sampleData });
      toast.success('Sample data reset to defaults');
    }
  };

  const handleArrayChange = (key: string, index: number, value: string) => {
    const currentArray = Array.isArray(customData[key]) ? [...(customData[key] as string[])] : [];
    currentArray[index] = value;
    handleDataChange(key, currentArray);
  };

  const handleAddArrayItem = (key: string) => {
    const currentArray = Array.isArray(customData[key]) ? [...(customData[key] as string[])] : [];
    currentArray.push('');
    handleDataChange(key, currentArray);
  };

  const handleRemoveArrayItem = (key: string, index: number) => {
    const currentArray = Array.isArray(customData[key]) ? [...(customData[key] as string[])] : [];
    currentArray.splice(index, 1);
    handleDataChange(key, currentArray);
  };

  const [isSendingDigest, setIsSendingDigest] = useState(false);

  const handleSendDailyDigest = async () => {
    setIsSendingDigest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-admin-daily-digest');
      
      if (error) throw error;
      
      toast.success(
        `Daily digest sent! Summary: ${data?.summary?.pendingBookings || 0} bookings, ${data?.summary?.pendingDocuments || 0} documents, ${data?.summary?.activeDisputes || 0} disputes`
      );
    } catch (error: unknown) {
      console.error('Error sending daily digest:', error);
      toast.error('Failed to send daily digest. Check console for details.');
    } finally {
      setIsSendingDigest(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !currentTemplate) {
      toast.error('Please select a template and enter an email address');
      return;
    }

    setIsSending(true);
    try {
      // For testing, we'll use the send-contact-email function with the preview HTML
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          to: testEmail,
          subject: `[TEST] Email Preview - ${currentTemplate.name}`,
          html: previewHtml,
        },
      });

      if (error) throw error;
      toast.success(`Test email sent to ${testEmail}`);
    } catch (error: unknown) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email. Check console for details.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Template Preview
              </CardTitle>
              <CardDescription>
                Preview and test email templates before they're sent to users
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleSendDailyDigest}
              disabled={isSendingDigest}
            >
              {isSendingDigest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Send Daily Digest Now
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Selector */}
            <div className="space-y-4">
              <Label>Select Template</Label>
              <ScrollArea className="h-[500px] rounded-md border p-4">
                <div className="space-y-2">
                  {Object.entries(emailTemplates).map(([category, { label, templates }]) => (
                    <Collapsible
                      key={category}
                      open={expandedCategories.has(category)}
                      onOpenChange={() => toggleCategory(category)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between font-medium"
                          onClick={() => {
                            setSelectedCategory(category);
                            toggleCategory(category);
                          }}
                        >
                          {label}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedCategories.has(category) ? 'rotate-180' : ''
                            }`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 pl-4 pt-1">
                        {templates.map((template) => (
                          <Button
                            key={template.id}
                            variant={selectedTemplate === template.id ? 'secondary' : 'ghost'}
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => {
                              setSelectedCategory(category);
                              setSelectedTemplate(template.id);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              {selectedTemplate === template.id && (
                                <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{template.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </Button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                {currentTemplate && (
                  <Badge variant="outline">{currentTemplate.name}</Badge>
                )}
              </div>
              
              {selectedTemplate ? (
                <div className="border rounded-lg overflow-hidden bg-muted/30">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[500px] bg-white"
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="border rounded-lg h-[500px] flex items-center justify-center bg-muted/30">
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a template to preview</p>
                  </div>
                </div>
              )}

              {/* Test Email Section */}
              {selectedTemplate && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Label>Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendTest}
                        disabled={!testEmail || isSending}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Test
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send a test email to verify how the template looks in an actual email client.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Data Editor Card */}
      {currentTemplate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />
                  Sample Data Editor
                </CardTitle>
                <CardDescription>
                  Edit the sample data to test different scenarios and edge cases
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-mode"
                    checked={isEditingData}
                    onCheckedChange={setIsEditingData}
                  />
                  <Label htmlFor="edit-mode" className="text-sm cursor-pointer">
                    Edit Mode
                  </Label>
                </div>
                {hasChanges && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetData}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(customData).map(([key, value]) => {
                    const fieldType = getFieldType(key, value);
                    
                    return (
                      <div key={key} className={fieldType === 'textarea' || fieldType === 'array' ? 'md:col-span-2' : ''}>
                        <Label className="text-sm font-medium mb-1.5 block">
                          {formatFieldLabel(key)}
                          <span className="text-muted-foreground font-normal ml-2 text-xs">
                            ({fieldType === 'number' ? 'number' : fieldType === 'array' ? 'list' : 'text'})
                          </span>
                        </Label>
                        
                        {fieldType === 'number' ? (
                          <Input
                            type="number"
                            value={value as number}
                            onChange={(e) => handleDataChange(key, parseFloat(e.target.value) || 0)}
                            className="font-mono"
                          />
                        ) : fieldType === 'textarea' ? (
                          <Textarea
                            value={value as string}
                            onChange={(e) => handleDataChange(key, e.target.value)}
                            className="font-mono text-sm min-h-[80px]"
                            placeholder={`Enter ${formatFieldLabel(key).toLowerCase()}...`}
                          />
                        ) : fieldType === 'array' ? (
                          <div className="space-y-2">
                            {(value as string[]).map((item, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={item}
                                  onChange={(e) => handleArrayChange(key, index, e.target.value)}
                                  className="font-mono text-sm"
                                  placeholder={`Item ${index + 1}`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveArrayItem(key, index)}
                                  className="shrink-0"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddArrayItem(key)}
                            >
                              + Add Item
                            </Button>
                          </div>
                        ) : (
                          <Input
                            type="text"
                            value={value as string}
                            onChange={(e) => handleDataChange(key, e.target.value)}
                            className="font-mono text-sm"
                            placeholder={`Enter ${formatFieldLabel(key).toLowerCase()}...`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {hasChanges && (
                  <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">Modified</Badge>
                    <span>Preview updates automatically as you edit</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <pre className="bg-muted rounded-lg p-4 overflow-auto text-sm font-mono">
                  {JSON.stringify(mergedData, null, 2)}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Enable Edit Mode to modify the sample data and test different scenarios.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailPreviewCard;
