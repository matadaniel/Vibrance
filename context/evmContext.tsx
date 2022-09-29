import ToastContext from './toastContext'
import { ethers } from 'ethers'
import { getContractInfo, verifyNet } from '../helpers'
import { Accounts, Gallery, UserGallery } from '../typechain-types'
import { createContext, useContext, useEffect, useState } from 'react'

interface TxType {
  before?: Array<() => void | Promise<void>>
  contractMethod: () => Promise<ethers.ContractTransaction>
  after?: () => void | Promise<void>
  always?: () => void | Promise<void>
}

interface EvmType {
  connect: () => Promise<void>
  connecting: boolean
  signer?: ethers.providers.JsonRpcSigner
  signerAddy?: string
  accounts?: Accounts
  gallery?: Gallery
  userGallery?: UserGallery
  balance?: ethers.BigNumber
  isOffline?: true
  setOffline: () => void
  updateBalance: () => Promise<void>
  transact: (transaction: () => TxType) => Promise<void>
}

const defaultValue = {
  connect: () => {
    throw new Error('EvmContext using defaultValue')
  },
  connecting: false,
  setOffline: () => {
    throw new Error('EvmContext using defaultValue')
  },
  updateBalance: () => {
    throw new Error('EvmContext using defaultValue')
  },
  transact: () => {
    throw new Error('EvmContext using defaultValue')
  },
}

const EvmContext = createContext<EvmType>(defaultValue)

export const EvmProvider: React.FC = ({ children }) => {
  const toastCtx = useContext(ToastContext)
  const { createToast, modifyToast } = toastCtx

  const [connecting, setConnecting] = useState(false)
  const [signer, setSigner] = useState<EvmType['signer']>()
  const [signerAddy, setSignerAddy] = useState<EvmType['signerAddy']>()
  const [accounts, setAccounts] = useState<EvmType['accounts']>()
  const [gallery, setGallery] = useState<EvmType['gallery']>()
  const [userGallery, setUserGallery] = useState<EvmType['userGallery']>()
  const [balance, setBalance] = useState<EvmType['balance']>()
  const [isOffline, setIsOffline] = useState<EvmType['isOffline']>()

  const setOffline = () => setIsOffline(true)

  const handleAccountsChanged = async () => {
    setConnecting(true)
    // only window.ethereum listener calls this function
    // therefore: typeof window.ethereum !== 'undefined'
    const provider = new ethers.providers.Web3Provider(window.ethereum!)
    const signer = provider.getSigner()
    try {
      await signer.getAddress()
      setSigner(signer)
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('unknown account #')) {
        setSigner(undefined)
        console.log('Account has been disconnected.')
      } else {
        setSigner(undefined)
        throw err
      }
    }
  }

  const connect = async () => {
    setConnecting(true)
    if (typeof window.ethereum !== 'undefined') {
      const { ethereum } = window
      const provider = new ethers.providers.Web3Provider(ethereum)

      try {
        verifyNet((await provider.getNetwork()).chainId)
      } catch (err) {
        createToast(
          'error',
          err instanceof Error && err.message.startsWith('Could not to connect to ')
            ? 'Unsupported network'
            : 'Connect: Something went wrong'
        )
        setConnecting(false)
        throw err
      }

      ethereum.on('accountsChanged', handleAccountsChanged)
      ethereum.on('chainChanged', () => window.location.reload())
      await provider.send('eth_requestAccounts', [])
      const signer = provider.getSigner()
      setSigner(signer)
    } else {
      setSigner(undefined)
      console.log('Please install MetaMask!')
    }
  }

  useEffect(() => {
    const connectSigner = async () => {
      if (signer) {
        const { provider } = signer

        const address = await signer.getAddress()
        setSignerAddy(address)

        setAccounts(
          new ethers.Contract(...(await getContractInfo('Accounts', provider, signer))) as Accounts
        )

        const gallery = new ethers.Contract(
          ...(await getContractInfo('Gallery', provider, signer))
        ) as Gallery
        setGallery(gallery)

        const userGallery = new ethers.Contract(
          ...(await getContractInfo('UserGallery', provider, signer))
        ) as UserGallery
        setUserGallery(userGallery)

        setBalance(
          (await gallery.userBalances(address)).add(await userGallery.userBalances(address))
        )

        setConnecting(false)
      } else {
        setSignerAddy(undefined)
        setAccounts(undefined)
        setGallery(undefined)
        setUserGallery(undefined)
        setBalance(undefined)
        setConnecting(false)
      }
    }
    connectSigner()
  }, [signer])

  const updateBalance = async () => {
    if (signer && gallery && userGallery) {
      const signerAddy = await signer.getAddress()
      setBalance(
        (await gallery.userBalances(signerAddy)).add(await userGallery.userBalances(signerAddy))
      )
    } else {
      setBalance(undefined)
    }
  }

  const transact: EvmType['transact'] = async transaction => {
    const id = createToast('pending', 'Composing transaction...')

    let before: TxType['before']
    let contractMethod: TxType['contractMethod']
    let after: TxType['after']
    let always: TxType['always']

    try {
      ;({ before, contractMethod, after, always } = transaction())

      if (before?.length) {
        modifyToast(
          id,
          'pending',
          before.length === 1
            ? 'There is a prerequisite'
            : `There are ${before.length} prerequisites`
        )
        for (const [index, func] of before.entries()) {
          await func()
          modifyToast(id, 'pending', `[${index + 1}/${before.length}] prerequisites met`)
        }
      }

      const tx = await contractMethod()
      modifyToast(id, 'pending', 'Sent! Awaiting confirmation...')
      const receipt = await tx.wait()
      modifyToast(
        id,
        'success',
        `TxID ${receipt.transactionHash.slice(0, 5)}...
        ${receipt.transactionHash.slice(-4)} confirmed!`
      )

      await after?.()
    } catch (err) {
      console.error(err)
      modifyToast(
        id,
        'error',
        (typeof (err as Error)?.message === 'string' && (err as Error).message) ||
          'Something went wrong'
      )
    } finally {
      await always?.()
    }
  }

  return (
    <EvmContext.Provider
      value={{
        connect,
        connecting,
        signer,
        signerAddy,
        accounts,
        gallery,
        userGallery,
        balance,
        updateBalance,
        transact,
        isOffline,
        setOffline,
      }}
    >
      {children}
    </EvmContext.Provider>
  )
}

export default EvmContext
