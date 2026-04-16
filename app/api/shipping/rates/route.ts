import { NextResponse } from 'next/server';
import { getUSPSRates, ShippingRate } from '@/lib/usps';
import { calculatePackageWeight } from '@/lib/shipping-config';

interface RatesRequest {
  destinationZip: string;
  items?: Array<{ quantity: number }>;
}

export async function POST(request: Request) {
  try {
    const body: RatesRequest = await request.json();
    const { destinationZip, items = [{ quantity: 1 }] } = body;

    // Validate input
    if (!destinationZip || !/^\d{5}(-\d{4})?$/.test(destinationZip)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format. Please use 5 digits (e.g., 12345)' },
        { status: 400 }
      );
    }

    // Calculate package weight
    const weight = calculatePackageWeight(items);

    // Get rates from USPS
    const rates = await getUSPSRates(destinationZip.slice(0, 5), weight);

    return NextResponse.json({
      rates,
      zipCode: destinationZip,
      weight,
    });
  } catch (error: any) {
    console.error('Shipping rates error:', error);
    const message =
      error.message || 'Unable to calculate shipping rates. Please try again later.';

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
