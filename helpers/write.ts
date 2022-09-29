import { isAddress } from 'ethers/lib/utils'
import { appendFileSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'

export const writeContract = (
  contractName: string,
  address: string,
  block: number,
  networkName: string
) => {
  if (!existsSync(`./artifacts/contracts/${contractName}.sol/${contractName}.json`))
    throw new Error(`"${contractName}" artifact not found`)
  if (!isAddress(address)) throw new Error(`"${address}" is not a valid address`)

  const isErrnoException = (err: unknown): err is NodeJS.ErrnoException => {
    if (err && typeof err === 'object' && err.hasOwnProperty('code')) return true
    return false
  }

  if (!existsSync(`./deployments/${networkName}`))
    mkdirSync(`./deployments/${networkName}`, { recursive: true })

  writeFileSync(
    `./deployments/${networkName}/${contractName}.ts`,
    `import contract from '../../artifacts/contracts/${contractName}.sol/${contractName}.json'
export const ${contractName} = ['${address}', contract.abi] as const
export const ${contractName}Block = ${block}`
  )

  const contractExport = `export { ${contractName} } from './${contractName}'`
  const networkIndex = `./deployments/${networkName}/index.ts`
  const appendContract = () => appendFileSync(networkIndex, `${contractExport}\n`)
  try {
    if (!readFileSync(networkIndex).toString().split(/\r?\n/).includes(contractExport))
      appendContract()
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      appendContract()
    } else {
      throw err
    }
  }

  const blockExport = `export { ${contractName}Block } from './${contractName}'`
  const networkBlocksPath = `./deployments/${networkName}/blocks.ts`
  const appendBlock = () => appendFileSync(networkBlocksPath, `${blockExport}\n`)
  try {
    if (!readFileSync(networkBlocksPath).toString().split(/\r?\n/).includes(blockExport))
      appendBlock()
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      appendBlock()
    } else {
      throw err
    }
  }

  const networkExport = `export * as ${networkName} from './${networkName}'`
  const deploymentsIndex = './deployments/index.ts'
  const appendNetwork = () => appendFileSync(deploymentsIndex, `${networkExport}\n`)
  try {
    if (!readFileSync(deploymentsIndex).toString().split(/\r?\n/).includes(networkExport))
      appendNetwork()
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      appendNetwork()
    } else {
      throw err
    }
  }

  const networkBlocksExport = `export * as ${networkName} from './${networkName}/blocks'`
  const deploymentsBlocksPath = './deployments/blocks.ts'
  const appendNetworkBlock = () => appendFileSync(deploymentsBlocksPath, `${networkBlocksExport}\n`)
  try {
    if (
      !readFileSync(deploymentsBlocksPath).toString().split(/\r?\n/).includes(networkBlocksExport)
    )
      appendNetworkBlock()
  } catch (err) {
    if (isErrnoException(err) && err.code === 'ENOENT') {
      appendNetworkBlock()
    } else {
      throw err
    }
  }
}
