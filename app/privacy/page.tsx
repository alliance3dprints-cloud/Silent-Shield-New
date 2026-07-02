import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Silent Shield collects, uses, and protects your information.',
};

const UPDATED = 'July 2, 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-slate-200">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">
            ← Back to Silent Shield
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Last updated: {UPDATED}</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-slate-300">
          <p>
            Silent Shield is operated by <strong className="text-slate-100">Alliance 3D Prints LLC</strong>, a
            Texas limited liability company (&ldquo;Silent Shield,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). This
            policy explains what information we collect, how we use it, and the choices you have. Questions? Email{' '}
            <a href="mailto:support@alliance3dprints.com" className="text-red-400 underline underline-offset-2">
              support@alliance3dprints.com
            </a>.
          </p>

          <Block title="1. The information you choose to make public">
            <p>
              Silent Shield is a wearable NFC tag that displays an emergency profile when scanned. Any information you
              enter into a profile — such as a name, photo, date of birth, emergency contacts, medical conditions,
              allergies, medications, and instructions — is <strong className="text-slate-100">shown to anyone who scans
              that tag</strong>. This is the core purpose of the product. Only enter information you are comfortable
              making visible to a first responder or member of the public who scans the tag.
            </p>
            <p>
              A profile&rsquo;s <strong className="text-slate-100">address is hidden by default</strong> and only shown
              if a viewer taps &ldquo;Show Address.&rdquo;
            </p>
          </Block>

          <Block title="2. Account information">
            <p>
              To claim and manage shields, we create an account tied to your email address. We use passwordless
              (magic-link) sign-in, so we do not store a password. Your account email is{' '}
              <strong className="text-slate-100">never displayed on public profiles</strong>.
            </p>
          </Block>

          <Block title="3. Payment information">
            <p>
              Premium subscriptions are billed through <strong className="text-slate-100">Stripe</strong>. We do not
              collect or store your card number — Stripe handles payment data directly under its own security and
              privacy terms.
            </p>
          </Block>

          <Block title="4. Scan and usage data">
            <p>
              When a tag is scanned, we record a timestamp and limited technical data (such as an IP address and browser
              user-agent) to power scan notifications, scan history, and abuse prevention. We do{' '}
              <strong className="text-slate-100">not</strong> use GPS or track physical location, and we do not build
              advertising profiles.
            </p>
          </Block>

          <Block title="5. How we use information">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Display the emergency profile to anyone who scans the tag.</li>
              <li>Send scan-alert emails to subscribed owners (Premium).</li>
              <li>Authenticate your account and let you recover your Edit PIN by email.</li>
              <li>Process and manage subscriptions through Stripe.</li>
              <li>Send occasional product-update emails <strong className="text-slate-100">only if you opt in</strong>.</li>
            </ul>
          </Block>

          <Block title="6. Service providers">
            <p>We share limited data with the providers that run the service, only as needed to operate it:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-slate-100">Supabase</strong> — database and authentication.</li>
              <li><strong className="text-slate-100">Vercel</strong> — application hosting.</li>
              <li><strong className="text-slate-100">Stripe</strong> — subscription billing.</li>
              <li><strong className="text-slate-100">Resend</strong> — transactional and opt-in emails.</li>
            </ul>
            <p>
              We do <strong className="text-slate-100">not sell your personal information</strong>, and we do not share
              it for third-party advertising.
            </p>
          </Block>

          <Block title="7. Your control and data deletion">
            <p>
              You control your data directly in the app. You can edit any profile, turn scan notifications on or off,
              opt out of product emails at any time, remove a shield from your account, or use{' '}
              <strong className="text-slate-100">Delete Profile Data</strong> to permanently erase a profile&rsquo;s
              information and deactivate the tag. To request full deletion of your account, email us.
            </p>
          </Block>

          <Block title="8. Security">
            <p>
              Edit PINs are stored only as a one-way hash (bcrypt) — we cannot see or recover them. Profile addresses
              are hidden by default, account emails are never shown publicly, and repeated incorrect PIN attempts are
              rate-limited. No system is perfectly secure, but we take reasonable measures to protect your data.
            </p>
          </Block>

          <Block title="9. Children">
            <p>
              Silent Shield is frequently used to protect children and other dependents. Accounts are created and
              controlled by an adult (a parent, guardian, or caregiver), who is responsible for the information they
              choose to enter about a dependent. Silent Shield is not directed to children for the creation of their
              own accounts.
            </p>
          </Block>

          <Block title="10. HIPAA">
            <p>
              Silent Shield is a consumer product for information you voluntarily choose to display. We are not a
              healthcare provider, health plan, or healthcare clearinghouse, and we are generally not a &ldquo;covered
              entity&rdquo; or &ldquo;business associate&rdquo; under HIPAA. Information you enter is treated under this
              Privacy Policy, not HIPAA.
            </p>
          </Block>

          <Block title="11. Changes">
            <p>
              We may update this policy as the product evolves. Material changes will be reflected by the
              &ldquo;Last updated&rdquo; date above.
            </p>
          </Block>

          <Block title="12. Contact">
            <p>
              Alliance 3D Prints LLC (Texas) —{' '}
              <a href="mailto:support@alliance3dprints.com" className="text-red-400 underline underline-offset-2">
                support@alliance3dprints.com
              </a>
            </p>
          </Block>
        </section>

        <footer className="pt-6 border-t border-slate-800 flex gap-4 text-xs text-slate-500">
          <Link href="/terms" className="hover:text-slate-300 underline underline-offset-2">Terms of Service</Link>
          <Link href="/" className="hover:text-slate-300 underline underline-offset-2">Home</Link>
        </footer>
      </div>
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}
