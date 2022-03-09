import type { NextPage } from 'next'
import Link from 'next/link'
import styles from '../styles/About.module.scss'
import Logo from '../components/Logo'

const About: NextPage = () => {
  return (
    <div className={styles.info}>
      <div className={styles.container}>
        <Logo size={5} />
        <h1>The most open NFT marketplace</h1>
        <div className={styles.card}>
          <h2>Low Fees</h2>
          <hr />
          <p>
            NFTs should not be reserved for only the wealthy. Transaction fees on
            <i> this network </i>allow anyone to mint, buy, and list their NFTs.
          </p>
        </div>

        <div className={styles.card}>
          <h2>ERC2981</h2>
          <hr />
          <p>
            The Vibrance marketplace and NFTs created on Vibrance are ERC2981 compliant. Creators
            are able sell their NFTs and receive royalties on any marketplace that supports this
            standard.
          </p>
        </div>

        <div className={styles.card}>
          <h2>FOSS</h2>
          <hr />
          <p>
            The source code for this marketplace is completely open source and can be found on{' '}
            <Link href="https://github.com/AlisaKiromen/Vibrance">GitHub</Link>. Everyone is welcome
            to read over the code and provide feedback.
          </p>
        </div>

        <div className={styles.card}>
          <h2>Ease of Use</h2>
          <hr />
          <p>
            All of theses acronyms can get confusing. Vibrance strives to make the user experience
            with NFTs as intuitive as possible.
          </p>
        </div>

        <div className={styles.card}>
          <h2>Free Market</h2>
          <hr />
          <p>
            Anyone with an internet connection is free to participate in this platform. Create, buy,
            and sell at any time.
          </p>
        </div>

        <div className={styles.card}>
          <h2>Community</h2>
          <hr />
          <p>
            Vibrance is built to deliver the best experience for the community.{' '}
            <a href="#Socials">Join</a> the converation and help shape the future of the NFT space!
          </p>
        </div>
      </div>
    </div>
  )
}

export default About
