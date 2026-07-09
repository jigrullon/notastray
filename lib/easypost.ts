import EasyPost from '@easypost/api';

// Lazy initialization - only create client when actually needed
let client: any = null;

function getClient(): any {
  if (!client) {
    const apiKey = process.env.EASYPOST_API_KEY;
    if (!apiKey) {
      throw new Error('EASYPOST_API_KEY environment variable is not set');
    }
    client = new EasyPost(apiKey);
  }
  return client;
}

// Origin / return address for all shipments (env-driven).
// FROM_COMPANY controls what prints on the label's From block (e.g.
// "NotAStray LLC"). FROM_NAME is optional — leave it unset to keep personal
// names off the label; EasyPost accepts company-only addresses.
const FROM_ADDRESS = {
  name: process.env.FROM_NAME || undefined,
  company: process.env.FROM_COMPANY || undefined,
  street1: process.env.FROM_STREET || '',
  street2: process.env.FROM_STREET2 || '',
  city: process.env.FROM_CITY || '',
  state: process.env.FROM_STATE || '',
  zip: process.env.FROM_ZIP || '',
  country: 'US',
};

// Mailer dimensions (inches). Weight is computed per-order — see
// calculateShipmentWeightOz below.
const PARCEL_DIMENSIONS = {
  length: 9,
  width: 7,
  height: 1,
};

// Shipment weight model: empty mailer + per-tag weight. Defaults are
// calibrated so a single-tag order ≈ 1.1 oz (measured). Override via env
// after weighing real packaging: ENVELOPE_WEIGHT_OZ, TAG_WEIGHT_OZ.
const ENVELOPE_WEIGHT_OZ = parseFloat(process.env.ENVELOPE_WEIGHT_OZ || '0.7');
const TAG_WEIGHT_OZ = parseFloat(process.env.TAG_WEIGHT_OZ || '0.4');

/**
 * Total shipment weight in ounces for an order containing `tagCount` tags.
 * USPS Ground Advantage prices sub-1lb parcels in 4 oz tiers, so small
 * per-tag differences rarely change the rate — but the computed weight keeps
 * postage honest as order sizes grow.
 */
export function calculateShipmentWeightOz(tagCount: number): number {
  const count = Math.max(1, tagCount);
  // Round up to one decimal; never report less than 1 oz.
  return Math.max(1, Math.round((ENVELOPE_WEIGHT_OZ + TAG_WEIGHT_OZ * count) * 10) / 10);
}

function buildParcel(weightOz?: number) {
  return {
    ...PARCEL_DIMENSIONS,
    weight: weightOz ?? calculateShipmentWeightOz(1),
  };
}

export interface ShippingRate {
  service: string;
  cost: number;
  minDays: number;
  maxDays: number;
  displayName: string;
  carrier: string;
  rate_id?: string;
}

export interface ShippingAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  // Buyer contact info. email is REQUIRED for WeSupply to auto-subscribe the
  // customer to shipping-status notifications — a null email on the EasyPost
  // address shows as "Not Subscribed" in WeSupply and no tracking emails send.
  email?: string;
  phone?: string;
}

export interface ShipmentResponse {
  tracking_number: string;
  label_url: string;
  label_pdf_url?: string;
  shipment_id: string;
  carrier: string;
  service: string;
}

export async function getRates(
  toZip: string,
  destinationCountry: string = 'US',
  weightOz?: number
): Promise<ShippingRate[]> {
  try {
    if (!FROM_ADDRESS.zip || !FROM_ADDRESS.state || !FROM_ADDRESS.city) {
      throw new Error('FROM_ADDRESS not fully configured in environment variables');
    }

    // Create shipment to get rates (don't buy yet)
    const shipment = await getClient().Shipment.create({
      to_address: {
        zip: toZip,
        country: destinationCountry,
      },
      from_address: FROM_ADDRESS,
      parcel: buildParcel(weightOz),
    });

    if (!shipment.rates || shipment.rates.length === 0) {
      return [];
    }

    // Filter to USPS Ground only, sort by price
    const uspsRates = shipment.rates
      .filter(
        (rate: any) =>
          rate.carrier.toUpperCase() === 'USPS' &&
          rate.service.toUpperCase().includes('GROUND')
      )
      .sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate));

    if (uspsRates.length === 0) {
      // Fallback: return all USPS if no Ground available
      return shipment.rates
        .filter((rate: any) => rate.carrier.toUpperCase() === 'USPS')
        .slice(0, 1)
        .map((rate: any) => ({
          service: 'usps_ground',
          cost: parseFloat(rate.rate),
          minDays: 5,
          maxDays: 7,
          displayName: `${rate.service} (5-7 business days)`,
          carrier: 'USPS',
          rate_id: rate.id,
        }));
    }

    // Map EasyPost rates to our format
    return uspsRates.map((rate: any) => ({
      service: 'usps_ground',
      cost: parseFloat(rate.rate),
      minDays: 5,
      maxDays: 7,
      displayName: 'USPS Ground (5-7 business days)',
      carrier: 'USPS',
      rate_id: rate.id,
    }));
  } catch (error) {
    console.error('EasyPost getRates error:', error);
    throw error;
  }
}

export async function createShipment(options: {
  toAddress: ShippingAddress;
  carrierAccountId?: string;
  reference?: string;
  weightOz?: number;
}): Promise<ShipmentResponse> {
  try {
    const { toAddress, carrierAccountId, reference, weightOz } = options;

    if (!FROM_ADDRESS.zip || !FROM_ADDRESS.state || !FROM_ADDRESS.city) {
      throw new Error('FROM_ADDRESS not fully configured in environment variables');
    }

    // Create shipment. `reference` (our orderId) is stored on the EasyPost
    // shipment so the label is identifiable in the dashboard and the tracker
    // webhook can be matched back to the order even if the tracking number
    // isn't the lookup key.
    const shipment = await getClient().Shipment.create({
      to_address: {
        name: toAddress.name,
        street1: toAddress.street1,
        street2: toAddress.street2 || '',
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zip,
        country: toAddress.country || 'US',
        // Forwarded so WeSupply can auto-subscribe the buyer to tracking emails
        email: toAddress.email || undefined,
        phone: toAddress.phone || undefined,
      },
      from_address: FROM_ADDRESS,
      parcel: buildParcel(weightOz),
      reference: reference || undefined,
      carrier_accounts: carrierAccountId ? [carrierAccountId] : [],
    });

    // Get USPS Ground rate
    const groundRate = shipment.rates.find(
      (rate: any) =>
        rate.carrier.toUpperCase() === 'USPS' &&
        rate.service.toUpperCase().includes('GROUND')
    );

    if (!groundRate) {
      throw new Error('No USPS Ground rate available for this address');
    }

    console.log('Ground rate ID:', groundRate.id);
    console.log('Shipment ID:', shipment.id);

    // Use HTTP request directly to buy the shipment
    const apiKey = process.env.EASYPOST_API_KEY;
    if (!apiKey) {
      throw new Error('EASYPOST_API_KEY is not configured');
    }

    const buyResponse = await fetch(
      `https://api.easypost.com/v2/shipments/${shipment.id}/buy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate: {
            id: groundRate.id,
          },
        }),
      }
    );

    if (!buyResponse.ok) {
      const error = await buyResponse.text();
      console.error('EasyPost buy response error:', error);
      throw new Error(`Failed to buy shipment: ${error}`);
    }

    const label: any = await buyResponse.json();

    return {
      tracking_number: label.tracking_code,
      label_url: label.label_download?.url || '',
      label_pdf_url: label.label_download?.pdf,
      shipment_id: label.id,
      carrier: 'USPS',
      service: 'Ground',
    };
  } catch (error) {
    console.error('EasyPost createShipment error:', error);
    throw error;
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  try {
    const webhookSecret = process.env.EASYPOST_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('EASYPOST_WEBHOOK_SECRET not configured');
      return false;
    }

    // EasyPost webhook signature verification
    // They use HMAC-SHA256
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

export async function getTrackerByCode(trackingCode: string) {
  try {
    const tracker = await getClient().Tracker.retrieve(trackingCode);
    return tracker;
  } catch (error) {
    console.error('Error retrieving tracker:', error);
    throw error;
  }
}
