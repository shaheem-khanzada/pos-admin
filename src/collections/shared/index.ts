/** Pakistani Rupee — single currency for this POS. */
export const PKR = {
  code: 'PKR',
  decimals: 2,
  label: 'Pakistani Rupee',
  symbol: 'Rs',
} as const

export const currenciesConfig = {
  defaultCurrency: 'PKR',
  supportedCurrencies: [PKR],
}
