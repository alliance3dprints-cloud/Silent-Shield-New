// app/p/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { Radio } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type PublicPageProps = {
  params: { id: string };
};

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

function formatPhone(phone?: string | null) {
  if (!phone) return '';

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
  const digits = digitsOnly(phone);
  return digits ? `tel:${digits}` : '#';
}

function getFirstLine(value?: string | null) {
  if (!value) return null;
  return value.split('\n').find((line) => line.trim().length > 0)?.trim() || null;
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

  if (category === 'law_enforcement') addBadge('LAW ENFORCEMENT');
  if (category === 'first_responder') addBadge('FIRST RESPONDER');
  if (category === 'veteran') addBadge('VETERAN');
  if (category === 'medical') addBadge('MEDICAL ALERT');
  if (category === 'senior') addBadge('SENIOR SAFETY');

  if (combinedText.includes('nonverbal') || combinedText.includes('non-verbal')) {
    addBadge('NONVERBAL');
  }

  if (combinedText.includes('autism') || combinedText.includes('autistic')) {
    addBadge('AUTISM');
  }

  if (combinedText.includes('diabetes') || combinedText.includes('diabetic')) {
    addBadge('DIABETIC');
  }

  if (combinedText.includes('insulin')) {
    addBadge('INSULIN');
  }

  if (combinedText.includes('epilepsy') || combinedText.includes('seizure')) {
    addBadge('SEIZURE RISK');
  }

  const hasAllergies = Boolean(allergiesText && !hasNoAllergies);

  if (
    hasAllergies ||
    combinedText.includes('severe allergy') ||
    combinedText.includes('allergic to')
  ) {
    addBadge('ALLERGY');
  }

  if (combinedText.includes('dementia')) addBadge('DEMENTIA');
  if (combinedText.includes('alzheimer')) addBadge('ALZHEIMER’S');
  if (combinedText.includes('adhd')) addBadge('ADHD');
  if (combinedText.includes('asthma')) addBadge('ASTHMA');
  if (combinedText.includes('heart')) addBadge('HEART CONDITION');

  if (combinedText.includes('deaf') || combinedText.includes('hearing')) {
    addBadge('HEARING IMPAIRED');
  }

  if (combinedText.includes('blind') || combinedText.includes('vision')) {
    addBadge('VISION IMPAIRED');
  }

  return badges.slice(0, 6);
}

export default async function PublicShieldPage({ params }: PublicPageProps) {
  const shieldId = params.id;

  const { data, error } = await supabase
    .from('silent_shields')
    .select('*')
    .eq('id', shieldId)
    .maybeSingle();

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
                  Silent Shield
                </h1>
  
                <p className="mt-2 text-sm text-slate-300">
                  Let's set up your emergency profile.
                </p>
              </div>
  
              
            </div>
  
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="text-emerald-400 font-bold">✓</span>
      <span className="text-sm text-slate-200">
        Takes less than 2 minutes
      </span>
    </div>

    <div className="flex items-center gap-3">
      <span className="text-emerald-400 font-bold">✓</span>
      <span className="text-sm text-slate-200">
        Add emergency contacts
      </span>
    </div>

    <div className="flex items-center gap-3">
      <span className="text-emerald-400 font-bold">✓</span>
      <span className="text-sm text-slate-200">
        Add medical information
      </span>
    </div>

    <div className="flex items-center gap-3">
      <span className="text-emerald-400 font-bold">✓</span>
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

  const dob = formatDate(data.Date_of_Birth);
  const age = calculateAge(data.Date_of_Birth);
  const lastUpdated = formatDate(data.last_updated_at || data.activated_at);

  const category = formatCategory(data.profile_type);
  const alertBadges = buildAlertBadges(data);

  const hasCritical = data.critical_notes || data.Medical_Info;

  const hasMedical =
    data.conditions ||
    (data.allergies && !isNoAllergies(data.allergies)) ||
    data.medications ||
    (data.blood_type && data.blood_type !== 'Unknown');

  const hasInstructions = data.emergency_instructions || data.Notes;

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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden">
        <section className="p-6 text-center space-y-4 border-b border-slate-800">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Emergency Profile
          </p>

          <div className="mx-auto h-32 w-32 rounded-full border border-slate-600 bg-slate-800 flex items-center justify-center overflow-hidden ring-4 ring-slate-800 shadow-xl">
            {data.photo_url ? (
              <img
                src={data.photo_url}
                alt={data.Name ? `${data.Name} profile photo` : 'Profile photo'}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-slate-400">
                {data.Name ? data.Name.charAt(0).toUpperCase() : 'S'}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {data.Name || 'Emergency Profile'}
            </h1>

            <p className="mt-1 text-xs text-slate-500 tracking-wide">
              Silent Shield Emergency ID
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                {category}
              </span>

              {age !== null && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                  Age {age}
                </span>
              )}

              {dob && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                  DOB: {dob}
                </span>
              )}
            </div>

            {alertBadges.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {alertBadges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1.5 rounded-lg text-xs font-black tracking-[0.16em] uppercase bg-red-500 text-white shadow-lg shadow-red-500/20"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Shield ID: <span className="font-mono text-slate-300">{shieldId}</span>
          </p>
        </section>

        <section className="p-5 space-y-3 border-b border-slate-800">
          {data.Emergency_Contact_Phone && (
            <a
              href={telHref(data.Emergency_Contact_Phone)}
              className="block w-full rounded-xl bg-red-500 hover:bg-red-600 text-white text-center py-3 font-bold shadow-lg shadow-red-500/20 transition"
            >
              <span className="block uppercase tracking-wide">
                Call First: {data.contact_1_relationship || 'ICE Contact'}
              </span>
              {data.Emergency_Contact_Name && (
                <span className="block mt-0.5 text-sm font-medium text-red-100">
                  {data.Emergency_Contact_Name}
                </span>
              )}
            </a>
          )}

          {data.contact_2_phone && (
            <a
              href={telHref(data.contact_2_phone)}
              className="block w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-center py-3 font-bold border border-slate-700 transition"
            >
              <span className="block uppercase tracking-wide">
                Call Second: {data.contact_2_relationship || 'Backup Contact'}
              </span>
              {data.contact_2_name && (
                <span className="block mt-0.5 text-sm font-medium text-slate-300">
                  {data.contact_2_name}
                </span>
              )}
            </a>
          )}
        </section>

        {(quickSummaryItems.length > 0 || quickAction) && (
          <section className="p-5 space-y-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.18em]">
              Quick Summary
            </h2>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 space-y-2">
              {quickSummaryItems.length > 0 && (
                <p className="text-sm font-semibold text-slate-100">
                  {quickSummaryItems.join(' • ')}
                </p>
              )}

              {quickAction && (
                <p className="text-sm leading-relaxed text-slate-300">
                  {quickAction}
                </p>
              )}
            </div>
          </section>
        )}

        {data.Address && (
          <section className="p-5 space-y-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.18em]">
              Address on File
            </h2>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {data.Address}
              </p>
            </div>
          </section>
        )}

        {hasCritical && (
          <section className="p-5 space-y-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-red-300 uppercase tracking-[0.18em]">
              Medical Alerts
            </h2>

            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              {data.critical_notes && (
                <p className="text-base leading-relaxed whitespace-pre-line text-white">
                  {data.critical_notes}
                </p>
              )}

              {!data.critical_notes && data.Medical_Info && (
                <p className="text-base leading-relaxed whitespace-pre-line text-white">
                  {data.Medical_Info}
                </p>
              )}
            </div>
          </section>
        )}

        {hasMedical && (
          <section className="p-5 space-y-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.18em]">
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

        {hasInstructions && (
          <section className="p-5 space-y-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-yellow-300 uppercase tracking-[0.18em]">
              What To Do
            </h2>

            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
              {data.emergency_instructions && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-100">
                  {data.emergency_instructions}
                </p>
              )}

              {!data.emergency_instructions && data.Notes && (
                <p className="text-sm leading-relaxed whitespace-pre-line text-slate-100">
                  {data.Notes}
                </p>
              )}
            </div>
          </section>
        )}

        <section className="p-5 space-y-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.18em]">
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

        <footer className="p-5 text-center space-y-3">
          <p className="text-xs text-slate-500">Silent Shield Emergency ID</p>

          {lastUpdated && (
            <p className="text-xs text-slate-500">Last updated: {lastUpdated}</p>
          )}

          <p className="text-[11px] text-slate-600 leading-relaxed">
            Profile maintained by owner/caregiver. In an emergency, call 911 or follow local emergency protocols.
          </p>

          <Link
            href={`/edit/${shieldId}`}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
          >
            Update this profile
          </Link>
        </footer>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-100 whitespace-pre-line">
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
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {relationship && (
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-red-300">
          {relationship}
        </p>
      )}

      {name && <p className="mt-1 text-sm font-semibold text-white">{name}</p>}

      {phone && (
        <a
          href={telHref(phone)}
          className="mt-1 inline-block text-sm font-semibold text-red-300 underline underline-offset-2"
        >
          {formatPhone(phone)}
        </a>
      )}
    </div>
  );
}