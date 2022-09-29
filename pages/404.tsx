import Head from 'next/head'
import styles from '../styles/NotFound.module.scss'
import type { NextPage } from 'next'

const NotFound: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>404: This page could not be found</title>
      </Head>

      <div>
        <h1>404</h1>
        <div className={styles.message}>
          <h2>This page could not be found.</h2>
        </div>
      </div>
    </div>
  )
}

export default NotFound
