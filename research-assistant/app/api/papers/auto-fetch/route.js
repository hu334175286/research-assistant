import { runAutoFetch } from '@/lib/paper-fetcher';

export async function GET() {
  const result = await runAutoFetch();
  return Response.json(result);
}

export async function POST() {
  const result = await runAutoFetch();
  return Response.json(result);
}
