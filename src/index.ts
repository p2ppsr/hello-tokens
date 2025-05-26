import { Beef, BEEF, BroadcastFailure, BroadcastResponse, LookupAnswer, LookupResolver, PushDrop, TopicBroadcaster, Transaction, Utils, WalletClient, WalletProtocol } from '@bsv/sdk'

export interface HelloWorldToken {
  message: string
  token: {
    txid: string
    outputIndex: number
    lockingScript: string
    satoshis: number
    beef?: BEEF
  }
}

const DEFAULT_TOPIC = 'tm_helloworld'
const PROTOCOL: WalletProtocol = [1, 'HelloWorld']
const KEY_ID = '1'


/**
 * Creates a Bitcoin locking script that pushes and drops the given message with a simple P2PK lock.
 *
 * @param message - The message to embed in the Bitcoin locking script.
 * @returns - A promise that resolves to the locking script in hex format.
 *
 * @example
 * const script = await HelloTokens.createOutputScript('Hello, Blockchain!')
 * console.log(script) // Outputs the locking script as a hex string.
 */
export async function createToken(message: string): Promise<BroadcastResponse | BroadcastFailure> {
  const wallet = new WalletClient()
  const outputScript = await new PushDrop(wallet).lock(
    [Utils.toArray(message)],
    PROTOCOL,
    KEY_ID,
    'anyone',
    true
  )

  const { tx } = await wallet.createAction({
    outputs: [{
      satoshis: 1,
      lockingScript: outputScript.toHex(),
      outputDescription: 'New HelloWorld Token'
    }],
    options: { acceptDelayedBroadcast: false, randomizeOutputs: false },
    description: 'Create a HelloWorld token'
  })

  if (!tx) throw new Error('Failed to create transaction')

  const broadcaster = new TopicBroadcaster([DEFAULT_TOPIC], {
    networkPreset: (await wallet.getNetwork()).network
  })

  return broadcaster.broadcast(Transaction.fromAtomicBEEF(tx))
}

export async function updateToken(
  prevToken: HelloWorldToken,
  newMessage: string,
  wallet = new WalletClient()
): Promise<BroadcastResponse | BroadcastFailure> {
  if (prevToken.token.beef == null) {
    throw new Error('Token must contain tx BEEF to be updated')
  }

  /* 1. Build the NEW PushDrop locking script --------------------- */
  const pushdrop = new PushDrop(wallet)
  const newLocking = await new PushDrop(wallet).lock(
    [Utils.toArray(newMessage)],
    PROTOCOL,
    KEY_ID,
    'anyone',
    true
  )

  /* 2. Prepare the ACTION --------------------------------------- */
  const prevOutpoint = `${prevToken.token.txid}.${prevToken.token.outputIndex}` as const
  const loadedBEEF = Beef.fromBinary(prevToken.token.beef as number[])
  const { signableTransaction } = await wallet.createAction({
    description: 'Update HelloWorld token',
    inputBEEF: loadedBEEF.toBinary(),
    inputs: [{
      outpoint: prevOutpoint,
      unlockingScriptLength: 74,            // 1 sig, 1 pushdrop unlock
      inputDescription: 'Spend previous HelloWorld token'
    }],
    outputs: [{
      satoshis: 1,
      lockingScript: newLocking.toHex(),
      outputDescription: 'Updated HelloWorld Token'
    }],
    options: { acceptDelayedBroadcast: false, randomizeOutputs: false }
  })

  if (signableTransaction == null) {
    throw new Error('Unable to redeem token!')
  }
  // Wallet returned a signableTransaction → we still need to sign input 0
  const unlocker = pushdrop.unlock(PROTOCOL, KEY_ID, 'anyone')
  const unlockingScript = await unlocker.sign(Transaction.fromBEEF(signableTransaction.tx), 0)

  const { tx } = await wallet.signAction({
    reference: signableTransaction.reference,
    spends: {
      0: { unlockingScript: unlockingScript.toHex() }
    }
  })
  if (tx == null) {
    throw new Error('Unable to redeem token!')
  }
  const broadcaster = new TopicBroadcaster([DEFAULT_TOPIC], {
    networkPreset: (await wallet.getNetwork()).network
  })
  return broadcaster.broadcast(Transaction.fromAtomicBEEF(tx))
}

/**
 * Redeems a HelloWorld token by spending it.
 * @param token - The HelloWorld token to redeem.
 * @returns A promise that resolves to the broadcast response or failure.
 */
export async function redeemToken(token: HelloWorldToken): Promise<BroadcastResponse | BroadcastFailure> {
  const wallet = new WalletClient()
  const prevOutpoint = `${token.token.txid}.${token.token.outputIndex}` as const
  const loadedBEEF = Beef.fromBinary(token.token.beef as number[])
  const { signableTransaction } = await wallet.createAction({
    description: 'Redeem HelloWorld token',
    inputBEEF: loadedBEEF.toBinary(),
    inputs: [{
      outpoint: prevOutpoint,
      unlockingScriptLength: 74,            // 1 sig, 1 pushdrop unlock
      inputDescription: 'Spend previous HelloWorld token'
    }],
    options: { acceptDelayedBroadcast: false, randomizeOutputs: false }
  })

  if (signableTransaction == null) {
    throw new Error('Unable to redeem token!')
  }
  // Wallet returned a signableTransaction → we still need to sign input 0
  const unlocker = new PushDrop(wallet).unlock(PROTOCOL, KEY_ID, 'anyone')
  const unlockingScript = await unlocker.sign(Transaction.fromBEEF(signableTransaction.tx), 0)

  const { tx } = await wallet.signAction({
    reference: signableTransaction.reference,
    spends: {
      0: { unlockingScript: unlockingScript.toHex() }
    }
  })
  if (tx == null) {
    throw new Error('Unable to redeem token!')
  }
  const broadcaster = new TopicBroadcaster([DEFAULT_TOPIC], {
    networkPreset: (await wallet.getNetwork()).network
  })
  return broadcaster.broadcast(Transaction.fromAtomicBEEF(tx))
}


/**
 * Queries the **ls_helloworld** overlay and returns matching outputs as
 * {@link HelloWorldToken}s.
 *
 * All parameters mirror those used on the UI side so you can pass them
 * directly from your React state without an intermediate *buildQuery* helper.
 */
export async function queryTokens(
  params: {
    limit: number
    skip?: number
    sortOrder?: 'asc' | 'desc'
    message?: string
    startDate?: string
    endDate?: string
  },
  opts: {
    resolver?: LookupResolver
    wallet?: WalletClient           // only used if we must build a resolver
    timeout?: number,
    includeBeef?: boolean
  } = {}
): Promise<HelloWorldToken[]> {
  const {
    limit, skip = 0, sortOrder = 'desc',
    message, startDate, endDate
  } = params

  const query: Record<string, unknown> = { limit, skip, sortOrder }
  if (message?.trim()) query.message = message.trim()
  if (startDate) query.startDate = `${startDate}T00:00:00.000Z`
  if (endDate) query.endDate = `${endDate}T23:59:59.999Z`

  const resolver =
    opts.resolver ??
    new LookupResolver({
      networkPreset: (
        await (opts.wallet ?? new WalletClient()).getNetwork()
      ).network
    })

  const answer = await resolver.query(
    { service: 'ls_helloworld', query },
    opts.timeout ?? 10_000
  )
  return parseLookupAnswer(answer, opts.includeBeef)
}

/**
 * Parses lookup answer returned from an overlay service.
 * 
 * @param lookupAnswer - Lookup answer containing HelloWorld output data to parse.
 * @returns - The HelloWorld message associated with the first output.
 */
export function parseLookupAnswer(lookupAnswer: LookupAnswer, includeBeef?: boolean): HelloWorldToken[] {
  if (lookupAnswer.type !== 'output-list' || !lookupAnswer.outputs.length) return []

  return lookupAnswer.outputs.map(o => {
    const tx = Transaction.fromBEEF(o.beef)
    const out = tx.outputs[o.outputIndex]
    const data = PushDrop.decode(out.lockingScript)
    return {
      message: Utils.toUTF8(data.fields[0]),
      token: {
        txid: tx.id('hex'),
        outputIndex: o.outputIndex,
        lockingScript: out.lockingScript.toHex(),
        satoshis: out.satoshis!,
        ...(includeBeef ? { beef: o.beef } : {})
      }
    }
  })
}