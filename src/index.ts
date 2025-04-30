import { BroadcastFailure, BroadcastResponse, LookupAnswer, LookupResolver, PushDrop, TopicBroadcaster, Transaction, Utils, WalletClient } from '@bsv/sdk'

export interface HelloWorldToken {
  message: string
  token: {
    txid: string
    outputIndex: number
    lockingScript: string
    satoshis: number
  }
}

const DEFAULT_TOPIC = 'tm_helloworld'

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
    [1, 'HelloWorld'],
    '1',
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
    timeout?: number
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
  return parseLookupAnswer(answer)
}

/**
 * Parses lookup answer returned from an overlay service.
 * 
 * @param lookupAnswer - Lookup answer containing HelloWorld output data to parse.
 * @returns - The HelloWorld message associated with the first output.
 */
export function parseLookupAnswer(lookupAnswer: LookupAnswer): HelloWorldToken[] {
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
        satoshis: out.satoshis!
      }
    }
  })
}