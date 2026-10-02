export interface MockpayWebhook {
  event: string;
  id: string;
  amount: number;
  currency: string;
  status: 'SUCCEEDED' | 'FAILED';
  failure_reason: string | null;
  metadata: { orden_id?: number };
  created_at: string;
}