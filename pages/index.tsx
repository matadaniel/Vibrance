import Head from 'next/head'
import Link from 'next/link'
import Button from '../components/Button'
import styles from '../styles/Home.module.scss'
import Listings from '../components/Listings'
import AuctionHouse from '../components/AuctionHouse'
import { Gallery, UserGallery } from '../typechain-types'
import { Contract, getDefaultProvider } from 'ethers'
import { getBundles, getContractInfo, getListings, verifyNet } from '../helpers'
import type { GetServerSideProps, NextPage } from 'next'

interface Bundle {
  bundleNumber: number
  tokens: Array<Token>
  donation: { roses: number; tulips: number }
}

interface HomeProps {
  timestamp: number
  upcoming: Array<Bundle>
  bundles: Array<Bundle & { highestBid: string }>
  expired: Array<Bundle>
  ending: number
  listings: Array<[string, { name: string; address: string; token: Token; price: string }]>
}

const Home: NextPage<HomeProps> = ({ timestamp, upcoming, bundles, expired, ending, listings }) => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Project Vibrance</title>
        <meta
          name="description"
          content="The most open NFT marketplace. Buy and sell digital assets with low fees. Join our community."
        />
      </Head>

      <div className={styles.main}>
        <div className={styles.create}>
          <Link href="/sell">
            <a>
              <Button>Sell your own NFT</Button>
            </a>
          </Link>
        </div>
        <Listings providerListings={new Map(listings)} />
        <AuctionHouse
          providerTimestamp={timestamp}
          providerUpcoming={upcoming}
          providerBundles={bundles}
          providerExpired={expired}
          providerEnding={ending}
        />
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  try {
    const provider = getDefaultProvider(process.env.NETWORK)

    const { chainId } = await provider.getNetwork()

    verifyNet(chainId)

    const gallery = new Contract(...(await getContractInfo('Gallery', provider))) as Gallery
    const userGallery = new Contract(
      ...(await getContractInfo('UserGallery', provider))
    ) as UserGallery

    return {
      props: {
        ...(await getBundles(gallery)),
        listings: [
          ...(await getListings(userGallery, (await provider.getBlockNumber()) - 100)).listings,
        ],
      },
    }
  } catch (err) {
    console.error(err)

    return {
      props: {
        timestamp: 0,
        upcoming: [],
        bundles: [],
        expired: [],
        ending: -1,
        listings: [],
      },
    }
  }
}

export default Home
