import Link from 'next/link'
import styles from '../Socials/Socials.module.scss'

const Links: React.FC = () => {
  return (
    <div className={styles.socials}>
      <span>Links</span>
      <hr />

      <ul>
        <li>
          <Link href="/about">About</Link>
        </li>

        <li>
          <Link href="/account">Account</Link>
        </li>

        <li>
          <Link href="/sell">Sell</Link>
        </li>
      </ul>
    </div>
  )
}

export default Links
