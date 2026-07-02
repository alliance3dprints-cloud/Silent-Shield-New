import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Silent Shield.',
};

const UPDATED = 'July 2, 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-900 px-4 py-12 text-slate-200">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2">
            ← Back to Silent Shield
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-500">Last updated: {UPDATED}</p>
        </header>

        <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
          <p className="text-sm font-semibold text-red-200">Emergency notice</p>
          <p className="mt-1 text-sm text-slate-300 leading-relaxed">
            Silent Shield is an informational tool, not an emergency service. In any life-threatening emergency,
            call 911 (or your local emergency number). Silent Shield does not dispatch help, track location, or
            provide real-time monitoring.
          </p>
        </div>

        <section className="space-y-6 text-sm leading-relaxed text-slate-300">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Silent Shield, operated by{' '}
            <strong className="text-slate-100">Alliance 3D Prints LLC</strong>, a Texas limited liability company. By
            activating a shield, creating an account, or using the service, you agree to these Terms.
          </p>

          <Block title="1. What Silent Shield is — and is not">
            <p>
              Silent Shield displays emergency information you choose to enter when someone scans an NFC tag. It is a
              supplement to, not a substitute for, emergency services, medical care, or personal identification. It is{' '}
              <strong className="text-slate-100">not a medical device</strong>, does not provide GPS tracking or real-time
              monitoring, and does not guarantee that any information will be seen or acted upon.
            </p>
          </Block>

          <Block title="2. Your responsibilities">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Keep your profile information accurate and up to date.</li>
              <li>Only enter information about another person (such as a child or dependent) if you have the authority and consent to do so.</li>
              <li>Keep your Edit PIN secure. We store it only as a hash and cannot recover it for you.</li>
              <li>Use the service lawfully and not to harass, impersonate, or harm others.</li>
            </ul>
          </Block>

          <Block title="3. Accounts and claiming">
            <p>
              Claiming a shield links it to your account so you can manage it, recover your PIN by email, and enable
              notifications. A shield may be linked to one account at a time. You are responsible for activity under
              your account.
            </p>
          </Block>

          <Block title="4. Free service and Premium subscriptions">
            <p>
              The emergency profile — including activation, editing, claiming, PIN recovery, and unlimited scans — is
              free. <strong className="text-slate-100">Premium</strong> adds instant scan-alert emails and scan history
              for <strong className="text-slate-100">$3.99/month</strong> or <strong className="text-slate-100">$39.99/year</strong>.
            </p>
            <p>
              Subscriptions are billed in advance through Stripe and renew automatically until cancelled. You can cancel
              anytime from the billing portal in your account; cancellation stops future renewals and you retain Premium
              until the end of the current paid period. Except where required by law, payments are non-refundable.
              Prices may change with notice; changes apply to future billing periods.
            </p>
          </Block>

          <Block title="5. Acceptable use">
            <p>
              You may not use Silent Shield to enter another person&rsquo;s information without authorization, to violate
              any law, to infringe others&rsquo; rights, or to attempt to disrupt or gain unauthorized access to the
              service.
            </p>
          </Block>

          <Block title="6. Content you provide">
            <p>
              You retain ownership of the information you enter. You grant us a limited license to store and display it
              solely to operate the service (for example, showing the profile when the tag is scanned). You are
              responsible for the content you provide.
            </p>
          </Block>

          <Block title="7. Disclaimer of warranties">
            <p>
              The service is provided <strong className="text-slate-100">&ldquo;as is&rdquo; and &ldquo;as
              available,&rdquo;</strong> without warranties of any kind, whether express or implied, including
              merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the
              service will be uninterrupted, error-free, or that information will always be accessible when scanned.
            </p>
          </Block>

          <Block title="8. Limitation of liability">
            <p>
              To the fullest extent permitted by law, Alliance 3D Prints LLC will not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or for any loss arising from reliance on the
              service or from information being unavailable, inaccurate, or acted upon. Our total liability for any
              claim relating to the service will not exceed the amount you paid us in the twelve months before the
              claim. Some jurisdictions do not allow certain limitations, so some may not apply to you.
            </p>
          </Block>

          <Block title="9. Indemnification">
            <p>
              You agree to indemnify and hold harmless Alliance 3D Prints LLC from claims arising out of your use of the
              service, the information you provide, or your violation of these Terms.
            </p>
          </Block>

          <Block title="10. Termination">
            <p>
              You may stop using the service and delete your data at any time. We may suspend or terminate access for
              violations of these Terms or to protect the service and its users.
            </p>
          </Block>

          <Block title="11. Governing law">
            <p>
              These Terms are governed by the laws of the State of Texas, without regard to its conflict-of-laws rules.
              Any disputes will be resolved in the state or federal courts located in Texas.
            </p>
          </Block>

          <Block title="12. Changes to these Terms">
            <p>
              We may update these Terms as the service evolves. Continued use after changes take effect constitutes
              acceptance of the updated Terms.
            </p>
          </Block>

          <Block title="13. Contact">
            <p>
              Alliance 3D Prints LLC (Texas) —{' '}
              <a href="mailto:support@alliance3dprints.com" className="text-red-400 underline underline-offset-2">
                support@alliance3dprints.com
              </a>
            </p>
          </Block>
        </section>

        <footer className="pt-6 border-t border-slate-800 flex gap-4 text-xs text-slate-500">
          <Link href="/privacy" className="hover:text-slate-300 underline underline-offset-2">Privacy Policy</Link>
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
