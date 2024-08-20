import { EnvelopeEvidenceApi, toBEEFfromEnvelope } from '@babbage/sdk-ts'
import { Transaction } from '@bsv/sdk'
import pushdrop from 'pushdrop'

/**
 * Class for creating Bitcoin locking scripts that embed a "Hello World" message.
 */
export default class HelloWorldToken {
  /**
   * Creates a Bitcoin locking script that pushes and drops the given message with a simple P2PK lock.
   *
   * @param message - The message to embed in the Bitcoin locking script.
   * @returns - A promise that resolves to the locking script in hex format.
   *
   * @example
   * const script = await HelloWorldToken.createOutputScript('Hello, Blockchain!')
   * console.log(script) // Outputs the locking script as a hex string.
   */
  static async createOutputScript(message: string): Promise<string> {
    return await pushdrop.create({
      fields: [Buffer.from(message)],
      protocolID: 'helloworld',
      keyID: '1'
    })
  }

  /**
   * Submits a hello world token to the specified overlay service.
   * 
   * @param token - The hello world token which can be in EnvelopeEvidenceApi format, or raw beef data as a number[].
   * @param overlayURL - The URL of the overlay service you want to submit the token to.
   * @returns - A promise that resolves to the submission status response from the overlay.
   */
  static async submitToOverlay(
    token: EnvelopeEvidenceApi | number[],
    overlayURL: string
  ): Promise<any> {
    let beef: number[]

    // Determine the token format
    if (Array.isArray(token)) {
      beef = token
    } else {
      // Convert EnvelopeEvidenceApi to beef format
      beef = toBEEFfromEnvelope({
        rawTx: token.rawTx,
        inputs: token.inputs,
        txid: token.txid
      }).beef
    }

    // Submit the beef data to the overlay service
    const result = await fetch(`${overlayURL}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Topics': JSON.stringify(['tm_helloworld'])
      },
      body: new Uint8Array(beef)
    })

    return await result.json()
  }

  /**
   * 
   * @param message - Token message to search by, or specify 'findAll' to fetch all HelloWorld tokens from the Overlay Service.
   * @param overlayURL - URL of the Overlay Service to lookup results from.
   * @returns - Promise that resolves to an array of matching tokens found.
   */
  static async lookupTokens(message: string, overlayURL: string): Promise<any[]> {
    const result = await fetch(`${overlayURL}/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service: 'ls_helloworld',
        query: message
      })
    })
    const lookupAnswer = await result.json()

    if (lookupAnswer.type === 'output-list') {
      const tokensFromLookup = await Promise.all(lookupAnswer.outputs.map(async output => {
        const tx = Transaction.fromBEEF(output.beef)

        const result = pushdrop.decode({
          script: tx.outputs[output.outputIndex].lockingScript.toHex(),
          fieldFormat: 'buffer'
        })

        const helloMessage = result.fields[0].toString('utf8')

        return {
          task: helloMessage,
          sats: tx.outputs[output.outputIndex].satoshis,
          token: {
            txid: tx.id('hex'),
            outputIndex: output.outputIndex,
            lockingScript: tx.outputs[output.outputIndex].lockingScript.toHex()
          }
        }
      }))
      return tokensFromLookup
    }
    return []
  }
}
