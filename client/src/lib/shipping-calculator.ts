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
  speeds: {
    name: string;
    multiplier: number;
  }[];
  baseRates: ShippingRate[];
}

interface ShippingRate {
  maxWeight: number; // in grams
  maxSize: number; // in cm (length + width + height)
  price: number; // in GBP
}

// UK postcodes grouped by zones (simplified version)
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

const SHIPPING_PROVIDERS: ShippingProvider[] = [
  {
    name: "Royal Mail",
    speeds: [
      { name: "Standard", multiplier: 1.0 },
      { name: "First Class", multiplier: 1.5 },
      { name: "Special Delivery", multiplier: 2.0 },
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
    speeds: [
      { name: "Standard", multiplier: 1.2 },
      { name: "Express", multiplier: 1.8 },
      { name: "Next Day", multiplier: 2.2 },
    ],
    baseRates: [
      { maxWeight: 1000, maxSize: 50, price: 4.95 },
      { maxWeight: 2000, maxSize: 100, price: 6.95 },
      { maxWeight: 5000, maxSize: 150, price: 9.95 },
      { maxWeight: 10000, maxSize: 200, price: 14.95 },
    ],
  },
];

function getZoneMultiplier(postcode: string): number {
  const prefix = postcode.toUpperCase().replace(/[0-9]/g, '');
  const zone = UK_SHIPPING_ZONES.find(zone => 
    zone.postcodes.some(code => prefix.startsWith(code))
  );
  return zone?.priceMultiplier || 1.2; // Default multiplier for other areas
}

export interface ShippingOption {
  provider: string;
  speed: string;
  price: number;
  estimatedDays: string;
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
      estimatedDays: "3-5 business days"
    }];
  }

  const totalSize = dimensions.reduce((acc, dim) => {
    return acc + dim.length + dim.width + dim.height;
  }, 0);

  console.log(`Calculating shipping for:
    Total Weight: ${totalWeight}g
    Total Size: ${totalSize}cm
    Delivery Postcode: ${postcode}`);

  const zoneMultiplier = getZoneMultiplier(postcode);

  const options: ShippingOption[] = [];

  SHIPPING_PROVIDERS.forEach(provider => {
    const baseRate = provider.baseRates.find(
      rate => totalWeight <= rate.maxWeight && totalSize <= rate.maxSize
    ) || provider.baseRates[provider.baseRates.length - 1];

    provider.speeds.forEach(speed => {
      const finalPrice = baseRate.price * speed.multiplier * zoneMultiplier;

      options.push({
        provider: provider.name,
        speed: speed.name,
        price: Number(finalPrice.toFixed(2)),
        estimatedDays: speed.name === "Standard" ? "3-5 business days" :
                      speed.name.includes("Next") ? "Next business day" : "1-2 business days"
      });
    });
  });

  console.log('Available shipping options:', options);
  return options;
}