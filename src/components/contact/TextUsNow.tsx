import { useState } from 'react';
import { Check, Copy, MessageSquareText, Send } from 'lucide-react';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_E164 } from '@/lib/support/contactConfig';

const STARTERS = [
  'I’d like to speak with a customer success rep.',
  'I have a question about buying a listing.',
  'I need help listing my truck, trailer or cart.',
  'I have a question about a rental.',
];

/** `?&body=` is read by both iOS and Android messaging apps. */
export function smsHref(phone: string, body: string) {
  const text = body.trim();
  return text ? `sms:${phone}?&body=${encodeURIComponent(text)}` : `sms:${phone}`;
}

export default function TextUsNow() {
  const [message, setMessage] = useState(`Hi Vendibook! ${STARTERS[0]}`);
  const [copied, setCopied] = useState(false);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_PHONE_DISPLAY);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="text-us" className="vc-wrap vc-text scroll-mt-24" aria-labelledby="vc-text-title">
      <div className="vc-text-panel">
        <div className="vc-text-copy">
          <p className="vc-eyebrow">Text us now</p>
          <h2 id="vc-text-title">Text a customer success rep.</h2>
          <p>
            Write your message here and we’ll open it in your phone’s messages, ready to send. Or text us yourself at the number below.
            A real person on our team replies, usually within 2 hours during business hours.
          </p>
          <div className="vc-text-number">
            <a href={`sms:${SUPPORT_PHONE_E164}`} className="vc-text-digits">{SUPPORT_PHONE_DISPLAY}</a>
            <button type="button" className="vc-text-copybtn" onClick={copyNumber} aria-label="Copy our text number">
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy number'}
            </button>
          </div>
        </div>

        <div className="vc-text-compose">
          <div className="vc-text-chips" role="group" aria-label="Message ideas">
            {STARTERS.map((s) => (
              <button key={s} type="button" className="vc-text-chip" onClick={() => setMessage(`Hi Vendibook! ${s}`)}>
                {s}
              </button>
            ))}
          </div>
          <label htmlFor="vc-text-msg" className="vc-text-label">Your message</label>
          <textarea
            id="vc-text-msg"
            className="vc-text-input"
            rows={4}
            maxLength={600}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <a className="vc-btn is-primary vc-text-send" href={smsHref(SUPPORT_PHONE_E164, message)}>
            <Send className="h-4 w-4" aria-hidden="true" /> Open in my messages
          </a>
          <p className="vc-text-fine">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" /> On a computer? Text {SUPPORT_PHONE_DISPLAY} from your phone. Message and data rates may apply; reply STOP to opt out.
          </p>
        </div>
      </div>
    </section>
  );
}
