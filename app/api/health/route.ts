import { NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabaseServiceRole';

export const dynamic = 'force-dynamic';

// Lightweight health check for uptime monitors. Verifies the app can reach the
// database — the exact failure that took shields down. Point a monitor
// (UptimeRobot, Better Stack, etc.) at /api/health and alert on non-200.
export async function GET() {
  const started = Date.now();
  try {
    const db = getServiceRoleClient();
    const { error } = await db.from('silent_shields').select('id').limit(1);
    if (error) throw error;

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      ms: Date.now() - started,
      time: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json(
      { status: 'error', db: 'unreachable', error: message, time: new Date().toISOString() },
      { status: 503 },
    );
  }
}
