import Link from 'next/link'
import styles from './Socials.module.scss'
import { SiDiscord, SiGithub, SiReddit, SiTwitter } from 'react-icons/si'

const Socials: React.FC = () => {
  return (
    <div className={styles.socials} id="Socials">
      <span>Socials</span>
      <hr />

      <ul>
        <li>
          <Link href="#">
            <a aria-disabled onClick={e => e.preventDefault()}>
              <SiReddit /> Reddit
            </a>
          </Link>
        </li>

        <li>
          <Link href="https://github.com/AlisaKiromen/Vibrance">
            <a>
              <SiGithub /> GitHub
            </a>
          </Link>
        </li>

        <li>
          <Link href="#">
            <a aria-disabled onClick={e => e.preventDefault()}>
              <SiDiscord /> Discord
            </a>
          </Link>
        </li>

        <li>
          <Link href="#">
            <a aria-disabled onClick={e => e.preventDefault()}>
              <SiTwitter /> Twitter
            </a>
          </Link>
        </li>
      </ul>
    </div>
  )
}

export default Socials
