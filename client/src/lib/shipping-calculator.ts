interface PackageDimensions {
  length: number;
  width: number;
  height: number;
}

interface ShippingRate {
  maxWeight: number; // in grams
  maxSize: number; // in cm (length + width + height)
  price: number; // in GBP
}

// Example UK shipping rates - these would typically come from your backend
const UK_SHIPPING_RATES: ShippingRate[] = [
  { maxWeight: 1000, maxSize: 50, price: 3.95 }, // Small packages up to 1kg
  { maxWeight: 2000, maxSize: 100, price: 5.95 }, // Medium packages up to 2kg
  { maxWeight: 5000, maxSize: 150, price: 8.95 }, // Large packages up to 5kg
  { maxWeight: 10000, maxSize: 200, price: 12.95 }, // Extra large packages up to 10kg
];

export function calculateShippingCost(
  totalWeight: number,
  dimensions: PackageDimensions[]
): number {
  // Calculate total size (sum of largest dimensions)
  const totalSize = dimensions.reduce((acc, dim) => {
    return acc + dim.length + dim.width + dim.height;
  }, 0);

  // Find applicable rate based on weight and size
  const applicableRate = UK_SHIPPING_RATES.find(
    (rate) => totalWeight <= rate.maxWeight && totalSize <= rate.maxSize
  );

  return applicableRate?.price || UK_SHIPPING_RATES[UK_SHIPPING_RATES.length - 1].price;
}
