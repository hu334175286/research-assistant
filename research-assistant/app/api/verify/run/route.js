import { runVerify } from '@/lib/verify-runner';

export const runtime = 'nodejs';

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const dryRun = body?.dryRun === true;

  try {
    const result = await runVerify({ dryRun });
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || 'verify run failed',
      },
      { status: 500 },
    );
  }
}
