import Card from '../Card'
import Link from 'next/link'
import Button from '../Button'
import styles from '../AuctionHouse/AuctionHouse.module.scss'
import EvmContext from '../../context/evmContext'
import ToastContext from '../../context/toastContext'
import { SiEthereum } from 'react-icons/si'
import { getListings } from '../../helpers'
import { useContext, useEffect, useState } from 'react'

interface ListingsProps {
  providerListings: Map<string, { name: string; address: string; token: Token; price: string }>
}

const Listings: React.FC<ListingsProps> = ({ providerListings }) => {
  const ethCtx = useContext(EvmContext)
  const { userGallery } = ethCtx

  const toastCtx = useContext(ToastContext)
  const { createToast } = toastCtx

  const [listingsLen, setListingsLen] = useState(10)
  const [fromBlock, setFromBlock] = useState(0)
  const [listings, setListings] = useState(providerListings)
  const [loading, setLoading] = useState(false)
  const [end, setEnd] = useState(false)

  useEffect(() => {
    if (userGallery) {
      const updateListings = async () => {
        const fromBlock = (await userGallery.provider.getBlockNumber()) - 100
        const { listings, end } = await getListings(userGallery, fromBlock)

        setFromBlock(fromBlock)
        setListings(listings)
        setEnd(end)
      }
      updateListings()
    } else {
      setListings(providerListings)
    }
  }, [userGallery, providerListings])

  const loadMore = async () => {
    setLoading(true)

    if (listings.size >= listingsLen + 10) setListingsLen(listingsLen + 10)
    else if (userGallery) {
      let moreFromBlock = fromBlock
      let moreListings = { listings, end }

      const getMoreListings = async () => {
        moreListings = await getListings(
          userGallery,
          moreFromBlock - 100,
          moreFromBlock,
          moreListings.listings
        )
        moreFromBlock -= 100
      }

      while (moreListings.listings.size < listings.size + 10 && !moreListings.end)
        await getMoreListings()

      setListingsLen(prev => prev + 10)
      setFromBlock(moreFromBlock)
      setListings(moreListings.listings)
      setEnd(moreListings.end)
    } else createToast('error', 'Connect to load more.')

    setLoading(false)
  }

  return (
    <div className={styles.auction}>
      {listings.size ? (
        <>
          <div className={styles.gallery}>
            {[...listings.values()].slice(0, listingsLen).map(({ name, address, token, price }) => (
              <div key={`#${token.tokenId} @ ${address}`}>
                <span className={styles.name}>{name}</span>
                <Card initialTokens={[token]} />
                <div className={styles.info}>
                  <SiEthereum /> {price.length > 5 ? price.slice(0, 5) + '...' : price}
                  <Link href={`/${address}/${token.tokenId}`}>
                    <a className={styles.link}>Buy Now</a>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {!end && (
            <div className={styles.load}>
              <Button onClick={loadMore} disabled={loading}>
                {loading ? 'loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p>{'< No Listings found >'}</p>
      )}
    </div>
  )
}

export default Listings
