import chai from 'chai'
import { fixture, loadFixture } from '../fixture'
import { ethers, waffle } from 'hardhat'
import { Flowers, Accounts, MyToken } from '../typechain-types'
import { asMultiSig } from '../helpers/sign'

const { expect } = chai

describe('Accounts', () => {
  let wallets: ReturnType<typeof waffle.provider.getWallets>
  let flowers: Flowers
  let accounts: Accounts
  let myToken: MyToken
  let pedals: Flowers

  before(async () => {
    ;({ wallets, flowers, accounts, myToken } = await loadFixture(fixture))
    const { multiSig } = await loadFixture(fixture)
    await asMultiSig(
      multiSig,
      wallets.slice(0, 3),
      accounts.address,
      0,
      accounts.interface.encodeFunctionData('grantRole', [
        await accounts.WRITER_ROLE(),
        wallets[0].address,
      ])
    )
  })

  it('sets token', async () => {
    await accounts.setToken(wallets[0].address, flowers.address, 0)
    const NFTs = await accounts.getNFTs(wallets[0].address, 0, 0)
    const nfts = [flowers]

    for (let i = 0; i < NFTs.length; i++) {
      expect(NFTs[i]).to.eq(nfts[i].address)
    }
  })

  it('only sets token once', async () => {
    await expect(accounts.setToken(wallets[0].address, flowers.address, 0)).to.be.revertedWith(
      'Token ID already has an index.'
    )
  })

  it('returns tokenIds', async () => {
    for (let i = 101; i < 1101; i++) {
      await accounts.setToken(wallets[0].address, flowers.address, i)
      process.stdout.clearLine(0)
      process.stdout.cursorTo(0)
      process.stdout.write(`IDs progress: ${(i - 100) / 10}%`)
    }
    process.stdout.write('\n')

    for (let i = 1; i < 6; i++) {
      const start = i * 150
      const tokenIds = await accounts.getTokenIds(
        wallets[0].address,
        flowers.address,
        start,
        start + 150
      )

      for (let j = 0; j < tokenIds.length; j++) {
        expect(tokenIds[j]).to.eq(start + j + 100)
      }
    }
  })

  it('nests tokens under contract', async () => {
    const NFTLength = await accounts.getNFTLength(wallets[0].address)

    expect(NFTLength).to.eq(1)
    for (let i = 0; i < NFTLength.toNumber(); i++) {
      expect((await accounts.getNFTs(wallets[0].address, i, i + 1))[0]).to.eq(flowers.address)
    }
  })

  it('handles multiple contracts', async () => {
    const Pedals = await ethers.getContractFactory('Flowers')
    pedals = await Pedals.deploy(wallets[0].address)

    for (let i = 0; i < 10; i++) {
      await accounts.setToken(wallets[0].address, pedals.address, i)
      await accounts.setToken(wallets[0].address, myToken.address, i)
    }

    const NFTLength = await accounts.getNFTLength(wallets[0].address)
    const nfts = [flowers, pedals, myToken]

    expect(NFTLength).to.eq(nfts.length)
    for (let i = 0; i < NFTLength.toNumber(); i++) {
      expect((await accounts.getNFTs(wallets[0].address, i, i + 1))[0]).to.eq(nfts[i].address)
    }
  })

  it('deletes tokens', async () => {
    for (let i = 2; i < 10; i++) {
      const tokenLength = await accounts.getTokenIdLength(wallets[0].address, flowers.address)
      const lastToken = (
        await accounts.getTokenIds(
          wallets[0].address,
          flowers.address,
          tokenLength.sub(1),
          tokenLength
        )
      )[0]

      await accounts.deleteToken(wallets[0].address, flowers.address, i * 100)

      expect(
        (
          await accounts.getTokenIds(
            wallets[0].address,
            flowers.address,
            i * 100 - 100,
            i * 100 - 99
          )
        )[0]
      ).to.eq(lastToken)
      expect(await accounts.getTokenIdLength(wallets[0].address, flowers.address)).to.eq(
        tokenLength.sub(1)
      )
    }
  })

  it('deletes contracts', async () => {
    for (let i = 0; i < 10; i++) {
      await accounts.deleteToken(wallets[0].address, pedals.address, i)
    }
    const NFTLength = await accounts.getNFTLength(wallets[0].address)
    const nfts = [flowers, myToken]

    for (let i = 0; i < NFTLength.toNumber(); i++) {
      expect((await accounts.getNFTs(wallets[0].address, i, i + 1))[0]).to.eq(nfts[i].address)
    }
  })

  it('sets tokens back', async () => {
    for (let i = 0; i < 10; i++) {
      await accounts.setToken(wallets[0].address, pedals.address, i)
    }
    const NFTLength = await accounts.getNFTLength(wallets[0].address)
    const nfts = [flowers, myToken, pedals]

    for (let i = 0; i < NFTLength.toNumber(); i++) {
      expect((await accounts.getNFTs(wallets[0].address, i, i + 1))[0]).to.eq(nfts[i].address)
    }
    expect(await accounts.getTokenIdLength(wallets[0].address, pedals.address)).to.eq(10)
  })
})
