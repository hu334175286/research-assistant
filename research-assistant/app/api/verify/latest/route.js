import { readLatestVerifyResult, VERIFY_LATEST_PATH } from '@/lib/verify-runner';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await readLatestVerifyResult();
    return Response.json(result);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return Response.json(
        {
          ok: false,
          error: 'no verify result found',
          path: VERIFY_LATEST_PATH,
        },
        { status: 404 },
      );
    }

    return Response.json(
      {
        ok: false,
        error: error?.message || 'failed to read verify result',
      },
      { status: 500 },
    );
  }
}
