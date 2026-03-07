import { genId, loadToolsConfig, saveToolsConfig } from '@/lib/tools-config';

export async function GET() {
  return Response.json(loadToolsConfig());
}

export async function POST(req) {
  try {
    const body = await req.json();
    const cfg = loadToolsConfig();

    if (body?.section === 'builtIn') {
      const item = body.item || {};
      if (!item.name || !item.href) {
        return Response.json({ error: 'builtIn item requires name and href' }, { status: 400 });
      }
      cfg.builtIn.push({
        id: item.id || genId('builtin'),
        name: item.name,
        desc: item.desc || '',
        href: item.href,
      });
      return Response.json(saveToolsConfig(cfg));
    }

    if (body?.section === 'externalGroup') {
      const group = body.group || {};
      if (!group.category) {
        return Response.json({ error: 'externalGroup requires category' }, { status: 400 });
      }
      cfg.externalGroups.push({
        id: group.id || genId('group'),
        category: group.category,
        items: Array.isArray(group.items) ? group.items : [],
      });
      return Response.json(saveToolsConfig(cfg));
    }

    if (body?.section === 'external') {
      const item = body.item || {};
      const groupId = body.groupId;
      if (!groupId) {
        return Response.json({ error: 'external item requires groupId' }, { status: 400 });
      }
      if (!item.name || !item.url) {
        return Response.json({ error: 'external item requires name and url' }, { status: 400 });
      }
      const group = cfg.externalGroups.find((g) => g.id === groupId);
      if (!group) {
        return Response.json({ error: 'group not found' }, { status: 404 });
      }
      group.items = Array.isArray(group.items) ? group.items : [];
      group.items.push({
        id: item.id || genId('external'),
        name: item.name,
        url: item.url,
        note: item.note || '',
      });
      return Response.json(saveToolsConfig(cfg));
    }

    return Response.json({ error: 'invalid section, expected builtIn | external | externalGroup' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message || 'invalid request body' }, { status: 400 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const cfg = loadToolsConfig();

    if (body?.section === 'builtIn') {
      const idx = cfg.builtIn.findIndex((item) => item.id === body.id);
      if (idx === -1) return Response.json({ error: 'builtIn item not found' }, { status: 404 });
      if (body.remove) {
        cfg.builtIn.splice(idx, 1);
      } else {
        cfg.builtIn[idx] = { ...cfg.builtIn[idx], ...(body.updates || {}) };
      }
      return Response.json(saveToolsConfig(cfg));
    }

    if (body?.section === 'externalGroup') {
      const groupIdx = cfg.externalGroups.findIndex((g) => g.id === body.groupId);
      if (groupIdx === -1) return Response.json({ error: 'external group not found' }, { status: 404 });
      if (body.remove) {
        cfg.externalGroups.splice(groupIdx, 1);
      } else {
        cfg.externalGroups[groupIdx] = { ...cfg.externalGroups[groupIdx], ...(body.updates || {}) };
      }
      return Response.json(saveToolsConfig(cfg));
    }

    if (body?.section === 'external') {
      const group = cfg.externalGroups.find((g) => g.id === body.groupId);
      if (!group) return Response.json({ error: 'external group not found' }, { status: 404 });
      group.items = Array.isArray(group.items) ? group.items : [];
      const idx = group.items.findIndex((item) => item.id === body.id);
      if (idx === -1) return Response.json({ error: 'external item not found' }, { status: 404 });
      if (body.remove) {
        group.items.splice(idx, 1);
      } else {
        group.items[idx] = { ...group.items[idx], ...(body.updates || {}) };
      }
      return Response.json(saveToolsConfig(cfg));
    }

    return Response.json({ error: 'invalid section, expected builtIn | external | externalGroup' }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message || 'invalid request body' }, { status: 400 });
  }
}
