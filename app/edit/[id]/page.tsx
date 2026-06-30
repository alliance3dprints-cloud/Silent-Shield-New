// app/edit/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type EditPageProps = {
  params: { id: string };
};

type ShieldRow = {
  id: string;
  Name: string | null;
  Address: string | null;
  Emergency_Contact_Name: string | null;
  Emergency_Contact_Phone: string | null;
  Date_of_Birth: string | null;
  Medical_Info: string | null;
  Notes: string | null;
  photo_url: string | null;

  owner_email: string | null;
  owner_email_consent: boolean | null;

  contact_2_name: string | null;
  contact_2_phone: string | null;
  contact_1_relationship: string | null;
  contact_2_relationship: string | null;

  conditions: string | null;
  allergies: string | null;
  medications: string | null;
  blood_type: string | null;
  critical_notes: string | null;
  emergency_instructions: string | null;
  profile_type: string | null;
};

const inputClassName =
  'w-full border border-slate-700 bg-slate-900/60 rounded px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/60';

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

export default function EditShieldPage({ params }: EditPageProps) {
  const shieldId = params.id;
  const searchParams = useSearchParams();
  const isRecovery = searchParams.get('recover') === 'true';

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<ShieldRow | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const [category, setCategory] = useState('general');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [showPinReset, setShowPinReset] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinResetStatus, setPinResetStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pinResetError, setPinResetError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] =
    useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function checkOwnership() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setIsLoggedIn(true);

      const { data: ownership } = await supabase
        .from('shield_owners')
        .select('id')
        .eq('shield_id', shieldId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownership) {
        setIsOwner(true);
        setIsClaimed(true);

        if (isRecovery) {
          setShowPinReset(true);
        }

        const { data: shieldData } = await supabase
          .from('silent_shields')
          .select('*')
          .eq('id', shieldId)
          .maybeSingle();

        if (shieldData) {
          const { Edit_pin_hash, ...safeRow } = shieldData;
          populateForm(safeRow as ShieldRow);
          setVerified(true);
        }
      } else {
        const { data: anyOwner } = await supabase
          .from('shield_owners')
          .select('id')
          .eq('shield_id', shieldId)
          .maybeSingle();
        setIsClaimed(!!anyOwner);
      }
    }

    checkOwnership();
  }, [shieldId]);

  function populateForm(verifiedRow: ShieldRow) {
    setRow(verifiedRow);
    setCategory(verifiedRow.profile_type ?? 'general');
    setName(verifiedRow.Name ?? '');
    setDob(verifiedRow.Date_of_Birth ?? '');
    setAddress(verifiedRow.Address ?? '');
    setPhotoUrl(verifiedRow.photo_url ?? null);
    setPhotoPreview(verifiedRow.photo_url ?? null);
    setOwnerEmail(verifiedRow.owner_email ?? '');
    setOwnerEmailConsent(verifiedRow.owner_email_consent ?? false);
    setEmName(verifiedRow.Emergency_Contact_Name ?? '');
    setEmPhone(verifiedRow.Emergency_Contact_Phone ?? '');
    setContact1Relationship(verifiedRow.contact_1_relationship ?? '');
    setContact2Name(verifiedRow.contact_2_name ?? '');
    setContact2Phone(verifiedRow.contact_2_phone ?? '');
    setContact2Relationship(verifiedRow.contact_2_relationship ?? '');
    setConditions(verifiedRow.conditions ?? '');
    setAllergies(verifiedRow.allergies ?? '');
    setMedications(verifiedRow.medications ?? '');
    setBloodType(verifiedRow.blood_type ?? '');
    setCriticalNotes(verifiedRow.critical_notes ?? verifiedRow.Medical_Info ?? '');
    setEmergencyInstructions(verifiedRow.emergency_instructions ?? verifiedRow.Notes ?? '');
  }

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file);

    if (!file) {
      setPhotoPreview(photoUrl);
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);

    if (!pinInput) {
      setPinError('Please enter your PIN.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shieldId, pin: pinInput }),
      });

      if (!res.ok) {
        const body = await res.json();
        setPinError(res.status === 401 ? 'Incorrect PIN. Please try again, or use "Forgot PIN?" below to recover access.' : (body.error || 'Shield not found. Check the Shield ID and try again.'));
        setLoading(false);
        return;
      }

      const { data: verifiedRow } = await res.json() as { data: ShieldRow };
      populateForm(verifiedRow);
      setVerified(true);
    } catch (err) {
      console.error(err);
      setPinError('Could not verify your PIN. Please check your connection and try again.');
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    setSaveError(null);
    setSaveStatus('saving');

    if (ownerEmail && !ownerEmailConsent) {
      setSaveStatus('error');
      setSaveError('Please check the email consent box or remove the email address.');
      return;
    }

    try {
      const updatedPhotoUrl = photoFile
        ? await uploadProfilePhoto(shieldId, photoFile)
        : photoUrl;

      const { error } = await supabase
        .from('silent_shields')
        .update({
          profile_type: category || 'general',
          Name: name || null,
          Date_of_Birth: dob || null,
          Address: address || null,
          photo_url: updatedPhotoUrl || null,

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

          last_updated_at: new Date().toISOString(),
        })
        .eq('id', shieldId);

      if (error) {
        console.error(error);
        setSaveStatus('error');
        setSaveError('Failed to save changes. Please check your connection and try again.');
        return;
      }

      setPhotoUrl(updatedPhotoUrl || null);
      setSaveStatus('success');
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setSaveError('Failed to upload photo or save changes. Please check your connection and try again. If the issue persists, try a smaller photo.');
    }
  }

  async function handlePinReset(e: React.FormEvent) {
    e.preventDefault();
    setPinResetError(null);

    if (!newPin || !confirmNewPin) {
      setPinResetError('Please enter and confirm your new PIN.');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinResetError('PINs do not match.');
      return;
    }
    if (newPin.length < 4 || newPin.length > 10) {
      setPinResetError('PIN must be 4-10 characters.');
      return;
    }

    setPinResetStatus('saving');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setPinResetError('Session expired. Please sign in again.');
        setPinResetStatus('error');
        return;
      }

      const res = await fetch('/api/shield/reset-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shieldId, newPin }),
      });

      if (!res.ok) {
        const body = await res.json();
        setPinResetError(body.error || 'Failed to reset PIN.');
        setPinResetStatus('error');
        return;
      }

      setPinResetStatus('success');
    } catch {
      setPinResetError('Something went wrong. Please try again.');
      setPinResetStatus('error');
    }
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
          Edit Silent Shield
        </h1>

        <p className="text-center text-xs text-slate-400 mt-1">
          Shield ID: <span className="font-mono text-slate-200">{shieldId}</span>
        </p>

        {isLoggedIn && (
          <Link
            href="/account"
            className="block text-center rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
          >
            My Account
          </Link>
        )}

        {!verified ? (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Enter the PIN you created when this Silent Shield was activated.
            </p>

            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className={inputClassName}
              placeholder="Edit PIN"
            />

            {pinError && <p className="text-sm text-red-400">{pinError}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? 'Verifying…' : 'Unlock'}
            </button>

            {isClaimed && (
              <Link
                href={`/account/login?recover=${shieldId}`}
                className="block text-xs text-center text-slate-400 hover:text-slate-200 underline underline-offset-2"
              >
                Forgot PIN? Recover via email
              </Link>
            )}
          </form>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {!isClaimed && !isOwner && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-200">
                  Want to manage this shield from your account?
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Claim this shield to recover your PIN by email, get scan notifications,
                  and manage all your shields in one place.
                </p>
                <Link
                  href={`/claim/${shieldId}`}
                  className="inline-block mt-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition"
                >
                  Claim This Shield →
                </Link>
              </div>
            )}

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

              <TextInput label="Name" value={name} onChange={setName} />

              <FieldLabel label="Date of Birth">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputClassName}
                />
              </FieldLabel>

              <PhotoUpload previewUrl={photoPreview} onChange={handlePhotoChange} />

              <TextInput label="Address" value={address} onChange={setAddress} />
            </Section>

            <Section title="Owner Email">
              <div className="space-y-3">
                <TextInput
                  label="Email Address Optional"
                  value={ownerEmail}
                  onChange={setOwnerEmail}
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

            <Section title="Primary Contact">
              <TextInput label="Name" value={emName} onChange={setEmName} />

              <FieldLabel label="Relationship">
                <RelationshipSelect
                  value={contact1Relationship}
                  onChange={setContact1Relationship}
                />
              </FieldLabel>

              <TextInput label="Phone" value={emPhone} onChange={setEmPhone} />
            </Section>

            <Section title="Secondary Contact">
              <TextInput label="Name" value={contact2Name} onChange={setContact2Name} />

              <FieldLabel label="Relationship">
                <RelationshipSelect
                  value={contact2Relationship}
                  onChange={setContact2Relationship}
                />
              </FieldLabel>

              <TextInput label="Phone" value={contact2Phone} onChange={setContact2Phone} />
            </Section>

            <Section title="Medical Information">
              <TextArea label="Conditions" value={conditions} onChange={setConditions} />
              <TextArea label="Allergies" value={allergies} onChange={setAllergies} />
              <TextArea label="Medications" value={medications} onChange={setMedications} />

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
                placeholder="Example: Nonverbal, diabetic, seizure risk, severe allergy"
              />

              <TextArea
                label="Emergency Instructions"
                value={emergencyInstructions}
                onChange={setEmergencyInstructions}
                rows={3}
                placeholder="Example: Call parent immediately. Keep calm. Do not restrain during seizure."
              />
            </Section>

            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                By saving changes, you acknowledge that you are responsible for keeping
                this profile accurate and up to date. Silent Shield does not provide
                GPS tracking, emergency dispatch, or real-time monitoring.
              </p>
            </div>

            {saveError && <p className="text-sm text-red-400">{saveError}</p>}

            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 transition inline-flex items-center justify-center gap-2"
            >
              {saveStatus === 'saving' && <Spinner />}
              {saveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
            </button>

            {saveStatus === 'success' && (
              <div className="space-y-3">
                <p className="text-sm text-emerald-400 text-center">
                  Changes saved!
                </p>

                <Link
                  href={`/p/${shieldId}`}
                  className="block w-full text-center rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                >
                  View Public Profile
                </Link>
              </div>
            )}


            {isOwner && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                {!showPinReset ? (
                  <button
                    type="button"
                    onClick={() => setShowPinReset(true)}
                    className="block w-full text-center text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
                  >
                    Reset Edit PIN
                  </button>
                ) : pinResetStatus === 'success' ? (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
                    <p className="text-sm text-emerald-100">PIN reset successfully.</p>
                    <p className="mt-1 text-xs text-slate-400">Save your new PIN somewhere safe.</p>
                  </div>
                ) : (
                  <form onSubmit={handlePinReset} className="space-y-3">
                    <p className="text-xs font-semibold text-slate-300">Reset Edit PIN</p>

                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className={inputClassName}
                      placeholder="New PIN"
                    />

                    <input
                      type="password"
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value)}
                      className={inputClassName}
                      placeholder="Confirm New PIN"
                    />

                    {pinResetError && <p className="text-sm text-red-400">{pinResetError}</p>}

                    <button
                      type="submit"
                      disabled={pinResetStatus === 'saving'}
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-60 transition"
                    >
                      {pinResetStatus === 'saving' ? 'Resetting…' : 'Reset PIN'}
                    </button>
                  </form>
                )}

                <Link
                  href="/account"
                  className="block text-xs text-center text-slate-400 hover:text-slate-200 underline underline-offset-2"
                >
                  Go to My Account
                </Link>
              </div>
            )}
          </form>
        )}
      </div>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldLabel label={label}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
