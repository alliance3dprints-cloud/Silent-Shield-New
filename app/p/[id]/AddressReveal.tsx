'use client';

import { useState } from 'react';

export function AddressReveal({ address }: { address: string }) {
  const [shown, setShown] = useState(false);

  if (shown) {
    return (
      <div className="space-y-2">
        <p className="text-base leading-relaxed whitespace-pre-line text-slate-900">{address}</p>
        <button
          type="button"
          onClick={() => setShown(false)}
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          Hide address
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="text-sm font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-900"
    >
      Show address
    </button>
  );
}
