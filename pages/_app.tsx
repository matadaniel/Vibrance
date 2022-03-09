import '../styles/globals.scss'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Particles from 'react-tsparticles'
import Socials from '../components/Socials'
import variables from '../styles/variables.module.scss'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Project Vibrance</title>
        <meta name="description" content="The most open NFT marketplace" />
        <link rel="icon" href="/splash.svg" />
      </Head>
      <Particles
        options={{
          fullScreen: {
            enable: true,
            zIndex: -1,
          },
          fpsLimit: 60,
          particles: {
            number: {
              density: {
                enable: true,
                area: 2000,
              },
            },
            color: {
              value: variables.firefly,
            },
            size: {
              value: {
                min: 1,
                max: 4,
              },
            },
            move: {
              enable: true,
              size: true,
            },
          },
          background: {
            image: `linear-gradient(15deg, ${variables.accent + 50}, #00000000 10% 85%, ${
              variables.accent + 50
            } 95% 100%)`,
            color: variables.bg,
          },
        }}
      />

      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          paddingBottom: variables.footerHeight,
          overflow: 'hidden',
        }}
      >
        <Component {...pageProps} />
        <footer
          style={{
            position: 'absolute',
            display: 'inline-flex',
            bottom: 0,
            width: '100%',
          }}
        >
          <Socials />
        </footer>
      </div>
    </>
  )
}

export default MyApp
