/**
 * Helper function to get country-specific account numbers
 */
export function getCountrySpecificAccounts(countryCode: string) {
  switch (countryCode) {
    case 'ES':
      return {
        services: '70501',
        products: '70101',
        cash: '570',
        banks: '572',
        discounts: '7129',
        expenses: '610'
      };
    case 'FR':
      return {
        services: '706',
        products: '707',
        cash: '530',
        banks: '512',
        discounts: '709',
        expenses: '60'
      };
    case 'MA':
      return {
        services: '7121',
        products: '7111',
        cash: '5161',
        banks: '514',
        discounts: '7129',
        expenses: '611'
      };
    case 'PT':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        discounts: '709',
        expenses: '610'
      };
    case 'IT':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        discounts: '709',
        expenses: '610'
      };
    case 'DE':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        discounts: '709',
        expenses: '610'
      };
    case 'GB':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        discounts: '709',
        expenses: '610'
      };
    case 'US':
      return {
        services: '712',
        products: '711',
        cash: '521',
        banks: '512',
        discounts: '709',
        expenses: '610'
      };
    case 'MX':
      return {
        services: '401',
        products: '402',
        cash: '101',
        banks: '102',
        discounts: '403',
        expenses: '601'
      };
    default:
      return {
        services: '70501',
        products: '70101',
        cash: '570',
        banks: '572',
        discounts: '7129',
        expenses: '610'
      };
  }
}
