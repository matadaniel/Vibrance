import { ethers, upgrades, network } from 'hardhat'
import { Accounts, Gallery, UserGallery } from '../typechain-types'
import { admins, submitAndWait } from '../helpers/sign'
import { writeContract } from '../helpers/write'

const main = async () => {
  const clear = () => {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
  }

  const MultiSig = await ethers.getContractFactory('MultiSig')
  const multiSig = await MultiSig.deploy(admins, 3)
  writeContract(
    'MultiSig',
    multiSig.address,
    (await multiSig.deployTransaction.wait()).blockNumber,
    network.name
  )

  const RandOracle = await ethers.getContractFactory('RandOracle')
  const randOracle = await RandOracle.deploy()
  writeContract(
    'RandOracle',
    randOracle.address,
    (await randOracle.deployTransaction.wait()).blockNumber,
    network.name
  )

  process.stdout.write(`awaiting new value from oracle...`)
  await new Promise(resolve => randOracle.once('RandomValueSet', round => resolve(round)))
  clear()

  const Flowers = await ethers.getContractFactory('Flowers')
  const flowers = await Flowers.deploy(multiSig.address)
  writeContract(
    'Flowers',
    flowers.address,
    (await flowers.deployTransaction.wait()).blockNumber,
    network.name
  )

  const Accounts = await ethers.getContractFactory('Accounts')
  const accounts = (await upgrades.deployProxy(Accounts, [multiSig.address], {
    kind: 'uups',
  })) as Accounts
  writeContract(
    'Accounts',
    accounts.address,
    (await accounts.deployTransaction.wait()).blockNumber,
    network.name
  )

  const Gallery = await ethers.getContractFactory('Gallery')
  const gallery = (await upgrades.deployProxy(
    Gallery,
    [multiSig.address, flowers.address, randOracle.address],
    { kind: 'uups' }
  )) as Gallery
  writeContract(
    'Gallery',
    gallery.address,
    (await gallery.deployTransaction.wait()).blockNumber,
    network.name
  )

  const UserGallery = await ethers.getContractFactory('UserGallery')
  const userGallery = (await upgrades.deployProxy(
    UserGallery,
    [multiSig.address, accounts.address],
    { kind: 'uups' }
  )) as UserGallery
  writeContract(
    'UserGallery',
    userGallery.address,
    (await userGallery.deployTransaction.wait()).blockNumber,
    network.name
  )

  await submitAndWait(
    multiSig,
    flowers.address,
    0,
    flowers.interface.encodeFunctionData('grantRole', [
      await flowers.MINTER_ROLE(),
      gallery.address,
    ])
  )

  await submitAndWait(
    multiSig,
    accounts.address,
    0,
    accounts.interface.encodeFunctionData('grantRole', [
      await accounts.WRITER_ROLE(),
      userGallery.address,
    ])
  )

  console.time('100,000 token IDs set')
  for (
    let i = await gallery.getTokenIdsLength();
    i.lt(100000);
    i = await gallery.getTokenIdsLength()
  ) {
    await (await gallery.setTokenIds()).wait()
    clear()
    process.stdout.write(`IDs progress: ${i.toNumber() / 1000}%`)
  }
  await gallery.finalizeTokenIds()
  clear()
  console.timeEnd('100,000 token IDs set')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
