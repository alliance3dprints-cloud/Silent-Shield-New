// app/activate/[id]/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ActivatePageProps = {
  params: { id: string };
};

const inputClassName =
  'w-full border border-slate-700 bg-slate-900/60 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/60';

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function uploadProfilePhoto(shieldId: string, file: File) {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '');
  const filePath = `${shieldId}/${Date.now()}.${cleanExt}`;

  const { error } = await supabase.storage
    .from('shield-profile-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('shield-profile-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export default function ActivateShieldPage({ params }: ActivatePageProps) {
  const shieldId = params.id;

  const [category, setCategory] = useState('general');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerEmailConsent, setOwnerEmailConsent] = useState(false);

  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [contact1Relationship, setContact1Relationship] = useState('');

  const [contact2Name, setContact2Name] = useState('');
  const [contact2Phone, setContact2Phone] = useState('');
  const [contact2Relationship, setContact2Relationship] = useState('');

  const [conditions, setConditions] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [bloodType, setBloodType] = useState('');

  const [criticalNotes, setCriticalNotes] = useState('');
  const [emergencyInstructions, setEmergencyInstructions] = useState('');

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [status, setStatus] =
    useState<'idle' | 'activating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);

    if (!file) {
      setPhotoPreview(null);
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
  }

  function validateForm() {
    if (ownerEmail && !ownerEmailConsent) {
      setErrorMessage('Please check the email consent box or leave the email field blank.');
      return false;
    }

    if (!pin || !confirmPin) {
      setErrorMessage('Please create and confirm a PIN.');
      return false;
    }

    if (pin !== confirmPin) {
      setErrorMessage('PINs do not match.');
      return false;
    }

    if (pin.length < 4 || pin.length > 10) {
      setErrorMessage('PIN should be between 4 and 10 digits/characters.');
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) return;

    setShowDisclaimer(true);
  }

  async function activateShield() {
    setShowDisclaimer(false);
    setStatus('activating');
    setErrorMessage(null);

    try {
      const pinHash = await hashPin(pin);
      const photoUrl = photoFile ? await uploadProfilePhoto(shieldId, photoFile) : null;

      const { error } = await supabase.from('silent_shields').insert([
        {
          id: shieldId,

          profile_type: category || 'general',
          Name: name || null,
          Date_of_Birth: dob || null,
          Address: address || null,
          photo_url: photoUrl,

          owner_email: ownerEmail || null,
          owner_email_consent: ownerEmail ? ownerEmailConsent : false,

          Emergency_Contact_Name: emName || null,
          Emergency_Contact_Phone: emPhone || null,
          contact_1_relationship: contact1Relationship || null,

          contact_2_name: contact2Name || null,
          contact_2_phone: contact2Phone || null,
          contact_2_relationship: contact2Relationship || null,

          conditions: conditions || null,
          allergies: allergies || null,
          medications: medications || null,
          blood_type: bloodType || null,

          critical_notes: criticalNotes || null,
          emergency_instructions: emergencyInstructions || null,

          Activated: true,
          activated_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          Edit_pin_hash: pinHash,
        },
      ]);

      if (error) {
        if (error.message.includes('duplicate key') || error.code === '23505') {
          setStatus('error');
          setErrorMessage('This Silent Shield has already been activated. Go to the edit page to update your profile.');
        } else {
          console.error(error);
          setStatus('error');
          setErrorMessage('Activation failed. Please check your connection and try again. If this keeps happening, contact support@alliance3dprints.com.');
        }
        return;
      }

      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage('Activation failed. Please check your connection and try again. If this keeps happening, contact support@alliance3dprints.com.');
    }
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-6">
        <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-emerald-500/40 shadow-2xl px-6 py-7 space-y-6 text-slate-100 text-center">
          <div className="space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/40">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-8 w-8 text-emerald-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
  
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-300 uppercase">
              Activation Complete
            </p>
  
            <h1 className="text-3xl font-bold text-white">
              Silent Shield Activated
            </h1>
  
            <p className="text-sm text-slate-400">
              Shield ID:{' '}
              <span className="font-mono text-slate-200">{shieldId}</span>
            </p>
          </div>
  
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Your emergency profile is now active. Scan this shield anytime to view the profile.
          </div>
  
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-left space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-yellow-200 uppercase tracking-wide">
                Save Your Edit PIN
              </p>
  
              <span className="rounded-full bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 text-[10px] font-semibold text-yellow-200">
                Important
              </span>
            </div>
  
            <p className="font-mono text-3xl tracking-[0.25em] text-white text-center py-2">
              {pin}
            </p>
  
            <p className="text-xs leading-relaxed text-slate-300">
              This PIN is <span className="font-semibold text-white">not stored in plain text</span>.
              We cannot recover it for you. Save it somewhere safe — you will need it to update this profile later.
            </p>
          </div>
  
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left">
            <p className="text-sm font-semibold text-slate-100">
              Next step
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              View your Silent Shield profile and test the contact buttons to make sure everything looks correct.
            </p>
          </div>
  
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = `/p/${shieldId}`;
                }
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 text-sm font-bold transition shadow-lg shadow-red-500/20"
            >
              View & Test My Silent Shield
            </button>

            <a
              href={`/claim/${shieldId}`}
              className="block w-full text-center rounded-xl border border-slate-700 bg-slate-900/60 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Claim This Shield to My Account
            </a>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Claiming links this shield to your account so you can manage it from My Account,
              get scan notifications, and recover your PIN if you forget it.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-7 space-y-5">
        <div className="flex justify-center mt-2">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/40">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            Emergency ID
          </p>
        </div>

        <h1 className="mt-3 text-center text-3xl font-bold text-white tracking-tight">
          Set Up Your Emergency Profile
        </h1>

        <p className="text-center text-xs text-slate-400 mt-1">
          Shield ID: <span className="font-mono text-slate-200">{shieldId}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-[11px] text-slate-500 text-right">All fields are optional except PIN</p>

          <Section title="Profile Information">
            <FieldLabel label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClassName}
              >
                <option value="general">General Emergency ID</option>
                <option value="child">Child Safety</option>
                <option value="adult">Adult Emergency ID</option>
                <option value="senior">Senior Safety</option>
                <option value="medical">Medical Alert</option>
                <option value="autism">Autism / Nonverbal</option>
                <option value="disability">Disability Support</option>
                <option value="veteran">Veteran</option>
                <option value="law_enforcement">Law Enforcement</option>
                <option value="first_responder">First Responder</option>
              </select>
            </FieldLabel>

            <TextInput
              label="Name"
              value={name}
              onChange={setName}
              placeholder="Example: Liam Smith"
            />

            <FieldLabel label="Date of Birth">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={inputClassName}
              />
            </FieldLabel>

            <PhotoUpload
              previewUrl={photoPreview}
              onChange={handlePhotoChange}
            />

            <TextInput
              label="Address"
              value={address}
              onChange={setAddress}
              placeholder="Example: 123 Main St, Fort Worth, TX"
            />
          </Section>

          <Section title="Primary Contact">
            <TextInput
              label="Name"
              value={emName}
              onChange={setEmName}
              placeholder="Example: Jane"
            />

            <FieldLabel label="Relationship">
              <RelationshipSelect
                value={contact1Relationship}
                onChange={setContact1Relationship}
              />
            </FieldLabel>

            <TextInput
              label="Phone"
              value={emPhone}
              onChange={setEmPhone}
              placeholder="Example: (214) 555-1234"
            />
          </Section>

          <Section title="Secondary Contact">
            <TextInput
              label="Name"
              value={contact2Name}
              onChange={setContact2Name}
              placeholder="Example: John"
            />

            <FieldLabel label="Relationship">
              <RelationshipSelect
                value={contact2Relationship}
                onChange={setContact2Relationship}
              />
            </FieldLabel>

            <TextInput
              label="Phone"
              value={contact2Phone}
              onChange={setContact2Phone}
              placeholder="Example: (214) 555-1234"
            />
          </Section>

          <Section title="Medical Information">
            <TextArea
              label="Conditions"
              value={conditions}
              onChange={setConditions}
              placeholder="Example: Autism, epilepsy, diabetes, dementia"
              rows={2}
            />

            <TextArea
              label="Allergies"
              value={allergies}
              onChange={setAllergies}
              placeholder="Example: Peanut allergy, penicillin, no known allergies"
              rows={2}
            />

            <TextArea
              label="Medications"
              value={medications}
              onChange={setMedications}
              placeholder="Example: Insulin, rescue inhaler, seizure medication, none"
              rows={2}
            />

            <FieldLabel label="Blood Type">
              <BloodTypeSelect value={bloodType} onChange={setBloodType} />
            </FieldLabel>
          </Section>

          <Section title="Emergency Instructions">
            <TextArea
              label="Critical Notes"
              value={criticalNotes}
              onChange={setCriticalNotes}
              rows={2}
              placeholder="Example: Nonverbal. May not respond to name. Seizure risk."
            />

            <TextArea
              label="Emergency Instructions"
              value={emergencyInstructions}
              onChange={setEmergencyInstructions}
              rows={3}
              placeholder="Example: Call parent immediately. Keep calm. Do not restrain during seizure."
            />
          </Section>

          <Section title="Owner Email">
            <div className="space-y-3">
              <TextInput
                label="Email Address Optional"
                value={ownerEmail}
                onChange={setOwnerEmail}
                placeholder="Example: owner@email.com"
              />

              <p className="text-[11px] text-slate-400">
                Used only for important Silent Shield updates, profile review reminders,
                and support related to this shield.
              </p>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={ownerEmailConsent}
                  onChange={(e) => setOwnerEmailConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900"
                />

                <span className="text-xs leading-relaxed text-slate-300">
                  I agree to receive important updates about this Silent Shield profile.
                </span>
              </label>
            </div>
          </Section>

          <Section title="Your Privacy">
            <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
              <p>
                <span className="font-semibold text-slate-300">Who can see this profile?</span>{' '}
                Anyone who scans this NFC tag can view the name, photo, emergency contacts, medical information, and instructions you enter.
              </p>
              <p>
                <span className="font-semibold text-slate-300">Address:</span>{' '}
                Address is hidden by default — the viewer must tap "Show Address" to reveal it. Only add it if helpful for emergency responders.
              </p>
              <p>
                <span className="font-semibold text-slate-300">Owner email:</span>{' '}
                Your email (if provided) is never shown on the public profile. It is used only for scan notifications and account recovery.
              </p>
              <p>
                <span className="font-semibold text-slate-300">Edit PIN:</span>{' '}
                Your PIN is stored as a one-way hash. We cannot recover it in plain text — save it somewhere safe.
              </p>
            </div>
          </Section>

          <Section title="Create an Edit PIN">
            <p className="text-sm text-slate-300">
              Choose a PIN you'll remember — you'll need it to edit this profile later.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              4–10 characters. Letters and numbers are fine. After claiming this shield to your account, you can recover it by email if you forget it.
            </p>

            <input
              type="password"
              placeholder="Choose PIN (4–10 characters)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={inputClassName}
            />

            <input
              type="password"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className={inputClassName}
            />
          </Section>

          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

          <button
            type="submit"
            disabled={status === 'activating'}
            className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
          >
            {status === 'activating' && <Spinner />}
            {status === 'activating' ? 'Activating…' : 'Activate Shield'}
          </button>
        </form>
      </div>

      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-yellow-300">
                Important Notice
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Before You Activate
              </h2>
            </div>

            <div className="space-y-3 text-sm leading-relaxed">
              <p className="text-slate-100">
                Silent Shield is intended to help provide emergency information to caregivers,
                first responders, and members of the public.
              </p>

              <p className="text-slate-300">
                Information displayed on this profile is provided and maintained by the profile
                owner. Always verify information when possible and contact emergency services
                when appropriate.
              </p>

              <p className="text-slate-300">
                Silent Shield does not provide GPS tracking, emergency dispatch, or real-time
                monitoring.
              </p>

              <p className="text-xs text-slate-400">
                By activating, you acknowledge that you are responsible for keeping this profile
                accurate and up to date.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                type="button"
                onClick={activateShield}
                className="w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                I Understand & Activate
              </button>

              <button
                type="button"
                onClick={() => setShowDisclaimer(false)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-3 border-t border-slate-800 space-y-4">
      <h3 className="text-sm font-semibold text-red-300">{title}</h3>
      {children}
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1 text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <FieldLabel label={label}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </FieldLabel>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <FieldLabel label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={inputClassName}
      />
    </FieldLabel>
  );
}

function PhotoUpload({
  previewUrl,
  onChange,
}: {
  previewUrl: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <FieldLabel label="Profile Photo">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900/80 flex items-center justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs text-slate-500 text-center px-2">
              No Photo
            </span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-red-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-red-600"
          />
          <p className="text-[11px] text-slate-500">
            Optional. Best for children, seniors, or anyone who may need identification.
          </p>
        </div>
      </div>
    </FieldLabel>
  );
}

function RelationshipSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClassName}>
      <option value="">Select Relationship</option>
      <option value="Mother">Mother</option>
      <option value="Father">Father</option>
      <option value="Parent">Parent</option>
      <option value="Guardian">Guardian</option>
      <option value="Spouse">Spouse</option>
      <option value="Caregiver">Caregiver</option>
      <option value="Grandparent">Grandparent</option>
      <option value="Sibling">Sibling</option>
      <option value="Friend">Friend</option>
      <option value="Emergency Contact">Emergency Contact</option>
    </select>
  );
}

function BloodTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClassName}>
      <option value="">Select Blood Type</option>
      <option value="A+">A+</option>
      <option value="A-">A-</option>
      <option value="B+">B+</option>
      <option value="B-">B-</option>
      <option value="AB+">AB+</option>
      <option value="AB-">AB-</option>
      <option value="O+">O+</option>
      <option value="O-">O-</option>
      <option value="Unknown">Unknown</option>
    </select>
  );
}