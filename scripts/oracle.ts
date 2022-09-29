import { ethers } from 'hardhat'
import { getContractInfo } from '../helpers'
import fetch, { FetchError } from 'node-fetch'
import { RandOracle } from '../typechain-types'

const main = async () => {
  const randOracle = new ethers.Contract(
    ...(await getContractInfo('RandOracle', ethers.provider, (await ethers.getSigners())[0]))
  ) as RandOracle

  const urls = [
    'https://api.drand.sh',
    'https://api2.drand.sh',
    'https://api3.drand.sh',
    'https://drand.cloudflare.com',
  ]
  const fetchDrand = async (endpoint: string) => {
    for (let i = 0; i < urls.length; i++) {
      try {
        const res = await fetch(urls[i] + endpoint)
        if (i > 0) {
          urls.unshift(urls.splice(i, 1)[0])
        }
        return res
      } catch (err) {
        if (i < urls.length - 1 && err instanceof FetchError && err.code === 'EAI_AGAIN') {
          console.error(`${err.message}; retrying with ${urls[i + 1]}`)
        } else {
          throw err
        }
      }
    }
    throw new Error('nothing was thrown or returned')
  }

  const info = await fetchDrand('/info')
  const { period } = await info.json()

  let prevRound = (await randOracle.getLastRound()).toNumber()
  const setRandomness = async () => {
    const latest = await fetchDrand('/public/latest')
    const { round, randomness } = await latest.json()
    console.log({ period, round, randomness })
    if (round > prevRound) {
      prevRound = round
      await randOracle.setRandomValue(round, randomness)
    } else {
      console.log('^ SKIPPED')
    }
    setTimeout(setRandomness, period * 1000)
  }
  setRandomness()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
