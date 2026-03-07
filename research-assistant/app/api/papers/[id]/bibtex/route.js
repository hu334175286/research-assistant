import { prisma } from '@/lib/prisma';
import { generateBibTeX } from '@/lib/bibtex';

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: 'paper id is required' }, { status: 400 });

  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper) return Response.json({ error: 'paper not found' }, { status: 404 });

  const bibtex = generateBibTeX(paper);
  return new Response(bibtex, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-bibtex; charset=utf-8',
      'Content-Disposition': `attachment; filename="paper-${id}.bib"`,
    },
  });
}
