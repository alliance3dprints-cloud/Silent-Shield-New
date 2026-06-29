// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-md space-y-8">
        <section className="rounded-2xl bg-slate-950/90 border border-red-500/40 shadow-2xl px-6 py-8 space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 shadow-lg shadow-red-500/20">
            <div className="flex items-center justify-center gap-1">
              <span className="block h-5 w-1.5 rounded-full bg-red-300/90" />
              <span className="block h-8 w-1.5 rounded-full bg-red-300/70" />
              <span className="block h-10 w-1.5 rounded-full bg-red-300/50" />
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Silent Shield
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              NFC Emergency Identification
            </p>
          </div>

          <p className="text-sm leading-relaxed text-slate-300">
            Silent Shield is a wearable NFC tag that gives first responders and
            good samaritans instant access to emergency contacts, medical
            information, and critical instructions — no app required.
          </p>

          <div className="space-y-3 pt-2">
            <Link
              href="/account"
              className="block w-full rounded-lg bg-red-500 hover:bg-red-600 px-4 py-3 text-sm font-semibold text-white transition shadow-lg shadow-red-500/20"
            >
              My Account
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-6 space-y-5">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.18em]">
            How It Works
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/40 text-sm font-bold text-red-400">
                1
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Get a Silent Shield</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Each shield is an NFC-enabled wearable — a wristband, tag, or card.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/40 text-sm font-bold text-red-400">
                2
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Set up your profile</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add emergency contacts, medical info, and instructions.
                  Takes less than 2 minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/40 text-sm font-bold text-red-400">
                3
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Tap to scan</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Anyone with a smartphone can tap the shield to instantly see
                  the emergency profile. No app download needed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-950/90 border border-slate-700 shadow-xl px-6 py-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-[0.18em]">
            Built For
          </h2>

          <div className="flex flex-wrap gap-2">
            {[
              'Children',
              'Autism / Nonverbal',
              'Seniors',
              'Epilepsy',
              'Diabetes',
              'Dementia',
              'Veterans',
              'Medical Alerts',
            ].map((label) => (
              <span
                key={label}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        </section>

        <footer className="text-center space-y-2 pb-4">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            The emergency profile is always free and fully functional.
            No app required. No subscription needed to save a life.
          </p>
          <p className="text-[11px] text-slate-700">
            Silent Shield by Alliance 3D Prints
          </p>
        </footer>
      </div>
    </main>
  );
}
