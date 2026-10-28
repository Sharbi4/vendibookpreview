import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Loader2, MessageSquareText, Phone, PhoneCall, Sparkles } from 'lucide-react';
import SEO from '@/components/SEO';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { startAllison } from '@/lib/atlas/allisonConfig';
import { instantAnswers } from '@/lib/support/instantAnswers';
import { CUSTOMER_SUCCESS_MEETING_URL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_E164 } from '@/lib/support/contactConfig';
import { followUpDueAt, formatEt, inFollowUpHours } from '../../supabase/functions/_shared/followUpWindow';
import { trackFormSubmit } from '@/lib/analytics';
import { trackFormSubmitConversion } from '@/lib/gtagConversions';
import './contact.css';

type Way = 'phone' | 'text' | 'email';
const TIMES = ['As soon as possible', 'Morning (8–12)', 'Afternoon (12–5)', 'Evening (5–8)'];
const WAYS: Array<{ id: Way; label: string }> = [
  { id: 'phone', label: 'Call me' },
  { id: 'text', label: 'Text me' },
  { id: 'email', label: 'Email me' },
];

interface Saved { reference_code: string; follow_up_by: string; team_open_now: boolean }

function Choice({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="vc-choice" onClick={onSelect}>
      {children}
    </button>
  );
}

export default function Contact() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [time, setTime] = useState(TIMES[0]);
  const [specificTime, setSpecificTime] = useState('');
  const [way, setWay] = useState<Way>('phone');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Saved | null>(null);

  // Signed-in members: they have an account and we know their email.
  useEffect(() => {
    if (!user) return;
    setHasAccount(true);
    setEmail((e) => e || user.email || '');
  }, [user]);

  const now = new Date();
  const openNow = inFollowUpHours(now);
  const nextBy = formatEt(followUpDueAt(now));

  // Instant answers from the reviewed support FAQ while they type (debounced).
  const [typed, setTyped] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setTyped(comments), 450);
    return () => window.clearTimeout(t);
  }, [comments]);
  const answers = useMemo(() => instantAnswers(typed), [typed]);

  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please tell us your name.');
    if (way !== 'email' && !phoneOk) return setError('Please add the best number to reach you.');
    if (way === 'email' && !emailOk) return setError('Please add your email address.');
    if (email.trim() && !emailOk) return setError('That email address doesn’t look right.');
    setBusy(true);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { data, error: failed } = await invokeEdge<Saved>('schedule-callback', {
      body: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        has_account: hasAccount,
        best_time: [specificTime.trim() || time, zone && `(${zone})`].filter(Boolean).join(' '),
        preferred_contact: way,
        comments: comments.trim(),
        source: 'contact-page',
        page_url: window.location.href,
      },
    }, { retries: 0, timeoutMs: 20000 });
    setBusy(false);
    if (failed || !data?.reference_code) {
      trackFormSubmit('contact_callback', false, { error: 'submission_failed' });
      setError(failed || `We couldn’t save your request. Please call or text ${SUPPORT_PHONE_DISPLAY}.`);
      return;
    }
    trackFormSubmit('contact_callback', true);
    trackFormSubmitConversion({ form_type: 'contact' });
    setSaved(data);
  };

  const meetingFallback = () => startAllison('text', 'I’d like to book the 30-minute Customer Success Meeting with the Vendibook team.');

  return (
    <div className="vb-contact min-h-screen flex flex-col">
      <SEO
        title="Contact Vendibook | Call, Text, Book a Meeting or Get a Callback"
        description={`Talk to Vendibook any time: call or text ${SUPPORT_PHONE_DISPLAY}, book a 30-minute customer success meeting, chat with Allison, or request a callback within 2 business hours.`}
        canonical="/contact"
      />
      <Header />

      <main className="flex-1">
        <section className="vc-hero">
          <div className="vc-wrap">
            <p className="vc-eyebrow">Vendibook support</p>
            <h1>We’re here for you, <em>every step of the way.</em></h1>
            <p className="vc-lede">
              We’re food business owners and entrepreneurs ourselves, with years of running trucks, trailers and kitchens.
              Call, text, book a meeting or ask Allison. A real person is always within reach.
            </p>
            <p className="vc-status" role="status">
              <span className={`vc-dot ${openNow ? 'is-open' : ''}`} aria-hidden="true" />
              {openNow ? 'Our team is in now. Callbacks within 2 hours.' : `Our team is offline. Request a callback and we’ll reach you by ${nextBy}.`}
              <span className="hidden sm:inline text-[#9a958e]">Mon–Fri 8 AM–8 PM ET</span>
            </p>
          </div>
        </section>

        <section className="vc-wrap" aria-label="Ways to reach us">
          <div className="vc-ways">
            <a className="vc-card" href={`tel:${SUPPORT_PHONE_E164}`}>
              <span className="vc-card-icon"><Phone className="h-5 w-5" aria-hidden="true" /></span>
              <h3>Call {SUPPORT_PHONE_DISPLAY}</h3>
              <p>Answered 24/7. Our phone assistant helps right away and connects you with a person whenever you want one.</p>
              <span className="vc-card-go">Call now <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </a>
            <a className="vc-card" href={`sms:${SUPPORT_PHONE_E164}`}>
              <span className="vc-card-icon"><MessageSquareText className="h-5 w-5" aria-hidden="true" /></span>
              <h3>Text {SUPPORT_PHONE_DISPLAY}</h3>
              <p>Prefer texting? Send us a message any time and get help right in your messages.</p>
              <span className="vc-card-go">Send a text <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </a>
            <a className="vc-card" href="#meeting">
              <span className="vc-card-icon"><CalendarClock className="h-5 w-5" aria-hidden="true" /></span>
              <h3>Book a 30-minute meeting</h3>
              <p>Pick a time for a Customer Success Meeting with our team to plan your purchase, listing or launch.</p>
              <span className="vc-card-go">See times <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </a>
            <button type="button" className="vc-card" onClick={() => startAllison('voice')}>
              <span className="vc-card-icon"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
              <h3>Talk to Allison</h3>
              <p>Our AI support assistant sorts most questions in minutes, by voice or by typing, and can bring in our team.</p>
              <span className="vc-card-go">Start talking <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
            </button>
          </div>
        </section>

        <section id="callback" className="vc-wrap vc-main scroll-mt-24" aria-label="Request a callback">
          <div className="vc-panel">
            {saved ? (
              <div className="vc-done" role="status">
                <span className="vc-done-badge"><CheckCircle2 className="h-7 w-7" aria-hidden="true" /></span>
                <h2>You’re all set, {name.trim().split(' ')[0]}.</h2>
                <p className="vc-panel-sub">
                  A real person from our team will {way === 'email' ? 'email' : way === 'text' ? 'text' : 'call'} you by <b>{saved.follow_up_by}</b>.
                  {!saved.team_open_now && ' We’re offline right now, so you’re first in line when we open.'}
                  {' '}Need us sooner? Call or text {SUPPORT_PHONE_DISPLAY} any time.
                </p>
                <span className="vc-ref">Reference {saved.reference_code}</span>
                <div className="vc-allison-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="vc-btn is-dark" onClick={() => startAllison('text', comments)}>
                    Ask Allison while you wait
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="vc-eyebrow">Callback within 2 business hours</p>
                <h2 style={{ marginTop: 10 }}>Request a callback</h2>
                <p className="vc-panel-sub">Tell us how to reach you and what’s going on. A real person calls back within 2 business hours (Mon–Fri 8 AM–8 PM ET).</p>
                <form className="vc-form" onSubmit={submit} noValidate>
                  <div className="vc-row">
                    <label className="vc-field">
                      <span>Your name</span>
                      <input className="vc-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} required />
                    </label>
                    <label className="vc-field">
                      <span>Best callback number {way === 'email' && <small>(optional)</small>}</span>
                      <input className="vc-input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} placeholder="(555) 555-0123" aria-invalid={Boolean(phone) && !phoneOk} />
                    </label>
                  </div>

                  <div role="radiogroup" aria-labelledby="vc-account">
                    <span className="vc-legend" id="vc-account">Do you have a Vendibook account?</span>
                    <div className="vc-choices">
                      <Choice checked={hasAccount === true} onSelect={() => setHasAccount(true)}>Yes</Choice>
                      <Choice checked={hasAccount === false} onSelect={() => setHasAccount(false)}>No</Choice>
                    </div>
                  </div>

                  <label className="vc-field">
                    <span>
                      {hasAccount ? 'Email on your account' : 'Email'}{' '}
                      {way !== 'email' && <small>(optional{hasAccount ? ', helps us find your account' : ''})</small>}
                    </span>
                    <input className="vc-input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} placeholder="you@example.com" aria-invalid={Boolean(email) && !emailOk} />
                  </label>

                  <div role="radiogroup" aria-labelledby="vc-time">
                    <span className="vc-legend" id="vc-time">Best time to reach you <small className="font-normal text-[#74716d]">(your time)</small></span>
                    <div className="vc-choices">
                      {TIMES.map((t) => <Choice key={t} checked={!specificTime && time === t} onSelect={() => { setTime(t); setSpecificTime(''); }}>{t}</Choice>)}
                    </div>
                    <input className="vc-input" style={{ marginTop: 10 }} value={specificTime} onChange={(e) => setSpecificTime(e.target.value)} maxLength={80} placeholder="Or a specific day and time, e.g. Tuesday after 3 PM" aria-label="Specific day and time" />
                  </div>

                  <div role="radiogroup" aria-labelledby="vc-way">
                    <span className="vc-legend" id="vc-way">How should we follow up?</span>
                    <div className="vc-choices">
                      {WAYS.map((w) => <Choice key={w.id} checked={way === w.id} onSelect={() => setWay(w.id)}>{w.label}</Choice>)}
                    </div>
                  </div>

                  <label className="vc-field">
                    <span>How can we help?</span>
                    <textarea className="vc-input" value={comments} onChange={(e) => setComments(e.target.value)} maxLength={1500} placeholder="e.g. I’m buying my first food trailer and want to know how the walkthrough works" />
                  </label>

                  <div aria-live="polite">
                    {answers.length > 0 && (
                      <div className="vc-answers">
                        <h4><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> This might help right now</h4>
                        <dl>
                          {answers.map((a) => (
                            <div key={a.question}>
                              <dt>{a.question}</dt>
                              <dd>{a.answer}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="vc-answers-actions">
                          <button type="button" className="vc-link" onClick={() => startAllison('text', comments)}>Ask Allison a follow-up</button>
                          <span className="text-[#74716d]">Still want a call? Just send your request below.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {error && <p className="vc-error" role="alert">{error}</p>}
                  <button type="submit" className="vc-submit" disabled={busy}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PhoneCall className="h-4 w-4" aria-hidden="true" />}
                    {busy ? 'Sending…' : 'Request my callback'}
                  </button>
                  <p className="vc-fine">
                    By sending this you ask Vendibook to contact you about this request by the method you chose.
                    {way === 'text' && ` Texts come from ${SUPPORT_PHONE_DISPLAY}; message and data rates may apply; reply STOP to opt out.`}
                    {' '}This doesn’t sign you up for marketing. See our <Link to="/privacy" className="underline">privacy policy</Link>.
                  </p>
                </form>
              </>
            )}
          </div>

          <aside className="vc-side">
            <div className="vc-panel">
              <h2 style={{ fontSize: 22 }}>What happens next</h2>
              <ol className="vc-steps">
                <li><b>We save your request</b> and the whole team is notified right away.</li>
                <li><b>A real person reaches out</b> within 2 business hours, at the time and in the way you asked.</li>
                <li><b>We stay with you</b> until it’s sorted, whether that’s a listing, a purchase, a rental or getting paid.</li>
              </ol>
            </div>
            <div className="vc-allison">
              <p className="vc-eyebrow" style={{ color: '#ffb59c', marginTop: 0 }}>Can’t wait? Ask Allison now</p>
              <h2>Answers in minutes, day or night.</h2>
              <p>Allison is our AI support assistant. She can explain buying and renting, help troubleshoot, and set up a callback or meeting with our team.</p>
              <div className="vc-allison-actions">
                <button type="button" className="vc-btn is-primary" onClick={() => startAllison('voice', comments)}>Talk to Allison</button>
                <button type="button" className="vc-btn is-ghost" onClick={() => startAllison('text', comments)}>Type instead</button>
              </div>
            </div>
          </aside>
        </section>

        <section id="meeting" className="vc-wrap vc-meeting" aria-labelledby="vc-meeting-title">
          <div className="vc-meeting-head">
            <div>
              <p className="vc-eyebrow">Customer Success Meeting · 30 minutes</p>
              <h2 id="vc-meeting-title">Sit down with our team.</h2>
              <p>Planning a purchase, a listing or your launch? Book 30 minutes with someone who has been there. Pick any open time.</p>
            </div>
            {!CUSTOMER_SUCCESS_MEETING_URL && (
              <button type="button" className="vc-btn is-dark" onClick={meetingFallback}>
                <CalendarClock className="h-4 w-4" aria-hidden="true" /> Find a time with Allison
              </button>
            )}
          </div>
          {CUSTOMER_SUCCESS_MEETING_URL && (
            <div className="vc-meeting-frame">
              <iframe
                title="Book a 30-minute Customer Success Meeting"
                src={`${CUSTOMER_SUCCESS_MEETING_URL}?hide_gdpr_banner=1&primary_color=ff5124${name ? `&name=${encodeURIComponent(name)}` : ''}${emailOk ? `&email=${encodeURIComponent(email.trim())}` : ''}`}
                loading="lazy"
              />
            </div>
          )}
        </section>

        <section className="vc-wrap vc-promise" aria-label="Our promise">
          <div>
            <h3>Real people, real experience</h3>
            <p>Our team has run food trucks, trailers and kitchens. We know what a slow season, a failed inspection or a first sale feels like.</p>
          </div>
          <div>
            <h3>Always a way to reach us</h3>
            <p>Call or text {SUPPORT_PHONE_DISPLAY} 24/7, talk to Allison, or ask for a person. During business hours we call back within 2 hours.</p>
          </div>
          <div>
            <h3>Answers on your own time</h3>
            <p>Browse guides and policies in the <Link to="/help" className="underline">Help Center</Link>, or read <Link to="/how-purchasing-works" className="underline">how buying works</Link> with Purchase Protection.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
