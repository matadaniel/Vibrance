import chai from 'chai'
import { waffle } from 'hardhat'
import { fixture, loadFixture } from '../fixture'
import { asMultiSig } from '../helpers/sign'
import { Flowers, MultiSig } from '../typechain-types'

const { expect } = chai

describe('Flowers', () => {
  let wallets: ReturnType<typeof waffle.provider.getWallets>
  let multiSig: MultiSig
  let flowers: Flowers

  before(async () => {
    ;({ wallets, multiSig, flowers } = await loadFixture(fixture))
  })

  it('returns token URI', async () => {
    await asMultiSig(
      multiSig,
      wallets.slice(0, 3),
      flowers.address,
      0,
      flowers.interface.encodeFunctionData('grantRole', [
        await flowers.MINTER_ROLE(),
        wallets[0].address,
      ])
    )

    await flowers.safeMint(wallets[0].address, 0, 0)

    expect(await flowers.tokenURI(0)).eq(
      'ipfs://QmXxMweCFsnEKej6PfxRiNUKPkPdNvVCYr82ju9v98Besq/0.json'
    )
    await expect(flowers.tokenURI(1)).to.be.revertedWith(
      'ERC721Metadata: URI query for nonexistent token'
    )
  })

  it('implements interfaces', async () => {
    const IERC165_ID = '0x01ffc9a7'
    const IERC721_ID = '0x80ac58cd'
    const IERC721Metadata_ID = '0x5b5e139f'
    const IERC2981_ID = '0x2a55205a'

    expect(await flowers.supportsInterface(IERC165_ID)).to.eq(true)
    expect(await flowers.supportsInterface('0xffffffff')).to.eq(false)
    expect(await flowers.supportsInterface(IERC721_ID)).to.eq(true)
    expect(await flowers.supportsInterface(IERC721Metadata_ID)).to.eq(true)
    expect(await flowers.supportsInterface(IERC2981_ID)).to.eq(true)
  })
})
