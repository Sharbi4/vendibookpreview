import { marketingShell, mkButton, esc, MK, FONT } from './brand.ts';
import { ROLE_CONTENT, type UpdateRole } from '../updatePreferences.ts';

export function updateConfirmationEmail(input: { name: string; role: UpdateRole; zip: string; topics: string[]; confirmUrl: string; unsubscribeUrl: string }) {
  const content = ROLE_CONTENT[input.role];
  const topics = input.topics.map(t => ({ listings: 'Local listings', regulations: 'Regulatory updates', news: 'Industry news' }[t] || t)).join(' · ');
  const title = 'One last step. Make it yours.';
  const html = marketingShell({ title, preheader: 'Confirm your Vendibook updates and save your preferences.', unsubscribeUrl: input.unsubscribeUrl,
    footerNote: 'You requested these updates on Vendibook. If this wasn’t you, ignore this email or unsubscribe.',
    bodyRows: `<tr><td style="padding:32px 32px 12px;font-family:${FONT};">
      <p style="font-size:11px;letter-spacing:2px;font-weight:700;color:${MK.orangeOnWhite};margin:0 0 18px;">THE VENDIBOOK EDIT</p>
      <h1 style="font-size:34px;line-height:1.13;letter-spacing:-1px;color:${MK.text};margin:0 0 20px;">${title}</h1>
      <p style="font-size:16px;line-height:1.7;color:${MK.textSecondary};margin:0 0 24px;">${input.name ? `${esc(input.name)}, your` : 'Your'} next chapter deserves a better inbox. Confirm your email to save the updates you chose.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#25221e;border:1px solid #443c32;border-radius:18px;box-shadow:0 10px 22px #ded7cc;"><tr><td style="padding:26px;">
      <p style="color:#e9c9a5;font-size:11px;letter-spacing:2px;margin:0 0 12px;">CURATED FOR ${esc(input.role.toUpperCase())}S</p>
      <h2 style="color:#fff8ed;font-size:24px;line-height:1.3;margin:0 0 14px;">${content.title}</h2>
      <p style="color:#ded5c8;font-size:14px;line-height:1.7;margin:0;">${esc(topics)}<br>Near ZIP ${esc(input.zip)}</p>
      </td></tr></table>
      <p style="font-size:14px;line-height:1.7;color:${MK.textSecondary};margin:26px 0 20px;">${content.detail} Your preferences help us choose what is relevant to you.</p>
      ${mkButton('Confirm my updates', input.confirmUrl)}
      <p style="font-size:12px;line-height:1.7;color:${MK.textMuted};margin:20px 0;">This confirmation link expires in 24 hours. Email confirmation does not turn on texts. If you requested SMS, you’ll verify your number separately. Regulatory updates are general information, not legal advice.</p>
      </td></tr>` });
  return { html, text: `${title}\nConfirm your Vendibook updates: ${input.confirmUrl}\n${content.title}\n${topics} near ZIP ${input.zip}.\nEmail confirmation does not activate texts.\nUnsubscribe: ${input.unsubscribeUrl}` };
}
