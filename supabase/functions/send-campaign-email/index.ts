import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignEmailRequest {
  to: string | string[];
  campaignId: string;
}

const campaigns: Record<string, { subject: string; html: string }> = {
  "vfw-churches-kitchen": {
    subject: "VFWs & churches: earn $2,000/month from your kitchen (Vendibook handles the screening)",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Quick question—does your VFW or church have a commercial kitchen that sits unused during parts of the week?</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Vendibook helps VFWs and churches rent out approved kitchen time to vetted food entrepreneurs for prep, catering, meal prep, and delivery-first concepts. It's a simple way to create reliable revenue while supporting your local community.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/rent-my-commercial-kitchen" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-right: 12px;">List Your Kitchen Free</a>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a;">Book a Free Setup Call</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">What you could earn (simple example)</h2>

  <p style="font-size: 16px; margin-bottom: 20px;">Many hosts earn around <strong>$500/week</strong> renting their kitchen 3 days/week — about <strong>$2,000/month</strong> (500 × 4).<br><em style="color: #666;">(Results vary by city, kitchen setup, and availability.)</em></p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why VFWs & churches like Vendibook</h2>

  <p style="font-size: 15px; color: #666; margin-bottom: 20px;">We do the hard work — you stay in control.</p>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Done-for-you document reviews</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">You choose what renters must provide (business license, insurance, ServSafe/food handler certs, work history, etc.). Vendibook collects and reviews submissions so you don't have to.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Verified renters (optional)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Require Stripe Identity verification so you're only considering verified profiles.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure payments + predictable payouts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Renters pay when they submit a booking request. You review the profile + approved docs, accept the booking, and payouts are initiated at the end of the booking.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Optional deposits for extra protection</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Add a deposit to help protect your kitchen and equipment. If something goes wrong, we can hold the deposit during review to support recovery.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ We help market your kitchen</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Your listing is built to perform in search and in the marketplace—so the right renters can find you faster.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Common ways kitchens get used</h2>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Prep-only time for caterers and meal prep businesses</li>
    <li style="margin-bottom: 8px;">Shared shifts for multiple approved renters</li>
    <li style="margin-bottom: 8px;">Production days for special events and seasonal items</li>
    <li style="margin-bottom: 8px;">Delivery-first brands (ghost kitchen style operations)</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">If you want, I can help you set this up in under 10 minutes (availability, pricing, and the exact documents to require).</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 12px;">Schedule a Free Walkthrough</a>
    <br>
    <a href="https://vendibook.com/list" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a; margin-top: 12px;">Start Your Kitchen Listing</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">Vendibook Customer Success</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
  "houston-restaurants-kitchen": {
    subject: "Your kitchen is already paid for—want it to earn on off-hours?",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="https://vendibook.com" style="text-decoration: none;">
      <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
    </a>
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;">I'm reaching out to Houston restaurant owners who have kitchen time that's underused—slow weekdays, late nights, or off-days.</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Vendibook helps restaurants rent out approved kitchen time to vetted food entrepreneurs for prep, catering, meal prep, and delivery-first concepts. It's a simple way to turn downtime into reliable revenue without adding a long-term tenant.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/rent-my-commercial-kitchen" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-right: 12px;">Create Your Free Kitchen Listing</a>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a;">Set Up a Meeting</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">What you could earn (quick example)</h2>

  <p style="font-size: 16px; margin-bottom: 20px;">Many hosts earn around <strong>$500/week</strong> renting their kitchen about 3 days/week — roughly <strong>$2,000/month</strong> (500 × 4).<br><em style="color: #666;">(Results vary by location, kitchen setup, and availability.)</em></p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why Houston restaurants use Vendibook</h2>

  <p style="font-size: 15px; color: #666; margin-bottom: 20px;">You stay in control. We handle the hard parts.</p>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Done-for-you document reviews</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">You choose requirements (insurance, business license, ServSafe/food handler, work history, etc.). Renters submit documents, and Vendibook reviews them so you don't have to.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Verified renters (optional)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Require Stripe Identity verification to ensure you're working with verified profiles.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Hourly + daily rentals</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Offer prep blocks by the hour or full-day access—whatever works for your operation.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure payments + predictable payouts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Renters pay when they submit a booking request. You review the renter profile + approved docs, accept the booking, and payouts are initiated at the end of the booking.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Optional deposits for protection</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Set a deposit amount to help protect equipment and your space. If something goes wrong, we can hold the deposit during review.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ We help market your kitchen</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Your listing is built to perform in search and in the marketplace so the right renters can find you.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Common use cases we see in Houston</h2>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Prep-only shifts for caterers and meal prep brands</li>
    <li style="margin-bottom: 8px;">Off-day production runs (wholesale, events, seasonal menus)</li>
    <li style="margin-bottom: 8px;">Shared kitchen shifts (multiple approved renters during different blocks)</li>
    <li style="margin-bottom: 8px;">Delivery-first concepts needing a compliant kitchen</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">If you'd like, I can help you get your listing live quickly—pricing, hours, and the exact documents to require for your kitchen.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 12px;">Book a Quick Call</a>
    <br>
    <a href="https://vendibook.com/list" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a; margin-top: 12px;">Start Here</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">Vendibook Customer Success</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
  "restaurants-kitchen": {
    subject: "Your kitchen is already paid for—want it to earn on off-hours?",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="https://vendibook.com" style="text-decoration: none;">
      <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
    </a>
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;">I'm reaching out to restaurant owners who have kitchen time that's underused—slow weekdays, late nights, or off-days.</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Vendibook helps restaurants rent out approved kitchen time to vetted food entrepreneurs for prep, catering, meal prep, and delivery-first concepts. It's a simple way to turn downtime into reliable revenue without adding a long-term tenant.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/rent-my-commercial-kitchen" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-right: 12px;">Create Your Free Kitchen Listing</a>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a;">Set Up a Meeting</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">What you could earn (quick example)</h2>

  <p style="font-size: 16px; margin-bottom: 20px;">Many hosts earn around <strong>$500/week</strong> renting their kitchen about 3 days/week — roughly <strong>$2,000/month</strong> (500 × 4).<br><em style="color: #666;">(Results vary by location, kitchen setup, and availability.)</em></p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why restaurants use Vendibook</h2>

  <p style="font-size: 15px; color: #666; margin-bottom: 20px;">You stay in control. We handle the hard parts.</p>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Done-for-you document reviews</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">You choose requirements (insurance, business license, ServSafe/food handler, work history, etc.). Renters submit documents, and Vendibook reviews them so you don't have to.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Verified renters (optional)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Require Stripe Identity verification to ensure you're working with verified profiles.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Hourly + daily rentals</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Offer prep blocks by the hour or full-day access—whatever works for your operation.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure payments + predictable payouts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Renters pay when they submit a booking request. You review the renter profile + approved docs, accept the booking, and payouts are initiated at the end of the booking.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Optional deposits for protection</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Set a deposit amount to help protect equipment and your space. If something goes wrong, we can hold the deposit during review.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ We help market your kitchen</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Your listing is built to perform in search and in the marketplace so the right renters can find you.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Common use cases</h2>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Prep-only shifts for caterers and meal prep brands</li>
    <li style="margin-bottom: 8px;">Off-day production runs (wholesale, events, seasonal menus)</li>
    <li style="margin-bottom: 8px;">Shared kitchen shifts (multiple approved renters during different blocks)</li>
    <li style="margin-bottom: 8px;">Delivery-first concepts needing a compliant kitchen</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">If you'd like, I can help you get your listing live quickly—pricing, hours, and the exact documents to require for your kitchen.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 12px;">Book a Quick Call</a>
    <br>
    <a href="https://vendibook.com/list" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a; margin-top: 12px;">Start Here</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">Vendibook Customer Success</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
  "vendor-lots": {
    subject: "Turn your parking lot into paid vendor space (we bring vetted vendors)",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="https://vendibook.com" style="text-decoration: none;">
      <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
    </a>
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;">If you have extra space—parking lots, open land, or a designated event area—you can turn it into a steady revenue stream by renting it to food trucks, trailers, and pop-up vendors.</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Vendibook helps businesses list vendor lots and get booking requests from verified vendors—without you chasing people, collecting paperwork, or handling payments manually.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/host/vendor-lots" style="display: inline-block; background: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-right: 12px;">Create Your Free Vendor Lot Listing</a>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #F97316; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #F97316;">Set Up a Meeting</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">What you can do with a vendor lot</h2>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Host food trucks during peak hours (lunch/dinner)</li>
    <li style="margin-bottom: 8px;">Rent spots for weekend pop-ups or recurring markets</li>
    <li style="margin-bottom: 8px;">Offer space for seasonal events and community nights</li>
    <li style="margin-bottom: 8px;">Create a rotating lineup that drives foot traffic to your business</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why businesses list vendor lots on Vendibook</h2>

  <p style="font-size: 15px; color: #666; margin-bottom: 20px;">You stay in control. We handle the heavy lifting.</p>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Done-for-you document reviews</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">You choose what vendors must provide (business license, insurance, permits, food handler certs, etc.). Vendors submit documents and Vendibook reviews them so you don't have to.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Verified vendors (optional)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Require Stripe Identity verification so you're only working with verified profiles.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Set your rules + availability</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Hourly, daily, weekly—set your time blocks, how many spots you have, vendor type limits, and onsite rules.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure payments + predictable payouts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Vendors pay when they submit a booking request. You review the profile + approved docs, accept the booking, and payouts are initiated at the end of the booking.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Optional deposits for extra protection</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Add deposits to help protect your property and ensure vendors follow site rules.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ We help market your lot</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Your listing is built to perform in search and in the marketplace—so vendors can find you quickly.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">The best part: it can increase your core business, too</h2>

  <p style="font-size: 16px; margin-bottom: 16px;">Vendor lots don't just generate rental income—they can:</p>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Bring in new foot traffic</li>
    <li style="margin-bottom: 8px;">Increase repeat visits</li>
    <li style="margin-bottom: 8px;">Create a "destination" feel on slow days</li>
    <li style="margin-bottom: 8px;">Support local small businesses in your community</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">If you tell me what kind of space you have (address + how many spots), I can help you set pricing and the best schedule in under 10 minutes.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/host/vendor-lots" style="display: inline-block; background: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 12px;">Create Your Free Vendor Lot Listing</a>
    <br>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #F97316; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #F97316; margin-top: 12px;">Set Up a Meeting</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">Vendibook Customer Success</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
  "commercial-realestate-kitchens": {
    subject: "Monetize vacant commercial kitchens across your portfolio (we handle screening + payments)",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="https://vendibook.com" style="text-decoration: none;">
      <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
    </a>
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;">If your firm manages properties with commercial kitchens (restaurants, commissaries, church/community kitchens, shared-use spaces, or mobile kitchen pads), Vendibook can help you turn that unused capacity into recurring rental revenue—without adding operational burden to your team.</p>

  <p style="font-size: 16px; margin-bottom: 20px;">Vendibook is a marketplace where vetted food businesses book compliant kitchen time for prep, production, catering, and delivery-first concepts.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://vendibook.com/host/kitchens" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-right: 12px;">List Kitchens for Free</a>
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a;">Set Up a Meeting</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">A simple revenue example</h2>

  <p style="font-size: 16px; margin-bottom: 12px;">Many hosts earn around <strong>$500/week</strong> renting a kitchen about 3 days/week — roughly <strong>$2,000/month</strong> per kitchen (500 × 4).</p>
  <p style="font-size: 14px; color: #666; margin-bottom: 20px;"><em>(Varies by market, kitchen type, and availability.)</em></p>
  <p style="font-size: 16px; margin-bottom: 20px;">Now imagine applying that across multiple kitchens in a portfolio.</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why commercial real estate teams use Vendibook</h2>

  <p style="font-size: 15px; color: #666; margin-bottom: 20px;">You control approvals. We handle the workflow.</p>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Done-for-you document reviews (big time saver)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">You set requirements once (COI/insurance, business license, certifications like ServSafe/food handler, work history, etc.). Renters upload documents and Vendibook reviews them—so your team isn't stuck validating paperwork.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Verified renters (optional)</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Require Stripe Identity verification so you're only considering verified profiles.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Hourly + daily rental options</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Offer shifts, off-hours, or full-day rentals—whatever fits your tenant and operations model.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure payments + predictable payouts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Renters pay when they submit a booking request. You review the renter profile + approved docs, accept, and payouts are initiated at the end of the booking.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Deposits available for protection</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Set deposits to help protect equipment and reduce risk.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ We help market your kitchens</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Each kitchen gets a search-friendly listing page and marketplace exposure to drive qualified demand.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Great fit for kitchens in:</h2>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">Underutilized restaurants (off-days, late nights)</li>
    <li style="margin-bottom: 8px;">Event venues with kitchens</li>
    <li style="margin-bottom: 8px;">Community centers / churches</li>
    <li style="margin-bottom: 8px;">Commissaries and shared-use spaces</li>
    <li style="margin-bottom: 8px;">Properties with buildouts waiting for a tenant</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">If you're open to it, I can help you evaluate a few locations and recommend:</p>

  <ul style="font-size: 15px; color: #444; padding-left: 20px; margin-bottom: 24px;">
    <li style="margin-bottom: 8px;">best availability blocks,</li>
    <li style="margin-bottom: 8px;">pricing strategy by submarket,</li>
    <li style="margin-bottom: 8px;">and a standard document requirements template your team can reuse.</li>
  </ul>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 12px;">Book a Quick Call</a>
    <br>
    <a href="https://vendibook.com/host/kitchens" style="display: inline-block; background: #ffffff; color: #1a1a1a; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #1a1a1a; margin-top: 12px;">Start Here</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">Vendibook Customer Success</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
  "food-truck-manufacturers": {
    subject: "Partner with VendiBook: Connect your buyers with rentable kitchens + lots",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
  
  <div style="text-align: center; margin-bottom: 32px;">
    <a href="https://vendibook.com" style="text-decoration: none;">
      <img src="https://nbrehbwfsmedbelzntqs.supabase.co/storage/v1/object/public/email-assets/vendibook-email-logo.png" alt="VendiBook" style="height: 56px;" />
    </a>
  </div>

  <p style="font-size: 16px; margin-bottom: 20px;">Hi there,</p>

  <p style="font-size: 16px; margin-bottom: 20px;"><strong>You build food trucks. We help your buyers find places to operate them.</strong></p>

  <p style="font-size: 16px; margin-bottom: 20px;">VendiBook is a marketplace that connects food truck operators with:</p>

  <ul style="font-size: 16px; color: #1a1a1a; padding-left: 20px; margin-bottom: 20px;">
    <li style="margin-bottom: 10px;"><strong>Vending lots</strong> — breweries, event venues, office parks, private lots</li>
    <li style="margin-bottom: 10px;"><strong>Commercial kitchens</strong> — for commissary use, prep, and storage</li>
  </ul>

  <p style="font-size: 16px; margin-bottom: 20px;">When your customers buy a truck, their #1 question is: <em>"Where can I park this thing?"</em></p>

  <p style="font-size: 16px; margin-bottom: 20px;">We want to make it easy for you to answer that — and give your buyers a head start on day one.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #F97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">Let's Talk Partnership</a>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Here's what we're thinking</h2>

  <div style="background: #FFF7ED; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0;"><strong>🎁 Exclusive offer for your buyers</strong></p>
      <p style="margin: 0; font-size: 15px; color: #444;">We can create a custom landing page or promo code for your customers — giving them priority access or special perks when they sign up.</p>
    </div>

    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 8px 0;"><strong>📦 Include VendiBook in your delivery package</strong></p>
      <p style="margin: 0; font-size: 15px; color: #444;">Add a one-pager or QR code to your truck handoff docs — so buyers know exactly where to find lots and kitchens from day one.</p>
    </div>

    <div style="margin-bottom: 0;">
      <p style="margin: 0 0 8px 0;"><strong>🤝 Co-marketing opportunities</strong></p>
      <p style="margin: 0; font-size: 15px; color: #444;">We'd love to feature your trucks on our blog, social, and newsletter — and drive traffic back to your business.</p>
    </div>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Why this works for your customers</h2>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Instant access to vending locations</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">No cold-calling property owners. Browse available lots with clear pricing and availability.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Commissary + prep kitchens on-demand</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Find licensed commercial kitchens for prep, storage, and health department compliance.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Secure bookings + verified hosts</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Payments are protected. Hosts are vetted. Everything is tracked in one place.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Flexible terms</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Daily, weekly, or monthly bookings — no long-term commitments required.</p>
  </div>

  <div style="margin-bottom: 16px;">
    <p style="margin: 0 0 8px 0;"><strong>✅ Affirm financing available</strong></p>
    <p style="margin: 0; font-size: 15px; color: #444;">Your buyers can pay over time with Affirm — making it easier to book locations and kitchens without upfront strain on their budget.</p>
  </div>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 16px; margin-bottom: 20px;">I'd love to set up a quick call to explore how we can work together — whether it's a co-branded landing page, a referral program, or just getting your buyers access to our marketplace.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="https://calendar.app.google/FCKSyrLoXUXYHvBGA" style="display: inline-block; background: #F97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 12px;">Schedule a 15-Min Call</a>
    <br>
    <a href="https://vendibook.com" style="display: inline-block; background: #ffffff; color: #F97316; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; border: 2px solid #F97316; margin-top: 12px;">Explore VendiBook →</a>
  </div>

  <p style="font-size: 16px; margin-bottom: 8px;">Best,</p>
  <p style="font-size: 16px; margin-bottom: 4px;"><strong>Alison M</strong></p>
  <p style="font-size: 14px; color: #666; margin: 0;">VendiBook Partnerships</p>

  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

  <p style="font-size: 12px; color: #999; text-align: center;">
    © ${new Date().getFullYear()} VendiBook. All rights reserved.<br>
    <a href="https://vendibook.com/unsubscribe" style="color: #999;">Unsubscribe</a>
  </p>

</body>
</html>
    `,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(resendKey);
    const { to, campaignId }: CampaignEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaign = campaigns[campaignId];
    if (!campaign) {
      return new Response(
        JSON.stringify({ error: `Unknown campaign: ${campaignId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize to array
    const recipients = Array.isArray(to) ? to : [to];
    const results: { email: string; success: boolean; messageId?: string; error?: string }[] = [];

    // Helper to delay between sends (Resend rate limit: 2/sec)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send to each recipient individually with rate limiting
    for (const email of recipients) {
      try {
        const { error: emailError, data } = await resend.emails.send({
          from: "Alison from VendiBook <hello@updates.vendibook.com>",
          to: [email],
          subject: campaign.subject,
          html: campaign.html,
        });

        if (emailError) {
          console.error(`Email send error for ${email}:`, emailError);
          results.push({ email, success: false, error: emailError.message });
        } else {
          console.log(`Campaign email sent to ${email}:`, data?.id);
          results.push({ email, success: true, messageId: data?.id });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        results.push({ email, success: false, error: errMsg });
      }
      
      // Wait 1500ms between sends to stay under Resend rate limit (2 requests/sec)
      await delay(1500);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
