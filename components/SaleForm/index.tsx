import inft from '../../artifacts/contracts/UserGallery.sol/INFT.json'
import Input from '../Input'
import Button from '../Button'
import styles from './SaleForm.module.scss'
import EvmContext from '../../context/evmContext'
import { INFT } from '../../typechain-types'
import { Contract } from 'ethers'
import { getContractInfo } from '../../helpers'
import { isAddress, parseEther } from 'ethers/lib/utils'
import { ChangeEventHandler, FormEventHandler, useContext, useState } from 'react'

const SaleForm: React.FC = () => {
  const ethCtx = useContext(EvmContext)
  const { userGallery, transact } = ethCtx

  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState('')

  const [tokenId, setTokenId] = useState('')
  const [tokenIdError, setTokenIdError] = useState('')

  const [price, setPrice] = useState('')
  const [priceError, setPriceError] = useState('')

  const changeAddress: ChangeEventHandler<HTMLInputElement> = e => {
    const { value } = e.target
    setAddress(value)
    if (value && !isAddress(value)) setAddressError('Input is not a valid address.')
    else setAddressError('')
  }

  const changeTokenId: ChangeEventHandler<HTMLInputElement> = e => {
    const { value, validity } = e.target
    setTokenId(value)
    if (validity.patternMismatch) setTokenIdError('Input is not a valid token ID.')
    else setTokenIdError('')
  }

  const changePrice: ChangeEventHandler<HTMLInputElement> = e => {
    const { value, validity } = e.target
    setPrice(value)
    if (validity.patternMismatch) setPriceError('Input is not a valid price.')
    else setPriceError('')
  }

  const signTx: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault()
    transact(() => {
      if (!userGallery) throw new Error('Not connected to User Gallery')

      const nft = new Contract(address, inft.abi, userGallery.signer) as INFT

      const before = [
        async () => {
          if ((await nft.getApproved(tokenId)) !== userGallery.address)
            await (await nft.approve(userGallery.address, tokenId)).wait()
        },
      ]

      const contractMethod = () => userGallery.createListing(address, tokenId, parseEther(price))

      const after = () => {
        setAddress('')
        setTokenId('')
        setPrice('')
      }

      return { before, contractMethod, after }
    })
  }

  return (
    <form onSubmit={signTx} className={styles.form}>
      {userGallery && (
        <span
          className={styles.flowers}
          onClick={async () => {
            setAddress((await getContractInfo('Flowers', userGallery.provider))[0])
            setAddressError('')
          }}
        >
          Flowers Address
        </span>
      )}
      <div className={styles.input}>
        <Input
          error={addressError}
          value={address}
          onChange={changeAddress}
          placeholder="NFT Contract Address"
        />
      </div>
      <div className={styles.input}>
        <Input
          error={tokenIdError}
          value={tokenId}
          onChange={changeTokenId}
          placeholder="Token ID"
          pattern="\d+"
        />
      </div>
      <div className={styles.input}>
        <Input
          error={priceError}
          value={price}
          onChange={changePrice}
          placeholder="Price in ETH"
          pattern="\d*\.?\d*"
        />
      </div>
      <div className={styles.button}>
        <Button
          disabled={
            !address ||
            !tokenId ||
            !price ||
            !!addressError ||
            !!tokenIdError ||
            !!priceError ||
            !userGallery
          }
        >
          {userGallery ? 'Create Listing' : 'Not Connected'}
        </Button>
      </div>
    </form>
  )
}

export default SaleForm
