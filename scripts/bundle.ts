import { ethers } from 'hardhat'
import { submitAndWait } from '../helpers/sign'
import { getContractInfo } from '../helpers'
import { Gallery, MultiSig, RandOracle } from '../typechain-types'

const main = async () => {
  const [signer] = await ethers.getSigners()
  const { provider } = ethers

  const clear = () => {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
  }

  const gallery = new ethers.Contract(
    ...(await getContractInfo('Gallery', provider, signer))
  ) as Gallery

  const multiSig = new ethers.Contract(
    ...(await getContractInfo('MultiSig', provider, signer))
  ) as MultiSig

  const randOracle = new ethers.Contract(
    ...(await getContractInfo('RandOracle', provider))
  ) as RandOracle

  const bundleLength = await gallery.getBundleLength()

  if (bundleLength.eq(0)) {
    let waiting = false
    process.stdout.write(`awaiting new value from oracle...`)
    randOracle.on('RandomValueSet', async round => {
      if (waiting) return
      const nextRoundId = await gallery.nextRoundId()

      if (round.gte(nextRoundId)) {
        clear()
        waiting = true
        await (
          await submitAndWait(
            multiSig,
            gallery.address,
            0,
            gallery.interface.encodeFunctionData('listFirstBundles')
          )
        ).wait()
        process.stdout.write('successfully listed first bundle')
        process.exit(0)
      } else if (round.lt(nextRoundId)) {
        clear()
        const delta = nextRoundId.sub(round)
        process.stdout.write(
          `waiting for oracle round ${nextRoundId.toNumber()} (${delta.toNumber()} round${
            delta.eq(1) ? '' : 's'
          } left)...`
        )
      } else {
        clear()
        throw new Error(`${round} is invalid`)
      }
    })
  } else if (
    bundleLength.gt(0) &&
    bundleLength.lt(10) &&
    (await gallery.getBundle(bundleLength.sub(1))).biddingStartTime
      .add(60 * 60 * 10)
      .gt((await provider.getBlock('latest')).timestamp)
  ) {
    process.stdout.write(`awaiting new value from oracle...`)
    randOracle.on('RandomValueSet', async round => {
      const nextRoundId = await gallery.nextRoundId()

      if (round.gte(nextRoundId)) {
        clear()
        await (await gallery.listFirstBundles()).wait()
        const bundleLength = await gallery.getBundleLength()
        console.log(`successfully listed bundle #${bundleLength.sub(1).toNumber()}`)
        if (bundleLength.eq(10)) {
          process.stdout.write('successfully listed first ten bundles')
          process.exit(0)
        }
      } else if (round.lt(nextRoundId)) {
        clear()
        const delta = nextRoundId.sub(round)
        process.stdout.write(
          `waiting for oracle round ${nextRoundId.toNumber()} (${delta.toNumber()} round${
            delta.eq(1) ? '' : 's'
          } left)...`
        )
      } else {
        clear()
        throw new Error(`${round} is invalid`)
      }
    })
  } else if (bundleLength.gt(0) && bundleLength.lt(10000)) {
    process.stdout.write(`awaiting new value from oracle...`)
    randOracle.on('RandomValueSet', async round => {
      const nextRoundId = await gallery.nextRoundId()

      if (round.gte(nextRoundId)) {
        clear()
        await (await gallery.listBundle()).wait()
        const bundleLength = await gallery.getBundleLength()
        console.log(`successfully listed bundle #${bundleLength.sub(1).toNumber()}`)
        if (bundleLength.eq(10000)) {
          process.stdout.write('successfully listed all bundles')
          process.exit(0)
        }
      } else if (round.lt(nextRoundId)) {
        clear()
        const delta = nextRoundId.sub(round)
        process.stdout.write(
          `waiting for oracle round ${nextRoundId.toNumber()} (${delta.toNumber()} round${
            delta.eq(1) ? '' : 's'
          } left)...`
        )
      } else {
        clear()
        throw new Error(`${round} is invalid`)
      }
    })
  } else if (bundleLength.eq(10000)) {
    console.log('all bundles have been listed')
    process.exit(0)
  } else {
    throw new Error(`${bundleLength} is invalid`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
