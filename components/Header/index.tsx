import Link from 'next/link'
import Button from '../Button'
import styles from './Header.module.scss'
import EvmContext from '../../context/evmContext'
import { useRouter } from 'next/router'
import { useContext } from 'react'
import { SiEthereum } from 'react-icons/si'
import { formatEther } from 'ethers/lib/utils'
import {
  IoHomeOutline,
  IoChevronBackOutline,
  IoMenuOutline,
  IoWarningOutline,
} from 'react-icons/io5'

const Header: React.FC = () => {
  const ethCtx = useContext(EvmContext)
  const { connect, connecting, signerAddy, balance, isOffline } = ethCtx

  const router = useRouter()

  return (
    <header className={styles.header}>
      {isOffline && (
        <div className={styles.offline}>
          <IoWarningOutline /> Offline Mode <IoWarningOutline />
        </div>
      )}
      {!(router.asPath === '/') && (
        <div className={styles.home}>
          <Link href={'/'}>
            <a>
              <IoChevronBackOutline /> <IoHomeOutline /> <span>Home</span>
            </a>
          </Link>
        </div>
      )}
      {signerAddy ? (
        <Link href={'/account'}>
          <a>
            <Button>
              <IoMenuOutline /> {signerAddy.slice(0, 5)}...{signerAddy.slice(-4)}
            </Button>
            {balance && (
              <span className={styles.balance}>
                <SiEthereum /> {formatEther(balance)}
              </span>
            )}
          </a>
        </Link>
      ) : (
        <Button onClick={connect} disabled={connecting}>
          Connect
        </Button>
      )}
    </header>
  )
}

export default Header
