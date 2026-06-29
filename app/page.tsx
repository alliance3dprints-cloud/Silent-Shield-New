// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">
          Silent Shield dev env is working
        </h1>
        <Link
          href="/account"
          className="inline-block rounded-lg bg-red-500 hover:bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition"
        >
          My Account
        </Link>
      </div>
    </main>
  );
}
