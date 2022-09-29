import Input from '../Input'
import Button from '../Button'
import styles from '../PurchaseForm/PurchaseForm.module.scss'
import EvmContext from '../../context/evmContext'
import ToastContext from '../../context/toastContext'
import Card, { CardProps } from '../Card'
import { getAuction } from '../../helpers'
import { SiEthereum } from 'react-icons/si'
import { parseEther } from 'ethers/lib/utils'
import { IoReloadOutline, IoWarningOutline } from 'react-icons/io5'
import { ChangeEventHandler, FormEventHandler, useContext, useEffect, useState } from 'react'

interface BidFormProps {
  tokenId: string
  initialName: string
  initialInfo: string
  initialHighestBid: string
  initialHighestBidder: string
  initialDelta: number
  initialClaim: { winner: string; amount: string } | null
  initialCardProps: CardProps
}

const BidForm: React.FC<BidFormProps> = ({
  tokenId,
  initialName,
  initialInfo,
  initialHighestBid,
  initialHighestBidder,
  initialDelta,
  initialClaim,
  initialCardProps,
}) => {
  const ethCtx = useContext(EvmContext)
  const { updateBalance, gallery, transact, signerAddy, setOffline } = ethCtx

  const toastCtx = useContext(ToastContext)
  const { createToast } = toastCtx

  const [name, setName] = useState(initialName)
  const [info, setInfo] = useState(initialInfo)
  const [highestBid, setHighestBid] = useState(initialHighestBid)
  const [highestBidder, setHighestBidder] = useState(initialHighestBidder)
  const [delta, setDelta] = useState(initialDelta)
  const [claim, setClaim] = useState(initialClaim)
  const [cardProps, setCardProps] = useState(initialCardProps)

  const [seconds, setSeconds] = useState(0)
  const [lastCall, setLastCall] = useState(0)
  const [calling, setCalling] = useState(false)

  const [bid, setBid] = useState('')
  const [badInput, setBadInput] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setLastCall(seconds - 15)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery])

  useEffect(() => {
    if (seconds - lastCall >= 15 && calling === false) {
      if (gallery) {
        const getBundle = async () => {
          setCalling(true)

          const { bundleNumber, tokens, highestBid, highestBidder, delta, claim, donation } =
            await getAuction(gallery, tokenId)

          setName('Flowers')
          setInfo('Bundle #' + bundleNumber.toString())
          setHighestBid(highestBid)
          setHighestBidder(highestBidder)
          setDelta(delta)
          setClaim(claim)
          setCardProps({ initialTokens: tokens, donation, collection: 'flowers' })
          setLastCall(seconds)
          setCalling(false)
        }
        getBundle()
      } else {
        setLastCall(seconds)
        createToast('error', 'Could not refresh. Connect to refresh automatically.')
      }
    }
  }, [calling, createToast, gallery, lastCall, seconds, tokenId])

  useEffect(() => {
    const { tokenId, tokenURI } = initialCardProps.initialTokens[0]
    if (tokenId === 'error' && tokenURI === 'not found') setOffline()
  }, [initialCardProps.initialTokens, setOffline])

  const signTx: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault()
    transact(() => {
      if (!gallery) throw new Error('Not connected to Gallery')

      const contractMethod = () => gallery.bundleBid(tokenId, { value: parseEther(bid) })

      const after = () => {
        setLastCall(seconds - 15)
        updateBalance()
        setBid('')
      }

      return { contractMethod, after }
    })
  }

  const purchase: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault()
    transact(() => {
      if (!gallery) throw new Error('Not connected to Gallery')

      const contractMethod = () => gallery.bundleBid(tokenId, { value: parseEther('0.01') })

      const after = () => {
        setLastCall(seconds - 15)
        updateBalance()
      }

      return { contractMethod, after }
    })
  }

  const handleInput: ChangeEventHandler<HTMLInputElement> = e => {
    const { value, validity } = e.target
    setBid(value)
    if (validity.patternMismatch) setBadInput('Input is not a valid bid.')
    else setBadInput('')
  }

  const claimBundle = () => {
    transact(() => {
      if (!gallery) throw new Error('Not connected to Gallery')

      const contractMethod = () => gallery.claimBundle(tokenId)

      const after = () => {
        setLastCall(seconds - 15)
        updateBalance()
      }

      return { contractMethod, after }
    })
  }

  return (
    <>
      <Card {...cardProps} />
      <div className={styles.info}>
        <h1>{name}</h1>
        <h2>{info}</h2>
        <hr />
        {delta > 60 * 60 * 10 + 60 * 15 && claim ? (
          <>
            <div className={styles.price}>
              Claimed by{' '}
              <abbr title={claim.winner}>
                {claim.winner.slice(0, 5)}...{claim.winner.slice(-4)}
              </abbr>
            </div>
            <div className={styles.price}>
              Winning amount:
              <br />
              <SiEthereum />{' '}
              {claim.amount === '0.0' ? (
                '0.01 (expired)'
              ) : claim.amount.length > 17 ? (
                <abbr title={claim.amount}>{claim.amount.slice(0, 17)}...</abbr>
              ) : (
                claim.amount
              )}
            </div>
          </>
        ) : delta > 60 * 60 * 10 ? (
          highestBidder === '0x0000000000000000000000000000000000000000' ? (
            <>
              <div className={styles.price} style={{ marginTop: '27px' }}>
                Price: <SiEthereum />
                0.01
              </div>
              <form onSubmit={purchase}>
                <div className={styles.submit}>
                  <div className={styles.warning}>
                    <div>
                      <IoWarningOutline />
                    </div>
                    <p>Ether is withdrawn immediately.</p>
                    <p>All transactions are final.</p>
                    <input type="checkbox" id="terms" required />
                    <label htmlFor="terms">I agree to these terms.</label>
                  </div>
                  <Button>Purchase</Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className={styles.price}>
                Claimable by{' '}
                <abbr title={highestBidder}>
                  {highestBidder.slice(0, 5)}...{highestBidder.slice(-4)}
                </abbr>
                {delta <= 60 * 60 * 10 + 60 * 15 && (
                  <>
                    {' '}
                    in{' '}
                    {Math.floor(((60 * 60 * 10 + 60 * 15 - delta) % 60 ** 2) / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{((60 * 60 * 10 + 60 * 15 - delta) % 60).toString().padStart(2, '0')}
                    <IoReloadOutline
                      className={`${styles.right} ${calling && styles.rotate}`}
                      onClick={() => setLastCall(seconds - 15)}
                    />
                  </>
                )}
              </div>
              <div className={styles.submit}>
                <Button
                  disabled={
                    (gallery && signerAddy !== highestBidder) || delta <= 60 * 60 * 10 + 60 * 15
                  }
                  onClick={claimBundle}
                >
                  Claim
                </Button>
              </div>
            </>
          )
        ) : delta >= 0 ? (
          <>
            <div className={styles.price}>
              Current Bid:
              <div>
                <SiEthereum />{' '}
                {highestBid.length > 20 ? (
                  <abbr title={highestBid}>{highestBid.slice(0, 20)}...</abbr>
                ) : (
                  highestBid
                )}
                <IoReloadOutline
                  className={`${styles.right} ${calling && styles.rotate}`}
                  onClick={() => setLastCall(seconds - 15)}
                />
                <p>
                  {highestBidder === signerAddy ? (
                    "You're the highest bidder!"
                  ) : highestBidder === '0x0000000000000000000000000000000000000000' ? (
                    'No bids yet'
                  ) : (
                    <>
                      <abbr title={highestBidder}>
                        {highestBidder.slice(0, 5)}...{highestBidder.slice(-4)}
                      </abbr>{' '}
                      is the highest bidder
                    </>
                  )}
                  <br />
                  Ends in {Math.floor((60 * 60 * 10 - delta) / 60 ** 2)}:
                  {Math.floor(((60 * 60 * 10 - delta) % 60 ** 2) / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{((60 * 60 * 10 - delta) % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <form onSubmit={signTx}>
              <Input
                error={badInput}
                pattern="\d*\.?\d*"
                value={bid}
                onChange={handleInput}
                placeholder="Bid amount in ETH"
              />
              <div className={styles.submit}>
                <div className={styles.warning}>
                  <div>
                    <IoWarningOutline />
                  </div>
                  <p>Ether is withdrawn immediately.</p>
                  <p>All transactions are final.</p>
                  <input type="checkbox" id="terms" required />
                  <label htmlFor="terms">I agree to these terms.</label>
                </div>
                <Button disabled={!!badInput}>Send Bid</Button>
              </div>
            </form>
          </>
        ) : (
          <div className={styles.price}>
            Bidding starts
            <br />
            in {Math.floor(-delta / 60 ** 2)}:
            {Math.floor((-delta % 60 ** 2) / 60)
              .toString()
              .padStart(2, '0')}
            :{(-delta % 60).toString().padStart(2, '0')}
            {[...Array(seconds % 4)].map(() => '.')}
          </div>
        )}
      </div>
    </>
  )
}

export default BidForm
