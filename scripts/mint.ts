import { writeContract } from '../helpers/write'
import { ethers, network } from 'hardhat'

const main = async () => {
  const [signer] = await ethers.getSigners()
  const clear = () => {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
  }

  const MyToken = await ethers.getContractFactory('MyToken')
  const myToken = await MyToken.deploy()
  writeContract(
    'MyToken',
    myToken.address,
    (await myToken.deployTransaction.wait()).blockNumber,
    network.name
  )

  console.time('1,000 tokens minted')
  for (let i = 0; i < 1000; i++) {
    await myToken.safeMint(signer.address)
    clear()
    process.stdout.write(`Mint progress: ${(i + 1) / 10}%`)
  }
  clear()
  console.timeEnd('1,000 tokens minted')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
