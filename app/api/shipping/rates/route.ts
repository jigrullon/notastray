import { NextResponse } from 'next/server';
import { getRates } from '@/lib/easypost';

interface RatesRequest {
  destinationZip: string;
  items?: Array<{ quantity: number }>;
}

export async function POST(request: Request) {
  try {
    const body: RatesRequest = await request.json();
    const { destinationZip } = body;

    // Validate ZIP code
    if (!destinationZip || !/^\d{5}(-\d{4})?$/.test(destinationZip)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code. Please enter a 5-digit ZIP.' },
        { status: 400 }
      );
    }

    // Get rates from EasyPost
    const rates = await getRates(destinationZip);

    if (rates.length === 0) {
      return NextResponse.json(
        {
          error: 'Shipping not available to this address. Please try a different ZIP code.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ rates });
  } catch (error) {
    console.error('Shipping rates error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to calculate shipping rates. Please try again.',
      },
      { status: 500 }
    );
  }
}
