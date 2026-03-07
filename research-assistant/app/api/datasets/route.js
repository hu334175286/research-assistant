import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.dataset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Response.json(items);
}

export async function POST(req) {
  const body = await req.json();

  if (!body?.name) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const item = await prisma.dataset.create({
    data: {
      name: body.name,
      type: body.type ?? null,
      source: body.source ?? null,
      license: body.license ?? null,
      tags: body.tags ?? null,
      storagePath: body.storagePath ?? null,
      version: body.version ?? null,
      sizeBytes: typeof body.sizeBytes === 'number' ? body.sizeBytes : null,
      fileHash: body.fileHash ?? null,
      note: body.note ?? null,
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
  const fields = [
    'name',
    'type',
    'source',
    'license',
    'tags',
    'storagePath',
    'version',
    'fileHash',
    'note',
  ];

  for (const key of fields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      data[key] = body[key] ?? null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'sizeBytes')) {
    data.sizeBytes = typeof body.sizeBytes === 'number' ? body.sizeBytes : null;
  }

  const item = await prisma.dataset.update({
    where: { id: body.id },
    data,
  });

  return Response.json(item);
}
