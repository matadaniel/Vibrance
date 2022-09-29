import Head from 'next/head'
import styles from '../styles/Sell.module.scss'
import SaleForm from '../components/SaleForm'
import type { NextPage } from 'next'

const Sell: NextPage = () => {
  return (
    <div className={styles.grid}>
      <div className={styles.container}>
        <Head>
          <title>Sell Your NFT</title>
          <meta
            name="description"
            content="Sell your NFT on the most open NFT marketplace. List your NFT with low transaction fees. ERC2981 compliant for royalty payments."
          />
        </Head>

        <SaleForm />
      </div>
    </div>
  )
}

export default Sell
