import Card from '../Card'
import Link from 'next/link'
import inft from '@openzeppelin/contracts/build/contracts/IERC721Metadata.json'
import Input from '../Input'
import Button from '../Button'
import styles from './AccountManager.module.scss'
import EvmContext from '../../context/evmContext'
import { admins } from '../../helpers/sign'
import { SiEthereum } from 'react-icons/si'
import { formatEther } from 'ethers/lib/utils'
import { BigNumber, Contract } from 'ethers'
import { getContractInfo } from '../../helpers'
import { IERC721Metadata, MultiSig } from '../../typechain-types'
import { ChangeEventHandler, FormEventHandler, useContext, useEffect, useState } from 'react'

const AccountManager: React.FC = () => {
  const ethCtx = useContext(EvmContext)
  const { connecting, signerAddy, accounts, gallery, userGallery, updateBalance, transact } = ethCtx

  const [galleryBal, setGalleryBal] = useState<BigNumber>()
  const [userGalleryBal, setUserGalleryBal] = useState<BigNumber>()
  const [listings, setListings] = useState<Array<[string, Array<Token>]>>()

  const [txIndex, setTxIndex] = useState('')

  useEffect(() => {
    if (signerAddy && accounts && gallery && userGallery) {
      const getAccount = async () => {
        setGalleryBal(await gallery.userBalances(signerAddy))

        setUserGalleryBal(await userGallery.userBalances(signerAddy))

        const listings: Array<[string, Array<Token>]> = []

        const NFTs = await accounts.getNFTs(signerAddy, 0, await accounts.getNFTLength(signerAddy))

        for (const NFT of NFTs) {
          const nft = new Contract(NFT, inft.abi, userGallery.provider) as IERC721Metadata
          const tokenIds = await accounts.getTokenIds(
            signerAddy,
            NFT,
            0,
            await accounts.getTokenIdLength(signerAddy, NFT)
          )
          const tokens = []
          for (const tokenIdBN of tokenIds) {
            const tokenId = tokenIdBN.toString()
            const tokenURI = await nft.tokenURI(tokenIdBN)
            tokens.push({ tokenId, tokenURI })
          }
          listings.push([NFT, tokens])
        }

        setListings(listings)
      }
      getAccount()
    } else {
      setGalleryBal(undefined)
      setUserGalleryBal(undefined)
      setListings(undefined)
    }
  }, [signerAddy, accounts, gallery, userGallery])

  const withdrawGallery = () => {
    transact(() => {
      if (!signerAddy) throw new Error('Not connected')
      if (!gallery) throw new Error('Not connected to Gallery')

      const contractMethod = gallery.withdrawFunds

      const after = async () => {
        setGalleryBal(await gallery.userBalances(signerAddy))
        updateBalance()
      }

      return { contractMethod, after }
    })
  }

  const withdrawUserGallery = () => {
    transact(() => {
      if (!signerAddy) throw new Error('Not connected')
      if (!userGallery) throw new Error('Not connected to User Gallery')

      const contractMethod = userGallery.withdrawFunds

      const after = async () => {
        setUserGalleryBal(await userGallery.userBalances(signerAddy))
        updateBalance()
      }

      return { contractMethod, after }
    })
  }

  const changeTxIndex: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    setTxIndex(value)
  }

  const approveTx: FormEventHandler<HTMLFormElement> = async e => {
    e.preventDefault()

    if (!accounts) throw new Error('Not connected to Accounts')
    const { provider, signer } = accounts
    const multiSig = new Contract(
      ...(await getContractInfo('MultiSig', provider, signer))
    ) as MultiSig

    transact(() => {
      const contractMethod = () => multiSig.approveTransaction(txIndex)

      const after = () => setTxIndex('')

      return { contractMethod, after }
    })
  }

  if (connecting) {
    return (
      <div className={styles.container}>
        <h1>Connecting...</h1>
        <hr />
      </div>
    )
  }

  if (signerAddy && galleryBal && userGalleryBal && listings) {
    return (
      <div className={styles.container}>
        <h1>Account</h1>
        <h2>{signerAddy}</h2>

        <hr />

        {admins.includes(signerAddy) && (
          <>
            <h2>Administration</h2>

            <form onSubmit={approveTx}>
              <Input value={txIndex} onChange={changeTxIndex} placeholder="Tx Index" />
              <div className={styles.button}>
                <Button disabled={!txIndex}>Approve</Button>
              </div>
            </form>

            <hr />
          </>
        )}

        <h2>Gallery Balance</h2>

        <h2>
          <SiEthereum /> {formatEther(galleryBal)}
        </h2>

        <Button onClick={withdrawGallery} disabled={galleryBal.eq(0)}>
          {galleryBal.eq(0) ? 'No Balance' : 'Withdraw'}
        </Button>

        <h2>User Gallery Balance</h2>

        <h2>
          <SiEthereum /> {formatEther(userGalleryBal)}
        </h2>

        <Button onClick={withdrawUserGallery} disabled={userGalleryBal.eq(0)}>
          {userGalleryBal.eq(0) ? 'No Balance' : 'Withdraw'}
        </Button>

        <hr />

        {listings.length ? (
          <>
            <h1>Listings</h1>
            <div className={styles.gallery}>
              <div className={styles.listings}>
                {listings.map(listing =>
                  listing[1].map(token => {
                    const { tokenId, tokenURI } = token
                    return (
                      <Link href={`/${listing[0]}/${tokenId}`} key={`${tokenId} @ ${listing[0]}`}>
                        <a>
                          <Card initialTokens={[{ tokenId, tokenURI }]} />
                        </a>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <h1>No Listings</h1>
        )}
      </div>
    )
  }

  if (signerAddy && accounts && gallery && userGallery) {
    return (
      <div className={styles.container}>
        <h1>Loading...</h1>
        <hr />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1>Not Connected</h1>
      <hr />
    </div>
  )
}

export default AccountManager
