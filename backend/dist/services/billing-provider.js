/** Keeps billing optional during validation. Replace this on the server when a gateway is selected. */
export class ManualBillingProvider {
    async createCheckout() {
        return { status: 'manual_activation' };
    }
    async verifyWebhook() {
        return false;
    }
}
