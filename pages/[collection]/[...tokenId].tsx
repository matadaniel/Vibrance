import Head from 'next/head'
import styles from '../../styles/Listing.module.scss'
import BidForm from '../../components/BidForm'
import PurchaseForm from '../../components/PurchaseForm'
import { Gallery, UserGallery } from '../../typechain-types'
import { Contract, getDefaultProvider } from 'ethers'
import { getAddress, getAuction, getContractInfo, getToken, verifyNet } from '../../helpers'
import type { GetServerSideProps, NextPage } from 'next'

interface ListingProps {
  auction: boolean
  collection: string
  name: string
  info: string
  price: {
    price: string
    fee: string
    royalty: { receiver: string | null; royalty: string | null }
    total: string
  }
  onSale: boolean
  tokenId: string
  tokens: Array<Token>
  highestBid: string
  highestBidder: string
  seller: string
  delta: number
  claim: { winner: string; amount: string } | null
  owner: string
  donation?: { roses: number; tulips: number }
}

const Listing: NextPage<ListingProps> = ({
  auction,
  collection,
  name,
  tokenId,
  tokens,
  info,
  price,
  onSale,
  highestBid,
  highestBidder,
  seller,
  delta,
  claim,
  owner,
  donation,
}) => {
  return (
    <div className={styles.grid}>
      <div className={styles.container}>
        <Head>
          <title>{auction ? `${name} ${info}` : `${name} #${info}`}</title>
          <meta
            name="description"
            content={
              auction ? `View and bid on ${name} ${info}.` : `View and buy ${name} #${info}.`
            }
          />
        </Head>

        {auction ? (
          <BidForm
            tokenId={tokenId}
            initialName={name}
            initialInfo={info}
            initialHighestBid={highestBid}
            initialHighestBidder={highestBidder}
            initialDelta={delta}
            initialClaim={claim}
            initialCardProps={{ initialTokens: tokens, donation, collection: 'flowers' }}
          />
        ) : (
          <PurchaseForm
            collection={collection}
            tokenId={tokenId}
            initialName={name}
            initialInfo={info}
            initialOnSale={onSale}
            initialPrice={price}
            initialSeller={seller}
            initialOwner={owner}
            initialTokens={tokens}
          />
        )}
      </div>
    </div>
  )
}

type Params = {
  collection: string
  tokenId: Array<string>
}

export const getServerSideProps: GetServerSideProps<ListingProps, Params> = async ({ params }) => {
  const collection = params!.collection[0].toUpperCase() + params!.collection.slice(1)
  const { tokenId } = params!

  try {
    const provider = getDefaultProvider(process.env.NETWORK)

    const network = await provider.getNetwork()

    verifyNet(network.chainId)

    let address
    try {
      address = getAddress(network, collection)
    } catch (err) {
      console.error(err)
    }

    if (!address) return { notFound: true }

    if (tokenId.length === 1) {
      const userGallery = new Contract(
        ...(await getContractInfo('UserGallery', provider))
      ) as UserGallery

      const { tokenIdBase10, onSale, price, seller, name, tokens, owner } = await getToken(
        userGallery,
        address,
        tokenId[0]
      )

      return {
        props: {
          auction: false,
          collection,
          name,
          info: tokenIdBase10,
          price,
          onSale,
          tokenId: tokenId[0],
          tokens,
          highestBid: 'N/A',
          highestBidder: 'N/A',
          seller,
          delta: 0,
          claim: null,
          owner,
        },
      }
    }

    if (tokenId.length === 2 && tokenId[0] === 'bundle') {
      const gallery = new Contract(...(await getContractInfo('Gallery', provider))) as Gallery

      if (address !== gallery.address) {
        return { notFound: true }
      }

      const { bundleNumber, tokens, highestBid, highestBidder, delta, claim, donation } =
        await getAuction(gallery, tokenId[1])

      return {
        props: {
          auction: true,
          collection,
          name: 'Flowers',
          info: 'Bundle #' + bundleNumber.toString(),
          price: {
            price: 'N/A',
            fee: 'N/A',
            royalty: { receiver: null, royalty: null },
            total: 'N/A',
          },
          onSale: false,
          tokenId: tokenId[1],
          tokens,
          highestBid,
          highestBidder,
          seller: address,
          delta,
          claim,
          owner: address,
          donation,
        },
      }
    }

    return { notFound: true }
  } catch (err) {
    console.error(err)

    const errorProps = {
      auction: false,
      collection,
      name: 'Not Found',
      info: 'Provider was unable to fetch token(s)',
      price: {
        price: 'N/A',
        fee: 'N/A',
        royalty: { receiver: null, royalty: null },
        total: 'N/A',
      },
      onSale: false,
      tokenId: tokenId[0],
      tokens: [{ tokenId: 'error', tokenURI: 'not found' }],
      highestBid: 'N/A',
      highestBidder: 'N/A',
      seller: '',
      delta: 0,
      claim: null,
      owner: '',
    }

    if (tokenId.length === 1) {
      return {
        props: errorProps,
      }
    }

    if (tokenId.length === 2 && tokenId[0] === 'bundle') {
      return { props: { ...errorProps, auction: true, tokenId: tokenId[1] } }
    }

    return { notFound: true }
  }
}

export default Listing
