import DeliveryClient from './delivery-client';
import { loadDeliveryChecklist } from '@/lib/delivery-checklist';

export const metadata = {
  title: '功能落地清单 | 个人研究助手',
  description: '科研助手功能落地状态总览',
};

export default function DeliveryPage() {
  const checklist = loadDeliveryChecklist();

  return (
    <DeliveryClient
      project={checklist.project}
      updatedAt={checklist.updatedAt}
      items={checklist.items}
    />
  );
}
