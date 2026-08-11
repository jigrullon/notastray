import { describe, it, expect } from 'vitest';
import {
    getOrderConfirmationEmail,
    getMerchantOrderEmail,
    getSubscriptionConfirmationEmail,
    getMerchantSubscriptionEmail,
    getRenewalReminderEmail,
} from './emailTemplates';

const shippingAddress = {
    name: 'Jamie Rivera',
    line1: '123 Oak Street',
    city: 'Portland',
    state: 'OR',
    postalCode: '97214',
    country: 'US',
};

const items = [{ name: 'Smart Tag', color: 'Green', size: 'Medium', quantity: 1, price: 20 }];

function confirmation(discount?: number) {
    return getOrderConfirmationEmail({
        orderId: 'ORD-1',
        confirmationCode: 'ABC123',
        orderConfirmationUrl: 'https://notastray.com/shop/success?session_id=cs_1',
        customerName: 'Jamie Rivera',
        items,
        subtotal: 20,
        shippingCost: 0,
        discount,
        total: 20 - (discount ?? 0),
        estimatedDeliveryMin: '2026-08-15',
        estimatedDeliveryMax: '2026-08-17',
        shippingAddress,
    });
}

function merchant(discount?: number) {
    return getMerchantOrderEmail({
        orderId: 'ORD-1',
        confirmationCode: 'ABC123',
        customerEmail: 'jamie@example.com',
        customerName: 'Jamie Rivera',
        items,
        subtotal: 20,
        shippingCost: 0,
        tax: 0,
        discount,
        total: 20 - (discount ?? 0),
        shippingAddress,
    });
}

// A stray backtick in the output means a template literal was mis-nested while
// building the conditional discount row — cheap to check, easy to miss by eye.
function hasStrayBacktick(html: string): boolean {
    return html.includes('`');
}

describe('order confirmation email — discount line', () => {
    it('shows the discount and the discounted total when a code was used', () => {
        const { html, text } = confirmation(2);
        expect(html).toContain('Discount');
        expect(html).toContain('$2.00');
        expect(text).toContain('Discount: -$2.00');
        // Total must reflect the discount, not the subtotal.
        expect(text).toContain('Total: $18.00');
    });

    it('omits the discount line entirely when no code was used', () => {
        const { html, text } = confirmation(0);
        expect(html).not.toContain('Discount');
        expect(text).not.toContain('Discount');
        expect(text).toContain('Total: $20.00');
    });

    it('omits the discount line when the field is absent (pre-coupon orders)', () => {
        const { html, text } = confirmation(undefined);
        expect(html).not.toContain('Discount');
        expect(text).not.toContain('Discount');
    });

    it('produces well-formed HTML in both branches', () => {
        expect(hasStrayBacktick(confirmation(2).html)).toBe(false);
        expect(hasStrayBacktick(confirmation(0).html)).toBe(false);
    });
});

describe('merchant order email — discount line', () => {
    it('shows the discount when a code was used', () => {
        const { html, text } = merchant(2);
        expect(html).toContain('Discount');
        expect(text).toContain('Discount: -$2.00');
        expect(text).toContain('Total: $18.00');
    });

    it('omits the discount line when no code was used', () => {
        const { html, text } = merchant(0);
        expect(html).not.toContain('Discount');
        expect(text).not.toContain('Discount');
    });

    it('produces well-formed HTML in both branches', () => {
        expect(hasStrayBacktick(merchant(2).html)).toBe(false);
        expect(hasStrayBacktick(merchant(0).html)).toBe(false);
    });
});

// ─── Subscription emails ───────────────────────────────────────────────────
//
// These previously derived the price string from planType and ignored the
// planPrice argument entirely, so any promotion code (or a price change made in
// Stripe) would have produced an email quoting an amount the customer was never
// charged. These tests pin the price to what's actually passed in.

function subConfirmation(planPrice: number, amountPaidToday?: number) {
    return getSubscriptionConfirmationEmail({
        customerName: 'Jamie Rivera',
        planType: 'monthly',
        planPrice,
        amountPaidToday,
        renewalDate: 'September 10, 2026',
        dashboardUrl: 'https://notastray.com/dashboard',
    });
}

describe('subscription confirmation email', () => {
    it('shows a single amount line when nothing was discounted', () => {
        const { html, text } = subConfirmation(3);
        expect(text).toContain('Amount: $3.00/month');
        expect(text).not.toContain('Paid today');
        expect(html).toContain('$3.00');
    });

    it('distinguishes today\'s charge from the renewal price when discounted', () => {
        // "First month free": charged $0 now, but renews at the full $3.
        const { html, text } = subConfirmation(3, 0);
        expect(text).toContain('Paid today: $0.00');
        expect(text).toContain('Renews at: $3.00/month');
        expect(html).toContain('Paid today');
        expect(html).toContain('Renews at');
    });

    it('handles a partial discount on the annual plan', () => {
        // Black-Friday-style: 50% off the first year, renews at $30.
        const { text } = getSubscriptionConfirmationEmail({
            planType: 'yearly',
            planPrice: 30,
            amountPaidToday: 15,
            renewalDate: 'August 11, 2027',
            dashboardUrl: 'https://notastray.com/dashboard',
        });
        expect(text).toContain('Paid today: $15.00');
        expect(text).toContain('Renews at: $30.00/year');
    });

    it('uses the passed price rather than one inferred from planType', () => {
        // Guards the original bug: a price change in Stripe must flow through.
        const { text } = subConfirmation(4.5);
        expect(text).toContain('$4.50');
        expect(text).not.toContain('$3.00');
    });

    it('produces well-formed HTML in both branches', () => {
        expect(subConfirmation(3).html).not.toContain('`');
        expect(subConfirmation(3, 0).html).not.toContain('`');
    });
});

describe('merchant subscription email', () => {
    it('notes the amount actually collected when a code was used', () => {
        const { text } = getMerchantSubscriptionEmail({
            customerEmail: 'jamie@example.com',
            planType: 'monthly',
            planPrice: 3,
            amountPaidToday: 0,
        });
        expect(text).toContain('$3.00/month');
        expect(text).toContain('paid today: $0.00');
    });

    it('stays clean when there is no discount', () => {
        const { text, html } = getMerchantSubscriptionEmail({
            customerEmail: 'jamie@example.com',
            planType: 'yearly',
            planPrice: 30,
        });
        expect(text).toContain('$30.00/year');
        expect(text).not.toContain('paid today');
        expect(html).not.toContain('`');
    });
});

describe('renewal reminder email', () => {
    it('quotes the upcoming charge from the passed price', () => {
        const { text } = getRenewalReminderEmail({
            renewalDate: 'September 10, 2026',
            planType: 'monthly',
            planPrice: 3,
            manageSubscriptionUrl: 'https://notastray.com/dashboard',
            cancelUrl: 'https://notastray.com/dashboard',
        });
        expect(text).toContain('$3.00');
    });

    it('reflects a still-discounted renewal rather than list price', () => {
        // A 'repeating' coupon can leave the next charge discounted too.
        const { text } = getRenewalReminderEmail({
            renewalDate: 'September 10, 2026',
            planType: 'monthly',
            planPrice: 1.5,
            manageSubscriptionUrl: 'https://notastray.com/dashboard',
            cancelUrl: 'https://notastray.com/dashboard',
        });
        expect(text).toContain('$1.50');
        expect(text).not.toContain('$3.00');
    });
});
