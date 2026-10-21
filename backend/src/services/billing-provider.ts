export interface CheckoutRequest {
  userId: string;
  planId: string;
  returnUrl: string;
}

export interface CheckoutSession {
  status: 'manual_activation' | 'redirect_required';
  checkoutUrl?: string;
}

export interface BillingProvider {
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  verifyWebhook(payload: string, signature: string): Promise<boolean>;
}

/** Keeps billing optional during validation. Replace this on the server when a gateway is selected. */
export class ManualBillingProvider implements BillingProvider {
  async createCheckout(): Promise<CheckoutSession> {
    return { status: 'manual_activation' };
  }

  async verifyWebhook(): Promise<boolean> {
    return false;
  }
}
