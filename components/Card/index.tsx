import Link from 'next/link'
import Image from 'next/image'
import styles from './Card.module.scss'
import { useEffect, useState } from 'react'

export interface CardProps {
  initialTokens: Array<Token>
  donation?: { roses: number; tulips: number }
  collection?: string
}

const Card: React.FC<CardProps> = ({ initialTokens, donation, collection }) => {
  const emptyDataURL =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  const blurDataURL = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg">
  <circle cx="50%" cy="50%" fill="${styles.firefly}">
    <animate attributeName="r" values="0;25%;0" dur="1s" repeatCount="indefinite" />
  </circle>
</svg>`
  ).toString('base64')}`

  const [showing, setShowing] = useState(0)
  const [tokens, setTokens] = useState<Array<Token & { image?: string }>>(initialTokens)

  useEffect(() => {
    if (
      initialTokens.length !== tokens.length ||
      initialTokens.some(
        ({ tokenId, tokenURI }, index) =>
          tokenId !== tokens[index].tokenId || tokenURI !== tokens[index].tokenURI
      )
    )
      setTokens(initialTokens)

    initialTokens.forEach(async ({ tokenId, tokenURI }) => {
      try {
        if (!tokenURI.startsWith('ipfs://'))
          throw new Error(`Token #${tokenId} URI does not start with "ipfs://". URI: ${tokenURI}`)

        const res = await fetch(`https://ipfs.io/ipfs/${tokenURI.slice(7)}`)
        const { image } = await res.json()
        if (typeof image !== 'string' || !image.startsWith('ipfs://'))
          throw new Error(`Token #${tokenId} image does not start with "ipfs://". image: ${image}`)

        setTokens(prev =>
          prev.map(prevToken =>
            prevToken.tokenId === tokenId
              ? { ...prevToken, image: `https://ipfs.io/ipfs/${image.slice(7)}` }
              : prevToken
          )
        )
      } catch (err) {
        console.error(err)

        setTokens(prev =>
          prev.map(prevToken =>
            prevToken.tokenId === tokenId ? { ...prevToken, image: '/error.svg' } : prevToken
          )
        )
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTokens])

  if (tokens.length > 1) {
    const { length } = tokens

    const bundleImages = (
      <Image
        src={tokens[showing].image ?? emptyDataURL}
        placeholder="blur"
        blurDataURL={blurDataURL}
        alt={`Token #${tokens[showing].tokenId} image`}
        width={150}
        height={150}
      />
    )

    const cycleLeft = () => {
      setShowing(prev => (prev === 0 ? length - 1 : prev - 1))
    }
    const cycleRigth = () => {
      setShowing(prev => (prev === length - 1 ? 0 : prev + 1))
    }

    return (
      <div className={styles.card}>
        <div className={styles.ribbon}>
          <span>{length} count</span>
        </div>
        <div className={styles.bundle}>
          <div className={styles.left}>
            <Image src="/favicon.ico" alt="left" width={25} height={25} onClick={cycleLeft} />
          </div>
          <div className={styles.right}>
            <Image src="/favicon.ico" alt="right" width={25} height={25} onClick={cycleRigth} />
          </div>
          {collection ? (
            <Link href={`/${collection}/${tokens[showing].tokenId}`}>
              <a>{bundleImages}</a>
            </Link>
          ) : (
            bundleImages
          )}
        </div>

        <div>
          {donation && (donation.roses > 0 || donation.tulips > 0) && (
            <p className={styles.medium}>
              {donation.roses > 0 && `${donation.roses} ${donation.roses === 1 ? 'rose' : 'roses'}`}
              {donation.roses > 0 && donation.tulips > 0 && <br />}
              {donation.tulips > 0 &&
                `${donation.tulips} ${donation.tulips === 1 ? 'tulip' : 'tulips'}`}
            </p>
          )}
          <p>#{tokens[showing].tokenId}</p>
        </div>
      </div>
    )
  }

  const { image, tokenId } = tokens[0]

  return (
    <div className={styles.card}>
      <Image
        src={image ?? emptyDataURL}
        placeholder="blur"
        blurDataURL={blurDataURL}
        alt={`Token #${tokenId} image`}
        width={150}
        height={150}
      />
      <p>#{tokenId}</p>
    </div>
  )
}

export default Card
