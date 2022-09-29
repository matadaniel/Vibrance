export type Network = {
  name: string
  chainId: number
  ensAddress?: string
  _defaultProvider?: (providers: any, options?: any) => any
}

const networks = { 31337: 'localhost', 1337: 'gethDev' } as const

export const getNet = (network: Network) => {
  const { chainId } = network
  if (networks.hasOwnProperty(chainId)) return networks[chainId as keyof typeof networks]
  throw new Error(`Chain ${chainId} is unsupported`)
}

export const verifyNet = (chainId: Network['chainId']) => {
  switch (process.env.NODE_ENV) {
    case 'development':
      if (chainId !== 1337) throw new Error('Could not to connect to gethDev')
      break
    default:
      throw new Error(`Unhandled NODE_ENV: ${process.env.NODE_ENV}`)
  }
}
