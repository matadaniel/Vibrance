import Card from '../Card'
import Link from 'next/link'
import Button from '../Button'
import Router from 'next/router'
import styles from './AuctionHouse.module.scss'
import EvmContext from '../../context/evmContext'
import { getBundles } from '../../helpers'
import { SiEthereum } from 'react-icons/si'
import { useContext, useEffect, useRef, useState } from 'react'

interface Bundle {
  bundleNumber: number
  tokens: Array<Token>
  donation: { roses: number; tulips: number }
}

interface AuctionHouseProps {
  providerTimestamp: number
  providerUpcoming: Array<Bundle>
  providerBundles: Array<Bundle & { highestBid: string }>
  providerExpired: Array<Bundle>
  providerEnding: number
}

const AuctionHouse: React.FC<AuctionHouseProps> = ({
  providerTimestamp,
  providerUpcoming,
  providerBundles,
  providerExpired,
  providerEnding,
}) => {
  const ethCtx = useContext(EvmContext)
  const { gallery, setOffline } = ethCtx

  const [bundles, setBundles] = useState(providerBundles)
  const [expired, setExpired] = useState(providerExpired)
  const [numOfExpired, setNumOfExpired] = useState(10)
  const [upcoming, setUpcoming] = useState(providerUpcoming)
  const [timestamp, setTimestamp] = useState(providerTimestamp)
  const [ending, setEnding] = useState(providerEnding)
  const [timer, setTimer] = useState(providerEnding - providerTimestamp)
  const [refreshing, setRefreshing] = useState(false)

  const didMount = useRef(false)

  useEffect(() => {
    if (didMount.current) {
      if (gallery) {
        const updateBundles = async () => {
          const { bundles, expired, upcoming, timestamp, ending } = await getBundles(gallery)

          setBundles(bundles)
          setExpired(expired)
          setUpcoming(upcoming)
          setTimestamp(timestamp)
          setEnding(ending)
        }
        updateBundles()
      } else {
        Router.replace(Router.asPath)
      }
    } else didMount.current = true
  }, [gallery])

  useEffect(() => {
    setBundles(providerBundles)
    setExpired(providerExpired)
    setUpcoming(providerUpcoming)
    setTimestamp(providerTimestamp)
    setEnding(providerEnding)
    if (providerEnding === -1) setOffline()
    setRefreshing(false)
  }, [
    providerBundles,
    providerExpired,
    providerUpcoming,
    providerTimestamp,
    providerEnding,
    setOffline,
  ])

  useEffect(() => {
    setTimer(ending - timestamp)
  }, [timestamp, ending])

  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => prev - 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const refresh = () => {
    setRefreshing(true)
    if (gallery) {
      const updateBundles = async () => {
        const { bundles, expired, upcoming, timestamp, ending } = await getBundles(gallery)

        setBundles(bundles)
        setExpired(expired)
        setUpcoming(upcoming)
        setTimestamp(timestamp)
        setEnding(ending)
        setRefreshing(false)
      }
      updateBundles()
    } else {
      Router.replace(Router.asPath)
    }
  }

  return (
    <div className={styles.auction}>
      <p>
        <i>All proceeds from roses & tulips in bundles will go to charity</i>
      </p>
      <h1>Auction</h1>
      {timer >= 0 ? (
        <>
          <h1>Ending</h1>
          <h1>
            {Math.floor(timer / 60 ** 2)}:
            {Math.floor((timer % 60 ** 2) / 60)
              .toString()
              .padStart(2, '0')}
            :{(timer % 60).toString().padStart(2, '0')}
          </h1>
        </>
      ) : (
        <div className={styles.center}>
          <h1>Ended</h1>
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? 'refreshing...' : 'Get latest auction'}
          </Button>
        </div>
      )}
      {bundles.length ? (
        <div className={styles.gallery}>
          {bundles.map(({ bundleNumber, highestBid, tokens, donation }) => (
            <div key={bundleNumber}>
              <Card initialTokens={tokens} donation={donation} collection="flowers" />
              <div className={styles.info}>
                <SiEthereum /> {highestBid.length > 5 ? highestBid.slice(0, 5) + '...' : highestBid}
                <Link href={`/gallery/bundle/${bundleNumber}`}>
                  <a className={styles.link}>Bundle {bundleNumber}</a>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>{'< No bundles found >'}</p>
      )}
      {upcoming.length > 0 && (
        <>
          <p>
            <b>Upcoming Bundle Auctions</b>
          </p>
          <div className={styles.gallery}>
            {upcoming.map(({ bundleNumber, tokens, donation }) => (
              <div key={bundleNumber}>
                <Card initialTokens={tokens} donation={donation} collection="flowers" />
                <div className={styles.info}>
                  <SiEthereum /> N/A
                  <Link href={`/gallery/bundle/${bundleNumber}`}>
                    <a className={styles.link}>Bundle {bundleNumber}</a>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {expired.length > 0 && (
        <>
          <p>
            <b>Expired Bundle Auctions</b>
            <br />
            Buy Now
          </p>
          <div className={styles.gallery}>
            {expired.slice(0, numOfExpired).map(({ bundleNumber, tokens, donation }) => (
              <div key={bundleNumber}>
                <Card initialTokens={tokens} donation={donation} collection="flowers" />
                <div className={styles.info}>
                  <SiEthereum /> 0.01
                  <Link href={`/gallery/bundle/${bundleNumber}`}>
                    <a className={styles.link}>Bundle {bundleNumber}</a>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {expired.length > numOfExpired && (
            <div className={styles.load}>
              <Button onClick={() => setNumOfExpired(prev => prev + 10)}>Load more</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AuctionHouse
