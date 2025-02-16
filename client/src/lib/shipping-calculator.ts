// TODO: Replace static shipping rates with live carrier API integrations
// Required APIs:
// UK Carriers:
// - Royal Mail Shipping API (https://developer.royalmail.net/)
// - DPD API (https://www.dpd.co.uk/business/sending/integration.jsp)
// - Evri API (https://www.evri.com/business)
//
// US Carriers:
// - USPS Web Tools API (https://www.usps.com/business/web-tools-apis/)
// - UPS Developer API (https://www.ups.com/upsdeveloperkit)
// - FedEx Web Services (https://www.fedex.com/en-us/developer.html)

import { z } from "zod";

interface PackageDimensions {
  length: number;
  width: number;
  height: number;
}

interface ShippingZone {
  name: string;
  postcodes: string[];
  priceMultiplier: number;
}

interface ShippingProvider {
  name: string;
  country: "UK" | "US";
  speeds: {
    name: string;
    multiplier: number;
    estimatedDays: string;
  }[];
  baseRates: ShippingRate[];
}

interface ShippingRate {
  maxWeight: number; // in grams
  maxSize: number; // in cm (length + width + height)
  price: number; // in local currency (GBP or USD)
}

// UK postcodes grouped by zones
const UK_SHIPPING_ZONES: ShippingZone[] = [
  {
    name: "London",
    postcodes: ["E", "EC", "N", "NW", "SE", "SW", "W", "WC"],
    priceMultiplier: 1.0,
  },
  {
    name: "South England",
    postcodes: ["BN", "CT", "GU", "ME", "OX", "PO", "RG", "SL", "TN"],
    priceMultiplier: 1.1,
  },
  {
    name: "North England",
    postcodes: ["BB", "BD", "DN", "HD", "HG", "HU", "HX", "LS", "M", "OL", "S", "WF", "YO"],
    priceMultiplier: 1.2,
  },
  {
    name: "Scotland",
    postcodes: ["AB", "DD", "DG", "EH", "FK", "G", "IV", "KA", "KY", "ML", "PA", "PH", "TD"],
    priceMultiplier: 1.3,
  },
];

// US ZIP codes grouped by zones (simplified version)
const US_SHIPPING_ZONES = [
  {
    name: "Zone 1 (Northeast)",
    postcodes: ["0", "1"],
    priceMultiplier: 1.0,
  },
  {
    name: "Zone 2 (Southeast)",
    postcodes: ["2", "3"],
    priceMultiplier: 1.1,
  },
  {
    name: "Zone 3 (Midwest)",
    postcodes: ["4", "5", "6"],
    priceMultiplier: 1.2,
  },
  {
    name: "Zone 4 (West)",
    postcodes: ["7", "8", "9"],
    priceMultiplier: 1.3,
  },
];

const SHIPPING_PROVIDERS: ShippingProvider[] = [
  // UK Providers
  {
    name: "Royal Mail",
    country: "UK",
    speeds: [
      { name: "Standard", multiplier: 1.0, estimatedDays: "3-5 business days" },
      { name: "First Class", multiplier: 1.5, estimatedDays: "1-2 business days" },
      { name: "Special Delivery", multiplier: 2.0, estimatedDays: "Next business day" },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 3.95 },
      { maxWeight: 2000, maxSize: 100, price: 5.95 },
      { maxWeight: 5000, maxSize: 150, price: 8.95 },
      { maxWeight: 10000, maxSize: 200, price: 12.95 },
    ],
  },
  {
    name: "DPD",
    country: "UK",
    speeds: [
      { name: "Standard", multiplier: 1.2, estimatedDays: "2-3 business days" },
      { name: "Express", multiplier: 1.8, estimatedDays: "1-2 business days" },
      { name: "Next Day", multiplier: 2.2, estimatedDays: "Next business day" },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 4.95 },
      { maxWeight: 2000, maxSize: 100, price: 6.95 },
      { maxWeight: 5000, maxSize: 150, price: 9.95 },
      { maxWeight: 10000, maxSize: 200, price: 14.95 },
    ],
  },
  {
    name: "Evri",
    country: "UK",
    speeds: [
      { name: "Standard", multiplier: 1.0, estimatedDays: "3-5 business days" },
      { name: "Next Day", multiplier: 1.8, estimatedDays: "Next business day" },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 3.49 },
      { maxWeight: 2000, maxSize: 100, price: 4.99 },
      { maxWeight: 5000, maxSize: 150, price: 7.99 },
      { maxWeight: 10000, maxSize: 200, price: 11.99 },
    ],
  },
  // US Providers
  {
    name: "USPS",
    country: "US",
    speeds: [
      { name: "First-Class Package", multiplier: 1.0, estimatedDays: "2-5 business days" },
      { name: "Priority Mail", multiplier: 1.5, estimatedDays: "1-3 business days" },
      { name: "Priority Mail Express", multiplier: 2.5, estimatedDays: "1-2 business days" },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 4.50 },
      { maxWeight: 2000, maxSize: 100, price: 6.50 },
      { maxWeight: 5000, maxSize: 150, price: 9.50 },
      { maxWeight: 10000, maxSize: 200, price: 13.50 },
    ],
  },
  {
    name: "UPS",
    country: "US",
    speeds: [
      { name: "Ground", multiplier: 1.2, estimatedDays: "1-5 business days" },
      { name: "3 Day Select", multiplier: 1.8, estimatedDays: "3 business days" },
      { name: "2nd Day Air", multiplier: 2.2, estimatedDays: "2 business days" },
      { name: "Next Day Air", multiplier: 3.0, estimatedDays: "Next business day" },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 5.95 },
      { maxWeight: 2000, maxSize: 100, price: 7.95 },
      { maxWeight: 5000, maxSize: 150, price: 10.95 },
      { maxWeight: 10000, maxSize: 200, price: 15.95 },
    ],
  },
  {
    name: "FedEx",
    country: "US",
    speeds: [
      { name: "Ground", multiplier: 1.2, estimatedDays: "1-5 business days" },
      { name: "Express Saver", multiplier: 1.8, estimatedDays: "3 business days" },
      { name: "2Day", multiplier: 2.2, estimatedDays: "2 business days" },
      { name: "Priority Overnight", multiplier: 3.0, estimatedDays: "Next business day" },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 5.95 },
      { maxWeight: 2000, maxSize: 100, price: 7.95 },
      { maxWeight: 5000, maxSize: 150, price: 10.95 },
      { maxWeight: 10000, maxSize: 200, price: 15.95 },
    ],
  },
];

function getZoneMultiplier(postcode: string, country: "UK" | "US"): number {
  const zones = country === "UK" ? UK_SHIPPING_ZONES : US_SHIPPING_ZONES;
  const prefix = postcode.toUpperCase().replace(/[0-9]/g, '');

  if (country === "US") {
    const firstDigit = postcode.charAt(0);
    const zone = zones.find(zone =>
      zone.postcodes.includes(firstDigit)
    );
    return zone?.priceMultiplier || 1.2;
  }

  const zone = zones.find(zone =>
    zone.postcodes.some(code => prefix.startsWith(code))
  );
  return zone?.priceMultiplier || 1.2;
}

export interface ShippingOption {
  provider: string;
  speed: string;
  price: number;
  estimatedDays: string;
  country: "UK" | "US";
}

export function isUKPostcode(postcode: string): boolean {
  // UK postcode regex pattern
  const ukPattern = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return ukPattern.test(postcode);
}

export function isUSZipCode(zipCode: string): boolean {
  // US ZIP code regex pattern (including ZIP+4)
  const usPattern = /^\d{5}(-\d{4})?$/;
  return usPattern.test(zipCode);
}

export function calculateShippingOptions(
  totalWeight: number,
  dimensions: PackageDimensions[],
  postcode: string,
  vendorShippingOverride?: number
): ShippingOption[] {
  if (vendorShippingOverride !== undefined) {
    return [{
      provider: "Vendor Rate",
      speed: "Standard",
      price: vendorShippingOverride,
      estimatedDays: "3-5 business days",
      country: "UK", // Default to UK for vendor rates
    }];
  }

  // Determine if it's a UK or US delivery based on the postcode format
  const isUK = isUKPostcode(postcode);
  const isUS = isUSZipCode(postcode);

  if (!isUK && !isUS) {
    throw new Error("Invalid postcode/ZIP code format");
  }

  const country = isUK ? "UK" : "US";
  const totalSize = dimensions.reduce((acc, dim) => {
    return acc + dim.length + dim.width + dim.height;
  }, 0);

  console.log(`Calculating shipping for:
    Country: ${country}
    Total Weight: ${totalWeight}g
    Total Size: ${totalSize}cm
    Delivery Postcode: ${postcode}`);

  const zoneMultiplier = getZoneMultiplier(postcode, country);
  const availableProviders = SHIPPING_PROVIDERS.filter(p => p.country === country);

  const options: ShippingOption[] = [];

  availableProviders.forEach(provider => {
    const baseRate = provider.baseRates.find(
      rate => totalWeight <= rate.maxWeight && totalSize <= rate.maxSize
    ) || provider.baseRates[provider.baseRates.length - 1];

    provider.speeds.forEach(speed => {
      const finalPrice = baseRate.price * speed.multiplier * zoneMultiplier;

      options.push({
        provider: provider.name,
        speed: speed.name,
        price: Number(finalPrice.toFixed(2)),
        estimatedDays: speed.estimatedDays,
        country,
      });
    });
  });

  console.log('Available shipping options:', options);
  return options;
}