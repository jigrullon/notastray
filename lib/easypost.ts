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

// Your home address (origin for all shipments)
const FROM_ADDRESS = {
  street1: process.env.FROM_STREET || '',
  street2: process.env.FROM_STREET2 || '',
  city: process.env.FROM_CITY || '',
  state: process.env.FROM_STATE || '',
  zip: process.env.FROM_ZIP || '',
  country: 'US',
};

const PARCEL = {
  length: 5,
  width: 5,
  height: 1,
  weight: 2, // ounces - adjust based on actual tag weight with packaging
};

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
  destinationCountry: string = 'US'
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
      parcel: PARCEL,
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
}): Promise<ShipmentResponse> {
  try {
    const { toAddress, carrierAccountId } = options;

    if (!FROM_ADDRESS.zip || !FROM_ADDRESS.state || !FROM_ADDRESS.city) {
      throw new Error('FROM_ADDRESS not fully configured in environment variables');
    }

    // Create shipment
    const shipment = await getClient().Shipment.create({
      to_address: {
        name: toAddress.name,
        street1: toAddress.street1,
        street2: toAddress.street2 || '',
        city: toAddress.city,
        state: toAddress.state,
        zip: toAddress.zip,
        country: toAddress.country || 'US',
      },
      from_address: FROM_ADDRESS,
      parcel: PARCEL,
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

    // Buy the label
    const label: any = await getClient().Shipment.buy(shipment.id, groundRate);

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
