import { waffle, ethers, upgrades } from 'hardhat'
import { asMultiSig } from '../helpers/sign'
import { Accounts, Gallery, MultiSig, UserGallery } from '../typechain-types'

const { provider, createFixtureLoader } = waffle

export const loadFixture = createFixtureLoader(provider.getWallets(), provider)

export const fixture = async (
  wallets: ReturnType<typeof provider.getWallets>,
  environment: typeof provider
) => {
  const MultiSig = await ethers.getContractFactory('MultiSig')
  const multiSig = (await MultiSig.deploy(
    wallets.slice(0, 4).map(wallet => wallet.address),
    3
  )) as MultiSig & { getAddress: () => string }
  // @ethereum-waffle does not recognize this as instance of ethers.Contract at changeEtherBalance
  multiSig.getAddress = () => multiSig.address

  const MyToken = await ethers.getContractFactory('MyToken')
  const myToken = await MyToken.deploy()

  const RandOracle = await ethers.getContractFactory('RandOracle')
  const randOracle = await RandOracle.deploy()

  await randOracle.setRandomValue(1, ethers.utils.sha256(ethers.utils.randomBytes(1)).slice(2))

  const Flowers = await ethers.getContractFactory('Flowers')
  const flowers = await Flowers.deploy(multiSig.address)

  const Accounts = await ethers.getContractFactory('Accounts')
  const accounts = (await upgrades.deployProxy(Accounts, [multiSig.address], {
    kind: 'uups',
  })) as Accounts

  const Gallery = await ethers.getContractFactory('Gallery')
  const gallery = (await upgrades.deployProxy(
    Gallery,
    [multiSig.address, flowers.address, randOracle.address],
    { kind: 'uups' }
  )) as Gallery

  const UserGallery = await ethers.getContractFactory('UserGallery')
  const userGallery = (await upgrades.deployProxy(
    UserGallery,
    [multiSig.address, accounts.address],
    { kind: 'uups' }
  )) as UserGallery & { getAddress: () => string }
  // @ethereum-waffle does not recognize this as instance of ethers.Contract at changeEtherBalance
  userGallery.getAddress = () => userGallery.address

  await asMultiSig(
    multiSig,
    wallets.slice(0, 3),
    flowers.address,
    0,
    flowers.interface.encodeFunctionData('grantRole', [
      await flowers.MINTER_ROLE(),
      gallery.address,
    ])
  )

  await asMultiSig(
    multiSig,
    wallets.slice(0, 3),
    accounts.address,
    0,
    accounts.interface.encodeFunctionData('grantRole', [
      await accounts.WRITER_ROLE(),
      userGallery.address,
    ])
  )

  return {
    wallets,
    environment,
    multiSig,
    myToken,
    randOracle,
    flowers,
    accounts,
    gallery,
    userGallery,
  }
}
