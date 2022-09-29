import Card from '../Card'
import Button from '../Button'
import styles from './PurchaseForm.module.scss'
import EvmContext from '../../context/evmContext'
import ToastContext from '../../context/toastContext'
import { SiEthereum } from 'react-icons/si'
import { getAddress, getToken } from '../../helpers'
import { formatEther, parseEther } from 'ethers/lib/utils'
import { IoWarningOutline, IoCloseOutline, IoSyncOutline } from 'react-icons/io5'
import { FormEventHandler, useContext, useEffect, useState } from 'react'

interface PurchaseFormProps {
  collection: string
  tokenId: string
  initialName: string
  initialInfo: string
  initialOnSale: boolean
  initialPrice: {
    price: string
    fee: string
    royalty: { receiver: string | null; royalty: string | null }
    total: string
  }
  initialSeller: string
  initialOwner: string
  initialTokens: Array<Token>
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  collection,
  tokenId,
  initialName,
  initialInfo,
  initialOnSale,
  initialPrice,
  initialSeller,
  initialOwner,
  initialTokens,
}) => {
  const ethCtx = useContext(EvmContext)
  const { updateBalance, transact, userGallery, setOffline } = ethCtx

  const toastCtx = useContext(ToastContext)
  const { createToast } = toastCtx

  const [address, setAddress] = useState<string>()
  const [name, setName] = useState(initialName)
  const [info, setInfo] = useState(initialInfo)
  const [onSale, setOnSale] = useState(initialOnSale)
  const [price, setPrice] = useState(initialPrice)
  const [seller, setSeller] = useState(initialSeller)
  const [owner, setOwner] = useState(initialOwner)
  const [tokens, setTokens] = useState(initialTokens)

  const [seconds, setSeconds] = useState(0)
  const [lastCall, setLastCall] = useState(0)
  const [calling, setCalling] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [estimation, setEstimation] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setLastCall(seconds - 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userGallery])

  useEffect(() => {
    if (seconds - lastCall >= 30 && calling === false) {
      if (userGallery) {
        const getListing = async () => {
          setCalling(true)

          let address
          try {
            address = getAddress(await userGallery.provider.getNetwork(), collection)
          } catch (err) {
            console.log(err)
          }

          if (!address) {
            setLastCall(seconds)
            setCalling(false)
            return createToast('error', `"${collection}" not found`)
          } else setAddress(address)

          const { tokenIdBase10, onSale, price, seller, name, tokens, owner } = await getToken(
            userGallery,
            address,
            tokenId
          )

          setInfo(tokenIdBase10)
          setOnSale(onSale)
          setPrice(price)
          setSeller(seller)
          setName(name)
          setTokens(tokens)
          setOwner(owner)
          setLastCall(seconds)
          setCalling(false)
        }
        getListing()
      } else {
        setLastCall(seconds)
        createToast('error', 'Could not refresh. Connect to refresh automatically.')
      }
    }
  }, [collection, calling, createToast, lastCall, seconds, tokenId, userGallery])

  useEffect(() => {
    const { tokenId, tokenURI } = initialTokens[0]
    if (tokenId === 'error' && tokenURI === 'not found') setOffline()
  }, [initialTokens, setOffline])

  const openModal = async () => {
    setShowModal(true)

    try {
      if (!userGallery || !address) throw new Error('Not connected to User Gallery')

      const gasLimit = await userGallery.estimateGas.buy(address, tokenId, {
        value: parseEther(price.total),
      })
      const { maxFeePerGas, gasPrice } = await userGallery.provider.getFeeData()

      try {
        if (!maxFeePerGas) throw new Error('unable to get maxFeePerGas')

        const gasFee = gasLimit.mul(maxFeePerGas).mul(12).div(10)
        const remainder = gasFee.mod(1e12)

        setEstimation(formatEther(gasFee.sub(remainder)))
      } catch (err) {
        if (err instanceof Error && err.message === 'unable to get maxFeePerGas') {
          console.log(err.message)

          if (!gasPrice) throw new Error('unable to get gasPrice')

          const gasFee = gasLimit.mul(gasPrice).mul(12).div(10)
          const remainder = gasFee.mod(1e12)

          setEstimation(formatEther(gasFee.sub(remainder)))
        } else {
          throw err
        }
      }
    } catch (err) {
      console.error(err)

      setEstimation('unable to estimate')
    }
  }

  const closeModal = () => {
    setShowModal(false)

    setEstimation('')
  }

  const signTx: FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()
    transact(() => {
      if (!userGallery || !address) {
        throw new Error('Not connected to User Gallery')
      }

      const contractMethod = () =>
        userGallery.buy(address, tokenId, { value: parseEther(price.total) })

      const after = () => {
        setLastCall(seconds - 30)
        updateBalance()
        closeModal()
      }

      return { contractMethod, after }
    })
  }

  return (
    <>
      <Card initialTokens={tokens} />
      <div className={styles.info}>
        <h1>{name}</h1>
        <h2>{info}</h2>
        <hr />
        {onSale ? (
          <>
            <div className={styles.price}>
              Price:
              <br />
              <SiEthereum /> {price.price}
              <p>
                Sold by:{' '}
                <abbr title={seller}>
                  {seller.slice(0, 5)}...{seller.slice(-4)}
                </abbr>
              </p>
            </div>
            <Button onClick={openModal}>Purchase</Button>
            {showModal && (
              <>
                <div className={styles.modalBg} onClick={closeModal} />
                <div className={styles.modal}>
                  <div className={styles.spacer}>
                    <button onClick={closeModal}>
                      <IoCloseOutline />
                    </button>
                  </div>
                  <form onSubmit={signTx}>
                    <div className={styles.price}>
                      Price: <SiEthereum /> {price.price}
                      <p>
                        marketplace fee: <SiEthereum /> {price.fee}
                        <br />
                        creator royalty: <SiEthereum /> {price.royalty.royalty}
                      </p>
                      <hr />
                      <div className={styles.spacer} />
                      <SiEthereum /> {price.total}
                      <p>
                        + gas fee:{' '}
                        {estimation ? (
                          estimation !== 'unable to estimate' ? (
                            <>
                              <SiEthereum /> {estimation} (est.)
                            </>
                          ) : (
                            estimation
                          )
                        ) : (
                          <IoSyncOutline className={styles.rotate} />
                        )}
                      </p>
                    </div>
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
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className={styles.price}>Not on sale</div>
            <div className={styles.price}>
              {owner ? (
                <>
                  Owner:{' '}
                  <abbr title={owner}>
                    {owner.slice(0, 5)}...{owner.slice(-4)}
                  </abbr>
                </>
              ) : (
                'No owner'
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default PurchaseForm
