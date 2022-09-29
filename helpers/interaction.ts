import ERC721Royalty from '@openzeppelin/contracts/build/contracts/ERC721Royalty.json'
import { formatEther } from 'ethers/lib/utils'
import { BigNumber, Contract } from 'ethers'
import { getContractBlock, getContractInfo } from './contracts'
import { Gallery, IERC2981, IERC721Metadata, UserGallery } from '../typechain-types'

const flowerURI = (tokenId: BigNumber) =>
  'ipfs://QmXxMweCFsnEKej6PfxRiNUKPkPdNvVCYr82ju9v98Besq/' + tokenId.mod(64).toString() + '.json'

export const getBundles = async (gallery: Gallery) => {
  const { timestamp } = await gallery.provider.getBlock('latest')

  const upcoming = []
  const bundles = []
  const expired = []
  const bundleLength = await gallery.getBundleLength()
  let ending = 0
  for (let i = bundleLength.sub(1); i.gte(0); i = i.sub(1)) {
    let roses = 0
    let tulips = 0
    const { biddingStartTime, flowersInBundle, highestBid, highestBidder } =
      await gallery.getBundle(i)

    if (biddingStartTime.gt(timestamp)) {
      upcoming.push({
        bundleNumber: i.toNumber(),
        tokens: flowersInBundle.map(tokenId => {
          if (tokenId.lt(10000)) roses++
          else if (tokenId.lt(20000)) tulips++
          return {
            tokenId: tokenId.toString(),
            tokenURI: flowerURI(tokenId),
          }
        }),
        donation: { roses, tulips },
      })
    } else if (biddingStartTime.gt(timestamp - 60 * 60 * 10)) {
      ending ||= biddingStartTime.add(60 * 60 * 10).toNumber()

      bundles.push({
        bundleNumber: i.toNumber(),
        highestBid: formatEther(highestBid),
        tokens: flowersInBundle.map(tokenId => {
          if (tokenId.lt(10000)) roses++
          else if (tokenId.lt(20000)) tulips++
          return {
            tokenId: tokenId.toString(),
            tokenURI: flowerURI(tokenId),
          }
        }),
        donation: { roses, tulips },
      })
    } else if (highestBidder === '0x0000000000000000000000000000000000000000') {
      expired.push({
        bundleNumber: i.toNumber(),
        tokens: flowersInBundle.map(tokenId => {
          if (tokenId.lt(10000)) roses++
          else if (tokenId.lt(20000)) tulips++
          return {
            tokenId: tokenId.toString(),
            tokenURI: flowerURI(tokenId),
          }
        }),
        donation: { roses, tulips },
      })
    }
  }

  return { bundles, expired, upcoming, timestamp, ending }
}

export const getListings = async (
  userGallery: UserGallery,
  fromBlock: number,
  toBlock?: number,
  listings = new Map<string, { name: string; address: string; token: Token; price: string }>()
) => {
  let end = false
  const deploymentBlock = getContractBlock(await userGallery.provider.getNetwork(), 'UserGallery')
  if (fromBlock <= deploymentBlock) end = true

  const listingFilter = userGallery.filters.TokenListed([
    '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c',
    '0xC9e7515189BAC7738D106C50F48057e214147444',
    '0x016BA607746d28a0CeC7e1E10f1e43410A232C1D',
    '0xC28DFc4aA1465Ff9A98897388fFFE6d400711CB2',
  ] as any)
  const listingLogs = (await userGallery.queryFilter(listingFilter, fromBlock, toBlock)).reverse()

  for (const log of listingLogs) {
    const { NFT, tokenId, price } = log.args
    const tokenIdString = tokenId.toString()
    const key = NFT + tokenIdString

    if (!listings.has(key)) {
      if ((await userGallery.listings(NFT, tokenId)).onSale) {
        const nft = new Contract(NFT, ERC721Royalty.abi, userGallery.provider) as IERC721Metadata

        listings.set(key, {
          name: await nft.name(),
          address: NFT,
          token: { tokenId: tokenIdString, tokenURI: await nft.tokenURI(tokenId) },
          price: formatEther(price),
        })
      }
    }
  }

  return { listings, end }
}

export const getAuction = async (gallery: Gallery, bundleNum: string) => {
  let roses = 0
  let tulips = 0
  const bundleNumber = BigNumber.from(bundleNum)
  const { timestamp } = await gallery.provider.getBlock('latest')
  const { flowersInBundle, highestBid, biddingStartTime, highestBidder } = await gallery.getBundle(
    bundleNum
  )

  const delta = timestamp - biddingStartTime.toNumber()

  let claim = null
  if (delta > 60 * 60 * 10 + 60 * 15) {
    const claimFilter = gallery.filters.AuctionEnded(bundleNumber)
    const claimLogs = await gallery.queryFilter(claimFilter)

    claim = claimLogs?.[0]?.args ?? null
    claim &&= { winner: claim.winner, amount: formatEther(claim.amount) }
  }

  return {
    bundleNumber,
    tokens: flowersInBundle.map(tokenId => {
      if (tokenId.lt(10000)) roses++
      else if (tokenId.lt(20000)) tulips++
      return {
        tokenId: tokenId.toString(),
        tokenURI: flowerURI(tokenId),
      }
    }),
    highestBid: formatEther(highestBid),
    highestBidder,
    delta,
    claim,
    donation: { roses, tulips },
  }
}

const isEthersError = (err: unknown): err is Error & { reason: unknown; code: unknown } => {
  if (err instanceof Error && err.hasOwnProperty('reason') && err.hasOwnProperty('code'))
    return true
  return false
}

const isMetaMaskError = (
  err: unknown
): err is { code: unknown; message: unknown; data: unknown } => {
  if (
    typeof err === 'object' &&
    !!err &&
    err.hasOwnProperty('code') &&
    err.hasOwnProperty('message') &&
    err.hasOwnProperty('data')
  )
    return true
  return false
}

export const getToken = async (userGallery: UserGallery, address: string, tokenId: string) => {
  const tokenIdBase10 = BigNumber.from(tokenId).toString()
  const { onSale, price, seller } = await userGallery.listings(address, tokenId)
  const nft = new Contract(address, ERC721Royalty.abi, userGallery.provider) as IERC721Metadata

  const IERC165_ID = '0x01ffc9a7'
  const IERC721_ID = '0x80ac58cd'
  const IERC721Metadata_ID = '0x5b5e139f'
  if (!(await nft.supportsInterface(IERC165_ID)) || (await nft.supportsInterface('0xffffffff')))
    throw new Error('Contract does not implement ERC-165.')
  if (!(await nft.supportsInterface(IERC721_ID)))
    throw new Error('Contract does not implement ERC-721.')
  if (!(await nft.supportsInterface(IERC721Metadata_ID)))
    throw new Error('Contract implements ERC-721 but not the metadata extension.')

  const name = await nft.name()

  let tokens = null
  let owner = null
  if (address === (await getContractInfo('Flowers', userGallery.provider))[0]) {
    tokens = [
      {
        tokenId: tokenIdBase10,
        tokenURI: flowerURI(BigNumber.from(tokenId)),
      },
    ]
    try {
      owner = await nft.ownerOf(tokenId)
    } catch (err) {
      if (
        (isEthersError(err) && err.reason === 'ERC721: owner query for nonexistent token') ||
        (isMetaMaskError(err) &&
          isMetaMaskError(err.data) &&
          err.code === -32603 &&
          err.message === 'Internal JSON-RPC error.' &&
          err.data.code === 3 &&
          err.data.message === 'execution reverted: ERC721: owner query for nonexistent token')
      ) {
        owner = ''
      } else throw err
    }
  } else {
    tokens = [{ tokenId: tokenIdBase10, tokenURI: await nft.tokenURI(tokenId) }]
    owner = await nft.ownerOf(tokenId)
  }

  let receiver = null
  let royaltyAmount = null
  const IERC2981_ID = '0x2a55205a'
  const fee = price.mul(250).div(10000)
  let total = price.add(fee)
  if (await nft.supportsInterface(IERC2981_ID)) {
    ;[receiver, royaltyAmount] = await (nft as unknown as IERC2981).royaltyInfo(tokenId, price)
    total = total.add(royaltyAmount)
  }

  return {
    tokenIdBase10,
    onSale,
    price: {
      price: formatEther(price),
      fee: formatEther(fee),
      royalty: { receiver, royalty: royaltyAmount ? formatEther(royaltyAmount) : null },
      total: formatEther(total),
    },
    seller,
    name,
    tokens,
    owner,
  }
}
