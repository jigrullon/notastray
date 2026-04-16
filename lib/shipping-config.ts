/**
 * Shipping configuration for NotAStray
 * Defines package weights, warehouse location, and USPS service mappings
 * Uses USPS API v3 (OAuth2-based REST API)
 */

export const WAREHOUSE_ZIP = process.env.NEXT_PUBLIC_WAREHOUSE_ZIP || '31548';

/**
 * Item weights in ounces
 * These are used to calculate total package weight for USPS rate quotes
 */
export const ITEM_WEIGHTS: Record<string, number> = {
  'pet-tag': 2, // Individual pet tag
  'packaging': 3, // Packaging materials (box, padding, etc.)
};

/**
 * Package dimensions for USPS rate quotes
 * Required for USPS API v3
 * Standard small box for pet tags
 */
export const PACKAGE_DIMENSIONS = {
  length: 6, // inches
  width: 4, // inches
  height: 1, // inches
};

/**
 * USPS Service type definitions
 * Maps to USPS API v3 mailClass codes
 * Reference: https://developers.usps.com/domesticpricesv3
 */
export const USPS_SERVICES = {
  PRIORITY: {
    mailClass: 'PRIORITY_MAIL', // USPS Priority Mail
    displayName: 'USPS Priority Mail (2-3 business days)',
    minDays: 2,
    maxDays: 3,
  },
  EXPRESS: {
    mailClass: 'PRIORITY_MAIL_EXPRESS', // USPS Priority Mail Express
    displayName: 'USPS Priority Mail Express (1-2 business days)',
    minDays: 1,
    maxDays: 2,
  },
} as const;

/**
 * USPS API v3 Configuration
 * These should be set in environment variables
 */
export const USPS_API_CONFIG = {
  consumerKey: process.env.USPS_CONSUMER_KEY || '',
  consumerSecret: process.env.USPS_CONSUMER_SECRET || '',
  crid: process.env.USPS_CRID || '',
  mid: process.env.USPS_MID || '', // Label Mailer ID
  accountType: 'EPS', // Enterprise Postal Service
  priceType: 'COMMERCIAL', // Use COMMERCIAL for better rates (requires account setup)
  tokenEndpoint: 'https://apis.usps.com/oauth2/v3/token',
  pricesEndpoint: 'https://apis.usps.com/prices/v3/total-rates/search',
};

/**
 * Calculate total package weight in ounces
 * Includes item weight + packaging
 */
export function calculatePackageWeight(items: Array<{ quantity: number }>): number {
  const itemWeight = (items[0]?.quantity || 1) * ITEM_WEIGHTS['pet-tag'];
  const packagingWeight = ITEM_WEIGHTS['packaging'];
  return itemWeight + packagingWeight;
}
