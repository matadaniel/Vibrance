import chai from 'chai'
import { fixture, loadFixture } from '../fixture'
import { ethers, waffle } from 'hardhat'
import { Flowers, Gallery, MultiSig, RandOracle } from '../typechain-types'
import { asMultiSig } from '../helpers/sign'

const { expect } = chai

const clear = () => {
  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)
}

describe('Gallery', () => {
  let wallets: ReturnType<typeof waffle.provider.getWallets>
  let environment: typeof waffle.provider
  let multiSig: MultiSig
  let randOracle: RandOracle
  let flowers: Flowers
  let gallery: Gallery

  before(async () => {
    ;({ wallets, environment, multiSig, randOracle, flowers, gallery } = await loadFixture(fixture))
  })

  it('initializes token IDs', async () => {
    console.time('100,000 token IDs set')
    for (
      let i = await gallery.getTokenIdsLength();
      i.lt(100000);
      i = await gallery.getTokenIdsLength()
    ) {
      await gallery.setTokenIds()
      clear()
      process.stdout.write(`IDs progress: ${i.toNumber() / 1000}%`)
    }
    await gallery.finalizeTokenIds()
    clear()
    console.timeEnd('100,000 token IDs set')

    await expect(gallery.setTokenIds()).to.be.revertedWith('Only 100,000 flowers can be minted.')

    await expect(gallery.listFirstBundles()).to.be.revertedWith('Owner must initialize bundles')
  })

  it('lists first bundles', async () => {
    console.time('10 bundles minted')
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        await randOracle.setRandomValue(
          i * 10 + j + 2,
          ethers.utils.sha256(ethers.utils.randomBytes(1)).slice(2)
        )
      }
      await asMultiSig(
        multiSig,
        wallets.slice(0, 3),
        gallery.address,
        0,
        gallery.interface.encodeFunctionData('listFirstBundles')
      )
      clear()
      process.stdout.write(`listing progress: ${(i + 1) * 10}%`)
      expect(await gallery.nextRoundId()).to.eq((await randOracle.getLastRound()).add(10))
    }
    clear()
    console.timeEnd('10 bundles minted')

    await expect(gallery.listFirstBundles()).to.be.revertedWith(
      'This function is only for the first ten bundles'
    )
  })

  const bidValue = ethers.utils.parseEther('0.01')

  it('handles bidding', async () => {
    await gallery.connect(wallets[1]).bundleBid(0, { value: bidValue.sub(100) })

    expect((await gallery.getBundle(0)).highestBidder).to.eq(wallets[1].address)
    expect((await gallery.getBundle(0)).highestBid).to.eq(bidValue.sub(100))

    await gallery.bundleBid(0, { value: bidValue })

    expect((await gallery.getBundle(0)).highestBidder).to.eq(wallets[0].address)
    expect((await gallery.getBundle(0)).highestBid).to.eq(bidValue)
  })

  it('lets bidder claim', async () => {
    await environment.send('evm_increaseTime', [36900])
    await environment.send('evm_mine', [])
    await gallery.claimBundle(0)
    const tokenId = (await gallery.getBundle(0)).flowersInBundle[0]
    expect(await flowers.ownerOf(tokenId)).to.eq(wallets[0].address)
  })

  it('gives bidder token ownership', async () => {
    const tokenId = (await gallery.getBundle(0)).flowersInBundle[0]
    await flowers.transferFrom(wallets[0].address, wallets[1].address, tokenId)
    expect(await flowers.ownerOf(tokenId)).to.eq(wallets[1].address)
  })

  it('sells expired listing', async () => {
    await gallery.bundleBid(1, { value: bidValue })

    await expect(gallery.bundleBid(1, { value: bidValue })).to.be.revertedWith(
      'This bundle has already been purchased.'
    )
  })

  it('gives buyer token ownership', async () => {
    await gallery.claimBundle(1)
    const tokenId = (await gallery.getBundle(1)).flowersInBundle[0]
    expect(await flowers.ownerOf(tokenId)).to.eq(wallets[0].address)
  })

  it('lists bundles', async () => {
    const updateOracle = async () => {
      for (let i = 0; i < 10; i++) {
        await randOracle.setRandomValue(
          (await randOracle.getLastRound()).add(1),
          ethers.utils.sha256(ethers.utils.randomBytes(1)).slice(2)
        )
      }
    }

    await updateOracle()
    await gallery.listBundle()

    expect((await gallery.getBundle(10)).biddingStartTime).to.gte(
      (await gallery.getBundle(9)).biddingStartTime.add(60 * 60 * 10 + 60 * 15)
    )

    for (let i = 0; i < 10; i++) {
      await updateOracle()
      await gallery.listBundle()
    }

    expect((await gallery.getBundle(19)).biddingStartTime).to.eq(
      (await gallery.getBundle(10)).biddingStartTime
    )
    expect((await gallery.getBundle(20)).biddingStartTime).to.eq(
      (await gallery.getBundle(19)).biddingStartTime.add(60 * 60 * 10)
    )

    await environment.send('evm_increaseTime', [36000])
    await environment.send('evm_mine', [])
    await updateOracle()
    await gallery.listBundle()

    expect((await gallery.getBundle(21)).biddingStartTime).to.eq(
      (await gallery.getBundle(20)).biddingStartTime
    )

    await environment.send('evm_increaseTime', [36000])
    await environment.send('evm_mine', [])
    await updateOracle()
    const { blockHash } = await (await gallery.listBundle()).wait()

    expect((await gallery.getBundle(22)).biddingStartTime).to.eq(
      (await environment.getBlock(blockHash)).timestamp
    )

    for (let i = 0; i < 19; i++) {
      await updateOracle()
      await gallery.listBundle()
    }

    expect((await gallery.getBundle(31)).biddingStartTime).to.eq(
      (await gallery.getBundle(22)).biddingStartTime
    )
    expect((await gallery.getBundle(32)).biddingStartTime).to.eq(
      (await gallery.getBundle(31)).biddingStartTime.add(60 * 60 * 10)
    )
    expect((await gallery.getBundle(41)).biddingStartTime).to.eq(
      (await gallery.getBundle(32)).biddingStartTime
    )

    await updateOracle()
    await expect(gallery.listBundle()).to.be.revertedWith(
      'May only list bundles 10 hours in advance.'
    )
  })

  it('prevents pre-bidding', async () => {
    await expect(gallery.bundleBid(41, { value: bidValue })).to.be.revertedWith(
      'Bidding for this bundle has not started yet.'
    )
  })

  it('withdraws user funds', async () => {
    await expect(() => gallery.connect(wallets[1]).withdrawFunds()).to.changeEtherBalance(
      wallets[1],
      bidValue.sub(100)
    )
  })

  it('withdraws admin funds', async () => {
    await expect(() =>
      asMultiSig(
        multiSig,
        wallets.slice(0, 3),
        gallery.address,
        0,
        gallery.interface.encodeFunctionData('withdrawFundsAdmin')
      )
    ).to.changeEtherBalance(multiSig, bidValue.mul(2))
    expect(await environment.getBalance(gallery.address)).to.eq(0)
  })
})
