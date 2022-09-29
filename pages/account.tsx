import Head from 'next/head'
import AccountManager from '../components/AccountManager'
import type { NextPage } from 'next'

const Account: NextPage = () => {
  return (
    <>
      <Head>
        <title>Your Account</title>
        <meta
          name="description"
          content="View and withdraw your balance in our galleries. View the NFTs you have listed on our marketplace."
        />
      </Head>

      <AccountManager />
    </>
  )
}

export default Account
