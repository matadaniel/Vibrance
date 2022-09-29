import '../styles/globals.scss'
import Head from 'next/head'
import Links from '../components/Links'
import Header from '../components/Header'
import Toasts from '../components/Toasts'
import Socials from '../components/Socials'
import Particles from 'react-tsparticles'
import variables from '../styles/variables.module.scss'
import { EvmProvider } from '../context/evmContext'
import { ToastProvider } from '../context/toastContext'
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
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
            image: `linear-gradient(15deg, ${variables.clearAccent}, #00000000 10% 85%, ${variables.clearAccent} 95% 100%)`,
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
        <ToastProvider>
          <EvmProvider>
            <Header />
            <Component {...pageProps} />
            <Toasts />
          </EvmProvider>
        </ToastProvider>
        <footer
          style={{
            position: 'absolute',
            display: 'flex',
            bottom: 0,
            width: '100%',
          }}
        >
          <Links />
          <Socials />
        </footer>
      </div>
    </>
  )
}

export default MyApp
