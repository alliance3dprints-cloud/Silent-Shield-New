// app/p/[id]/page.tsx
export const dynamic = 'force-dynamic';

// Personal emergency profiles must never be indexed by search engines.
export const metadata = {
  robots: { index: false, follow: false },
};

import { headers } from 'next/headers';
import Link from 'next/link';
import { waitUntil } from '@vercel/functions';
import { Phone, AlertCircle, Heart, ClipboardList, MapPin, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { notifyOwners } from '@/lib/notifications';
import { AddressReveal } from './AddressReveal';

type PublicPageProps = {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

// Link-unfurl / crawler bots fetch the page to build previews — those are not real scans.
function isBotUserAgent(ua: string | null): boolean {
  if (!ua) return true; // no UA is almost always automated
  return /bot|crawler|spider|facebookexternalhit|whatsapp|slackbot|telegrambot|discordbot|twitterbot|linkedinbot|embedly|quora|pinterest|redditbot|applebot|bingpreview|googlebot|semrush|ahrefs|preview|monitor|curl|wget|python-requests|axios|headless/i.test(ua);
}

type AlertBadgeSource = {
  profile_type?: string | null;
  conditions?: string | null;
  allergies?: string | null;
  medications?: string | null;
  critical_notes?: string | null;
  emergency_instructions?: string | null;
  Medical_Info?: string | null;
  Notes?: string | null;
};

function formatCategory(category?: string | null) {
  const map: Record<string, string> = {
    general: 'General Emergency ID',
    child: 'Child Safety',
    adult: 'Adult Emergency ID',
    senior: 'Senior Safety',
    medical: 'Medical Alert',
    autism: 'Autism / Nonverbal',
    disability: 'Disability Support',
    veteran: 'Veteran',
    law_enforcement: 'Law Enforcement',
    first_responder: 'First Responder',
  };

  if (!category) return 'General Emergency ID';
  return map[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function formatDate(date?: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString();
}

function calculateAge(date?: string | null) {
  if (!date) return null;
  const birthDate = new Date(date);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function isNoAllergies(value?: string | null) {
  if (!value) return false;
  const text = value.toLowerCase().trim();

  return (
    text === 'no' ||
    text === 'none' ||
    text === 'n/a' ||
    text === 'na' ||
    text === 'no allergies' ||
    text === 'none listed' ||
    text === 'no known allergies' ||
    text === 'nkda' ||
    text.includes('no known allergies') ||
    text.includes('no allergies') ||
    text.includes('none listed')
  );
}

function digitsOnly(phone?: string | null) {
  return phone ? phone.replace(/\D/g, '') : '';
}

function isInternational(phone?: string | null) {
  return Boolean(phone && phone.trim().startsWith('+') && !phone.trim().startsWith('+1'));
}

function formatPhone(phone?: string | null) {
  if (!phone) return '';

  // Numbers entered with a non-US country code: show exactly as the owner
  // wrote them — never force US formatting onto an international number.
  if (isInternational(phone)) return phone.trim();

  const digits = digitsOnly(phone);

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

function telHref(phone?: string | null) {
  if (!phone) return '#';
  // Preserve a leading + so international numbers dial correctly
  // (tel:+442079460958, not tel:442079460958).
  const plus = phone.trim().startsWith('+') ? '+' : '';
  const digits = digitsOnly(phone);
  return digits ? `tel:${plus}${digits}` : '#';
}

function getFirstLine(value?: string | null) {
  if (!value) return null;
  return value.split('\n').find((line) => line.trim().length > 0)?.trim() || null;
}

// Words that negate a following condition keyword ("no seizures", "denies
// asthma", "heart condition resolved"). Kept conservative so we never hide a
// real condition — only suppress clearly-negated mentions.
const NEGATION_WORDS = [
  'no', 'not', 'without', 'never', 'denies', 'denied', 'negative',
  'free of', 'ruled out', 'absent', 'none',
];
const POST_NEGATIONS = ['resolved', 'ruled out', 'in remission'];

// True only if `keyword` appears in `text` without a negation right before it
// (within ~14 chars) or a clearing word right after it.
function mentions(text: string, keyword: string): boolean {
  let idx = text.indexOf(keyword);
  while (idx !== -1) {
    const before = text.slice(Math.max(0, idx - 14), idx);
    const after = text.slice(idx + keyword.length, idx + keyword.length + 16);
    const negatedBefore = NEGATION_WORDS.some((n) =>
      new RegExp(`\\b${n}\\b[\\s\\w-]{0,10}$`).test(before),
    );
    const clearedAfter = POST_NEGATIONS.some((p) => after.includes(p));
    if (!negatedBefore && !clearedAfter) return true;
    idx = text.indexOf(keyword, idx + keyword.length);
  }
  return false;
}

function buildAlertBadges(data: AlertBadgeSource) {
  const allergiesText = (data.allergies || '').toLowerCase().trim();
  const hasNoAllergies = isNoAllergies(data.allergies);
  const category = (data.profile_type || '').toLowerCase();

  const combinedText = [
    data.conditions,
    data.medications,
    data.critical_notes,
    data.emergency_instructions,
    data.Medical_Info,
    data.Notes,
    hasNoAllergies ? null : data.allergies,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const badges: string[] = [];

  function addBadge(label: string) {
    if (!badges.includes(label)) badges.push(label);
  }

  const has = (kw: string) => mentions(combinedText, kw);

  if (category === 'law_enforcement') addBadge('LAW ENFORCEMENT');
  if (category === 'first_responder') addBadge('FIRST RESPONDER');
  if (category === 'veteran') addBadge('VETERAN');
  if (category === 'medical') addBadge('MEDICAL ALERT');
  if (category === 'senior') addBadge('SENIOR SAFETY');

  if (has('nonverbal') || has('non-verbal')) addBadge('NONVERBAL');
  if (has('autism') || has('autistic')) addBadge('AUTISM');
  if (has('diabetes') || has('diabetic')) addBadge('DIABETIC');
  if (has('insulin')) addBadge('INSULIN');
  if (has('epilepsy') || has('seizure')) addBadge('SEIZURE RISK');

  const hasAllergies = Boolean(allergiesText && !hasNoAllergies);
  if (hasAllergies || has('severe allergy') || has('allergic to')) {
    addBadge('ALLERGY');
  }

  if (has('dementia')) addBadge('DEMENTIA');
  if (has('alzheimer')) addBadge('ALZHEIMER’S');
  if (has('adhd')) addBadge('ADHD');
  if (has('asthma')) addBadge('ASTHMA');
  if (has('heart')) addBadge('HEART CONDITION');
  if (has('deaf') || has('hearing')) addBadge('HEARING IMPAIRED');
  if (has('blind') || has('vision')) addBadge('VISION IMPAIRED');

  return badges.slice(0, 6);
}

export default async function PublicShieldPage({ params, searchParams }: PublicPageProps) {
  const shieldId = params.id;

  // Explicit column list — never selects Edit_pin_hash or owner_email so the
  // public anon key has no path to sensitive fields.
  const { data: rawData, error } = await supabase
    .from('silent_shields')
    .select(
      'id, Activated, Name, Date_of_Birth, photo_url, profile_type, ' +
      'conditions, allergies, medications, blood_type, ' +
      'critical_notes, emergency_instructions, Medical_Info, Notes, ' +
      'Emergency_Contact_Name, Emergency_Contact_Phone, contact_1_relationship, ' +
      'contact_2_name, contact_2_phone, contact_2_relationship, ' +
      'Address, last_updated_at, activated_at'
    )
    .eq('id', shieldId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = rawData as Record<string, any> | null;

  if (error) {
    console.error(error);
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center space-y-3">
          <p className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase">
            Emergency ID
          </p>
          <h1 className="text-2xl font-bold text-white">Silent Shield</h1>
          <p className="text-sm text-slate-300">
            There was a problem loading this Silent Shield. Please try again.
          </p>
        </div>
      </main>
    );
  }

  if (data && data.Activated === true) {
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = headersList.get('user-agent') || null;

    // Suppress false-positive scans:
    //  • bot/crawler/link-unfurl fetches (iMessage, Slack, WhatsApp, search bots)
    //  • the owner previewing their own profile from the dashboard (?owner=1)
    const ownerPreview = searchParams?.owner === '1';
    const isRealScan = !ownerPreview && !isBotUserAgent(userAgent);

    if (isRealScan) {
      // Log the scan and notify owners directly (no fragile internal fetch).
      // waitUntil keeps the serverless function alive until this finishes, so
      // the work isn't dropped when the page response is sent — but it doesn't
      // block the profile from rendering for the responder.
      waitUntil(
        (async () => {
          try {
            const { error: logError } = await supabase
              .from('scan_events')
              .insert({ shield_id: shieldId, ip_address: ip, user_agent: userAgent });
            if (logError) console.error('Scan log failed:', logError);
          } catch (e) {
            console.error('Scan log threw:', e);
          }
          await notifyOwners(shieldId, 'scan');
        })(),
      );
    }
  }

  if (!data || data.Activated !== true) {
    return (
      <main className="relative overflow-hidden min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-6">
        <div className="relative z-10 overflow-hidden animate-fade-up w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-red-500/40 rounded-2xl shadow-2xl p-6 space-y-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-red-500/25 blur-3xl animate-float" />
            <div className="absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl animate-float-slow" />
          </div>
  
          <div className="relative z-10 space-y-6">
            <div className="text-center space-y-5">
              <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
                <div className="absolute h-28 w-28 rounded-full border border-red-500/20 animate-ping" />
                <div className="absolute h-20 w-20 rounded-full border border-red-500/30 animate-pulse" />
  
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/20 animate-hover-icon overflow-hidden">
                  <div className="absolute left-3 right-3 h-[2px] bg-red-300/80 shadow-lg shadow-red-400/80 animate-scan-line" />
  
                  <div className="relative flex items-center justify-center gap-1">
                    <span className="block h-7 w-1.5 rounded-full bg-red-300/90" />
                    <span className="block h-10 w-1.5 rounded-full bg-red-300/70" />
                    <span className="block h-12 w-1.5 rounded-full bg-red-300/50" />
                  </div>
                </div>
              </div>
  
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                NFC Detected
              </p>
              <p className="text-xs text-slate-500">
                Shield ID:{' '}
                <span className="font-mono text-slate-300">{shieldId}</span>
              </p>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Set Up Your Emergency Profile
                </h1>

                <p className="mt-2 text-sm text-slate-300">
                  Add emergency contacts and medical info. Takes less than 2 minutes.
                </p>
              </div>
  
              
            </div>
  
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      <span className="text-sm text-slate-200">
        Takes less than 2 minutes
      </span>
    </div>

    <div className="flex items-center gap-3">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      <span className="text-sm text-slate-200">
        Add emergency contacts
      </span>
    </div>

    <div className="flex items-center gap-3">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      <span className="text-sm text-slate-200">
        Add medical information
      </span>
    </div>

    <div className="flex items-center gap-3">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      <span className="text-sm text-slate-200">
        Update anytime
      </span>
    </div>
  </div>
</div>
  
            <Link
              href={`/activate/${shieldId}`}
              className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition"
            >
              Activate My Silent Shield
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const age = calculateAge(data.Date_of_Birth);
  const lastUpdated = formatDate(data.last_updated_at || data.activated_at);

  const category = formatCategory(data.profile_type);
  const alertBadges = buildAlertBadges(data);

  // Red "Medical Alerts" is reserved for true critical notes. Legacy shields
  // store general medical info in Medical_Info — that renders in a calm,
  // neutral "Medical Information" section instead of the alarming red box.
  const hasCritical = data.critical_notes;
  const hasLegacyMedical = data.Medical_Info;

  const hasMedical =
    data.conditions ||
    (data.allergies && !isNoAllergies(data.allergies)) ||
    data.medications ||
    (data.blood_type && data.blood_type !== 'Unknown');

  const hasInstructions = data.emergency_instructions || data.Notes;

  const showQuickSummary = !hasCritical && !hasLegacyMedical && !hasMedical && !hasInstructions;

  const quickSummaryItems = [
    age !== null ? `Age ${age}` : null,
    category,
    data.blood_type && data.blood_type !== 'Unknown'
      ? `Blood Type ${data.blood_type}`
      : null,
  ].filter(Boolean);

  const quickAction =
    getFirstLine(data.critical_notes) ||
    getFirstLine(data.Medical_Info) ||
    getFirstLine(data.emergency_instructions) ||
    getFirstLine(data.Notes);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4">

        {/* Dark header */}
        <section className="rounded-2xl shadow-lg overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 p-6 text-center space-y-3">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Emergency Profile
          </p>

          <div className="mx-auto h-28 w-28 rounded-full border-2 border-slate-600 bg-slate-700 flex items-center justify-center overflow-hidden ring-4 ring-slate-700 shadow-xl">
            {data.photo_url ? (
              <img
                src={data.photo_url}
                alt={data.Name ? `${data.Name} profile photo` : 'Profile photo'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-slate-300">
                {data.Name ? data.Name.charAt(0).toUpperCase() : 'S'}
              </span>
            )}
          </div>

          {alertBadges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {alertBadges.map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1.5 rounded-lg text-xs font-black tracking-[0.16em] uppercase bg-red-500 text-white shadow-lg shadow-red-500/30"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl font-bold text-white tracking-tight">
            {data.Name || 'Emergency Profile'}
          </h1>

          <p className="text-xs text-slate-400">
            {category}
            {age !== null && ` · Age ${age}`}
            {lastUpdated && ` · Updated ${lastUpdated}`}
          </p>
        </section>

        {/* Call buttons — emergency first */}
        {(data.Emergency_Contact_Phone || data.contact_2_phone) && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            {data.Emergency_Contact_Phone && (
              <a
                href={telHref(data.Emergency_Contact_Phone)}
                className="flex items-center justify-center gap-3 w-full rounded-xl bg-red-500 hover:bg-red-600 text-white text-center py-4 font-bold shadow-xl shadow-red-500/30 ring-2 ring-red-400/50 transition"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Phone className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="text-left">
                  <span className="block text-base uppercase tracking-wide">
                    Call First: {data.contact_1_relationship || 'ICE Contact'}
                  </span>
                  {data.Emergency_Contact_Name && (
                    <span className="block mt-0.5 text-sm font-medium text-red-100">
                      {data.Emergency_Contact_Name}
                    </span>
                  )}
                </span>
              </a>
            )}

            {data.contact_2_phone && (
              <a
                href={telHref(data.contact_2_phone)}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-center py-3.5 font-bold border border-slate-300 transition"
              >
                <Phone className="h-5 w-5 text-slate-600" aria-hidden="true" />
                <span>
                  <span className="block text-sm uppercase tracking-wide">
                    Call Second: {data.contact_2_relationship || 'Backup Contact'}
                  </span>
                  {data.contact_2_name && (
                    <span className="block mt-0.5 text-sm font-medium text-slate-600">
                      {data.contact_2_name}
                    </span>
                  )}
                </span>
              </a>
            )}
          </section>
        )}

        {/* Medical Alerts — red, reserved for true critical notes */}
        {hasCritical && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-red-600 uppercase tracking-[0.14em]">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              Medical Alerts
            </h2>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-base leading-relaxed whitespace-pre-line text-slate-900">
                {data.critical_notes}
              </p>
            </div>
          </section>
        )}

        {/* Medical Information — neutral section for legacy Medical_Info blobs */}
        {hasLegacyMedical && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-700 uppercase tracking-[0.14em]">
              <Heart className="h-5 w-5 text-red-500" aria-hidden="true" />
              Medical Information
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-base leading-relaxed whitespace-pre-line text-slate-900">
                {data.Medical_Info}
              </p>
            </div>
          </section>
        )}

        {/* Health & Safety — structured fields (newer shields) */}
        {hasMedical && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-700 uppercase tracking-[0.14em]">
              <Heart className="h-5 w-5 text-red-500" aria-hidden="true" />
              Health & Safety
            </h2>
            <div className="space-y-3">
              {data.conditions && <InfoCard label="Conditions" value={data.conditions} />}
              {data.allergies && !isNoAllergies(data.allergies) && (
                <InfoCard label="Allergies" value={data.allergies} />
              )}
              {data.medications && <InfoCard label="Medications" value={data.medications} />}
              {data.blood_type && data.blood_type !== 'Unknown' && (
                <InfoCard label="Blood Type" value={data.blood_type} />
              )}
            </div>
          </section>
        )}

        {/* What To Do */}
        {hasInstructions && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-amber-700 uppercase tracking-[0.14em]">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
              What To Do
            </h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              {data.emergency_instructions && (
                <p className="text-base leading-relaxed whitespace-pre-line text-slate-900">
                  {data.emergency_instructions}
                </p>
              )}
              {!data.emergency_instructions && data.Notes && (
                <p className="text-base leading-relaxed whitespace-pre-line text-slate-900">
                  {data.Notes}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Quick Summary — fallback only when no Medical Alerts or Instructions */}
        {showQuickSummary && (quickSummaryItems.length > 0 || quickAction) && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.18em]">
              Quick Summary
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              {quickSummaryItems.length > 0 && (
                <p className="text-sm font-semibold text-slate-800">
                  {quickSummaryItems.join(' • ')}
                </p>
              )}
              {quickAction && (
                <p className="text-sm leading-relaxed text-slate-700">
                  {quickAction}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ICE Contact Details */}
        <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-700 uppercase tracking-[0.14em]">
            <Users className="h-5 w-5 text-slate-500" aria-hidden="true" />
            ICE Contact Details
          </h2>

          {(data.Emergency_Contact_Name || data.Emergency_Contact_Phone) && (
            <ContactCard
              label="Call First"
              relationship={data.contact_1_relationship}
              name={data.Emergency_Contact_Name}
              phone={data.Emergency_Contact_Phone}
            />
          )}

          {(data.contact_2_name || data.contact_2_phone) && (
            <ContactCard
              label="Call Second"
              relationship={data.contact_2_relationship}
              name={data.contact_2_name}
              phone={data.contact_2_phone}
            />
          )}
        </section>

        {/* Address */}
        {data.Address && (
          <section className="rounded-2xl shadow-sm bg-white p-5 space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-700 uppercase tracking-[0.14em]">
              <MapPin className="h-5 w-5 text-slate-500" aria-hidden="true" />
              Address on File
            </h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <AddressReveal address={data.Address} />
            </div>
          </section>
        )}

        <footer className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center space-y-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Protected by Silent Shield</span>
            {' · maintained by caregiver'}
          </p>

          <p className="text-[11px] font-semibold text-red-500 leading-relaxed">
            In a life-threatening emergency, call your local emergency number (911 in the US, 999 in the UK, 112 in the EU).
          </p>

          <div className="flex flex-col items-center gap-2">
            <Link
              href={`/edit/${shieldId}`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Owner? Edit this Silent Shield
            </Link>
            <Link
              href={`/claim/${shieldId}`}
              className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
            >
              Claim it to your account for scan alerts &amp; PIN recovery
            </Link>
            <div className="flex justify-center gap-3 pt-1 text-[11px] text-slate-400">
              <Link href="/account" className="hover:text-slate-600 underline underline-offset-2">Owner Portal</Link>
              <Link href="/privacy" className="hover:text-slate-600 underline underline-offset-2">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-600 underline underline-offset-2">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-base leading-relaxed text-slate-900 whitespace-pre-line">
        {value}
      </p>
    </div>
  );
}

function ContactCard({
  label,
  relationship,
  name,
  phone,
}: {
  label: string;
  relationship?: string | null;
  name?: string | null;
  phone?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      {relationship && (
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-red-600">
          {relationship}
        </p>
      )}

      {name && <p className="mt-1 text-base font-semibold text-slate-900">{name}</p>}

      {phone && (
        <a
          href={telHref(phone)}
          className="mt-1 inline-flex items-center gap-1.5 text-base font-semibold text-red-600 underline underline-offset-2"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          {formatPhone(phone)}
        </a>
      )}
    </div>
  );
}