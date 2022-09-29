import chai from 'chai'
import { fixture, loadFixture } from '../fixture'
import { ethers, waffle } from 'hardhat'
import { MultiSig, MyToken, UserGallery } from '../typechain-types'
import { asMultiSig } from '../helpers/sign'

const { expect } = chai

describe('UserGallery', () => {
  let wallets: ReturnType<typeof waffle.provider.getWallets>
  let environment: typeof waffle.provider
  let multiSig: MultiSig
  let userGallery: UserGallery
  let myToken: MyToken

  before(async () => {
    ;({ wallets, environment, multiSig, userGallery, myToken } = await loadFixture(fixture))

    await myToken.safeMint(wallets[1].address)
  })

  const salePrice = 10000

  it('lists token for sale', async () => {
    await myToken.connect(wallets[1]).approve(userGallery.address, 0)

    await expect(userGallery.connect(wallets[1]).createListing(myToken.address, 0, salePrice))
      .to.emit(userGallery, 'TokenListed')
      .withArgs(myToken.address, 0, salePrice, wallets[1].address)
  })

  it('explicitly removes listing', async () => {
    await expect(userGallery.connect(wallets[1]).removeListing(myToken.address, 0))
      .to.emit(userGallery, 'TokenRemoved')
      .withArgs(myToken.address, 0, wallets[1].address)
    expect((await userGallery.listings(myToken.address, 0)).onSale).to.eq(false)
  })

  it('removes unapproved token', async () => {
    await userGallery.connect(wallets[1]).createListing(myToken.address, 0, salePrice)
    await myToken
      .connect(wallets[1])
      ['safeTransferFrom(address,address,uint256)'](wallets[1].address, wallets[0].address, 0)
    await expect(userGallery.connect(wallets[1]).buy(myToken.address, 0))
      .to.emit(userGallery, 'TokenRemoved')
      .withArgs(myToken.address, 0, wallets[0].address)
    expect((await userGallery.listings(myToken.address, 0)).onSale).to.eq(false)
    expect(await userGallery.totalUserBalance()).to.eq(0)
    expect(await myToken.ownerOf(0)).to.eq(wallets[0].address)
  })

  it('sells tokens', async () => {
    await myToken['safeTransferFrom(address,address,uint256)'](
      wallets[0].address,
      wallets[1].address,
      0
    )
    await myToken.connect(wallets[1]).approve(userGallery.address, 0)
    await userGallery.connect(wallets[1]).createListing(myToken.address, 0, salePrice)

    const listing = await userGallery.listings(myToken.address, 0)
    const royalty = await myToken.royaltyInfo(0, listing.price)
    const fee = listing.price.mul(250).div(10000)
    const initialBalances = {
      seller: await userGallery.userBalances(listing.seller),
      creator: await userGallery.userBalances(royalty[0]),
    }

    await expect(() =>
      userGallery.buy(myToken.address, 0, { value: listing.price.add(royalty[1]).add(fee) })
    ).to.changeEtherBalance(userGallery, listing.price.add(royalty[1]).add(fee))
    expect(await userGallery.userBalances(listing.seller)).to.eq(
      initialBalances.seller.add(salePrice)
    )
    expect(await userGallery.userBalances(royalty[0])).to.eq(
      initialBalances.creator.add(royalty[1])
    )

    const soldListing = await userGallery.listings(myToken.address, 0)

    expect(soldListing.seller).to.eq(ethers.constants.AddressZero)
    expect(soldListing.price).to.eq(0)
    expect(soldListing.onSale).to.eq(false)
    expect(await myToken.ownerOf(0)).to.eq(wallets[0].address)
  })

  it('withdraws user funds', async () => {
    await expect(() => userGallery.connect(wallets[1]).withdrawFunds()).to.changeEtherBalance(
      wallets[1],
      salePrice
    )
  })

  it('withdraws royalties', async () => {
    const royalty = (salePrice * 250) / 10000

    await expect(() => userGallery.withdrawFunds()).to.changeEtherBalance(wallets[0], royalty)
  })

  it('withdraws admin funds', async () => {
    const fee = (salePrice * 250) / 10000

    await expect(() =>
      asMultiSig(
        multiSig,
        wallets.slice(0, 3),
        userGallery.address,
        0,
        userGallery.interface.encodeFunctionData('withdrawFundsAdmin')
      )
    ).to.changeEtherBalance(multiSig, fee)
    expect(await environment.getBalance(userGallery.address)).to.eq(0)
  })
})
