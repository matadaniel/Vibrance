import { ethers } from 'ethers'
import * as deployments from '../deployments'
import * as deploymentBlocks from '../deployments/blocks'
import { getNet, Network } from './networks'

export const getContractInfo = async (
  contract: string,
  provider: ethers.providers.Provider,
  signer?: ethers.Signer
): Promise<[string, ethers.ContractInterface, ethers.providers.Provider | ethers.Signer]> => {
  const net = getNet(await provider.getNetwork())
  if (!deployments.hasOwnProperty(net)) throw new Error(`${net} deployments not found`)
  const contracts = deployments[net as keyof typeof deployments]
  if (contracts.hasOwnProperty(contract))
    return [...contracts[contract as keyof typeof contracts], signer ?? provider]
  throw new Error(`"${contract}" contract not found`)
}

export const getAddress = (network: Network, contract: string) => {
  if (ethers.utils.isAddress(contract)) return contract
  const net = getNet(network)
  if (!deployments.hasOwnProperty(net)) throw new Error(`${net} deployments not found`)
  const contracts = deployments[net as keyof typeof deployments]
  if (contracts.hasOwnProperty(contract)) return contracts[contract as keyof typeof contracts][0]
}

export const getName = (network: Network, address: string) => {
  const net = getNet(network)
  if (!deployments.hasOwnProperty(net)) throw new Error(`${net} deployments not found`)
  const contracts = deployments[net as keyof typeof deployments]
  const keys = Object.keys(contracts) as Array<keyof typeof contracts>
  return keys.find(key => contracts[key][0] === address) ?? address
}

export const getContractBlock = (network: Network, contract: string) => {
  const net = getNet(network)
  if (!deploymentBlocks.hasOwnProperty(net)) throw new Error(`${net} blocks not found`)
  const blocks = deploymentBlocks[net as keyof typeof deploymentBlocks]
  if (blocks.hasOwnProperty(`${contract}Block`))
    return blocks[`${contract}Block` as keyof typeof blocks]
  throw new Error(`"${contract}" block not found`)
}
