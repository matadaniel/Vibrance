import type { NextPage } from 'next'
import styles from '../styles/NotFound.module.scss'

const NotFound: NextPage = () => {
  return (
    <div className={styles.container}>
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
