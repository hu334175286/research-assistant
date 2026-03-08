import { getDeliverySummary, loadDeliveryChecklist } from '@/lib/delivery-checklist';

export async function GET(req) {
  const checklist = loadDeliveryChecklist();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const filteredItems = status
    ? checklist.items.filter((item) => item.status === status)
    : checklist.items;

  return Response.json({
    project: checklist.project,
    updatedAt: checklist.updatedAt,
    statusFilter: status || 'all',
    summary: getDeliverySummary(filteredItems),
    items: filteredItems,
  });
}
