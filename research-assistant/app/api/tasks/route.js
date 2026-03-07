import { prisma } from '@/lib/prisma';

const VALID_STATUS = new Set(['todo', 'doing', 'done', 'blocked']);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const take = Number(searchParams.get('take') || 50);

  const where = status ? { status } : undefined;
  const items = await prisma.task.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: Number.isNaN(take) ? 50 : Math.min(Math.max(take, 1), 200),
  });

  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();

  if (!body?.title?.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 });
  }

  const status = body.status ?? 'todo';
  if (!VALID_STATUS.has(status)) {
    return Response.json({ error: `invalid status: ${status}` }, { status: 400 });
  }

  const item = await prisma.task.create({
    data: {
      title: body.title.trim(),
      status,
      priority: typeof body.priority === 'number' ? body.priority : 2,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    },
  });

  return Response.json(item, { status: 201 });
}

export async function PATCH(req) {
  const body = await req.json();
  if (!body?.id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }

  const data = {};
  if (typeof body.title === 'string') data.title = body.title.trim();
  if (typeof body.priority === 'number') data.priority = body.priority;
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) {
      return Response.json({ error: `invalid status: ${body.status}` }, { status: 400 });
    }
    data.status = body.status;
  }

  const item = await prisma.task.update({ where: { id: body.id }, data });
  return Response.json(item);
}
