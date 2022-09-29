import { BigNumberish, BytesLike, Signer } from 'ethers'
import { MultiSig } from '../typechain-types'

export const admins = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
]

export const asMultiSig = async (
  multiSig: MultiSig,
  signers: Signer[],
  to: string,
  value: BigNumberish,
  data?: BytesLike
) => {
  await multiSig.submitTransaction(to, value, data ?? [])
  const txIndex = (await multiSig.getTransactionCount()).sub(1)
  for (const signer of signers) {
    await multiSig.connect(signer).approveTransaction(txIndex)
  }
  return await multiSig.executeTransaction(txIndex)
}

export const submitAndWait = async (
  multiSig: MultiSig,
  to: string,
  value: BigNumberish,
  data?: BytesLike
) => {
  const tx = await multiSig.submitTransaction(to, value, data ?? [])
  const receipt = await tx.wait()
  const { txIndex } = receipt.events![0].args!

  console.log(`Tx #${txIndex} needs ${await multiSig.numConfirmationsRequired()} confirmations.`)

  await new Promise(resolve => {
    const filterTxIndex = multiSig.filters.TxApproved(null, txIndex)

    multiSig.on(filterTxIndex, async owner => {
      const { numConfirmations } = await multiSig.getTransaction(txIndex)
      const numConfirmationsRequired = await multiSig.numConfirmationsRequired()
      if (numConfirmations.gte(numConfirmationsRequired)) {
        console.log(`${owner} confirmed Tx #${txIndex}. Tx will now execute.`)
        resolve(owner)
      } else {
        console.log(
          `${owner} confirmed Tx #${txIndex}. [${numConfirmations}/${numConfirmationsRequired}] confirmations.`
        )
      }
    })
  })

  return await multiSig.executeTransaction(txIndex)
}
