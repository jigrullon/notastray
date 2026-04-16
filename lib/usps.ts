/**
 * USPS API v3 Client
 * Handles real-time shipping rate quotes using OAuth2-based USPS API v3
 * Documentation: https://developers.usps.com/domesticpricesv3
 */

import { WAREHOUSE_ZIP, USPS_SERVICES, USPS_API_CONFIG, PACKAGE_DIMENSIONS } from './shipping-config';

export interface ShippingRate {
  service: string;
  cost: number;
  minDays: number;
  maxDays: number;
  displayName: string;
}

interface USPSTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface USPSRatesResponse {
  totalBasePrice: number;
  totalPrice: number;
  rates: Array<{
    mailClass: string;
    price: number;
  }>;
}

// In-memory token cache (consider Redis for production)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token for USPS API v3
 */
async function getUSPSAccessToken(): Promise<string> {
  // Check if cached token is still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const { consumerKey, consumerSecret, tokenEndpoint } = USPS_API_CONFIG;

  if (!consumerKey || !consumerSecret) {
    console.error('USPS Consumer Key/Secret not configured');
    throw new Error('Shipping service unavailable. Please try again later.');
  }

  try {
    // USPS API v3 OAuth2: send credentials in request body (not Basic Auth header)
    // This is required for USPS's OAuth2 implementation
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: consumerKey,
      client_secret: consumerSecret,
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('USPS OAuth token error:', errorText);
      throw new Error('Failed to authenticate with USPS API');
    }

    const data: USPSTokenResponse = await response.json();

    // Cache token with expiration (subtract 60s for safety margin)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    console.log('USPS OAuth token obtained successfully, expires in:', data.expires_in, 'seconds');
    return data.access_token;
  } catch (error) {
    console.error('USPS token request error:', error);
    throw new Error('Unable to authenticate with shipping service. Please try again later.');
  }
}

/**
 * Query USPS API v3 for shipping rates
 * @param destinationZip - Customer's ZIP code
 * @param weight - Package weight in ounces
 * @returns Array of available shipping rates
 */
export async function getUSPSRates(
  destinationZip: string,
  weight: number
): Promise<ShippingRate[]> {
  const { crid, mid, accountType, priceType, pricesEndpoint } = USPS_API_CONFIG;

  if (!crid || !mid) {
    console.error('USPS CRID or MID not configured');
    throw new Error('Shipping service unavailable. Please try again later.');
  }

  const accessToken = await getUSPSAccessToken();

  // Get today's date in YYYY-MM-DD format for mailingDate
  const mailingDate = new Date().toISOString().split('T')[0];

  // Build request for Priority Mail
  const priorityRequest = {
    originZIPCode: WAREHOUSE_ZIP,
    destinationZIPCode: destinationZip,
    weight,
    length: PACKAGE_DIMENSIONS.length,
    width: PACKAGE_DIMENSIONS.width,
    height: PACKAGE_DIMENSIONS.height,
    mailClass: USPS_SERVICES.PRIORITY.mailClass,
    priceType,
    mailingDate,
    accountType,
    accountNumber: mid,
  };

  // Build request for Express Mail
  const expressRequest = {
    originZIPCode: WAREHOUSE_ZIP,
    destinationZIPCode: destinationZip,
    weight,
    length: PACKAGE_DIMENSIONS.length,
    width: PACKAGE_DIMENSIONS.width,
    height: PACKAGE_DIMENSIONS.height,
    mailClass: USPS_SERVICES.EXPRESS.mailClass,
    priceType,
    mailingDate,
    accountType,
    accountNumber: mid,
  };

  try {
    // Fetch rates for both services in parallel
    const [priorityResponse, expressResponse] = await Promise.all([
      fetchUSPSRate(accessToken, priorityRequest, pricesEndpoint),
      fetchUSPSRate(accessToken, expressRequest, pricesEndpoint),
    ]);

    const rates: ShippingRate[] = [];

    // Add Priority Mail rate
    if (priorityResponse && priorityResponse.totalPrice) {
      rates.push({
        service: 'Priority',
        cost: priorityResponse.totalPrice,
        minDays: USPS_SERVICES.PRIORITY.minDays,
        maxDays: USPS_SERVICES.PRIORITY.maxDays,
        displayName: USPS_SERVICES.PRIORITY.displayName,
      });
    }

    // Add Express Mail rate
    if (expressResponse && expressResponse.totalPrice) {
      rates.push({
        service: 'Express',
        cost: expressResponse.totalPrice,
        minDays: USPS_SERVICES.EXPRESS.minDays,
        maxDays: USPS_SERVICES.EXPRESS.maxDays,
        displayName: USPS_SERVICES.EXPRESS.displayName,
      });
    }

    if (rates.length === 0) {
      throw new Error('No shipping services available for this address');
    }

    return rates;
  } catch (error) {
    console.error('USPS rates API error:', error);
    const message = error instanceof Error ? error.message : 'Unable to calculate shipping rates';
    throw new Error(message);
  }
}

/**
 * Fetch rate from USPS API v3 for a specific mail class
 */
async function fetchUSPSRate(
  accessToken: string,
  requestBody: Record<string, any>,
  endpoint: string
): Promise<USPSRatesResponse | null> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`USPS rates error (${requestBody.mailClass}):`, errorText);
      return null;
    }

    const data: USPSRatesResponse = await response.json();
    return data;
  } catch (error) {
    console.error(`USPS rates fetch error (${requestBody.mailClass}):`, error);
    return null;
  }
}
