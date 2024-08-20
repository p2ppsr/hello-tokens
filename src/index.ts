import { EnvelopeEvidenceApi, toBEEFfromEnvelope } from '@babbage/sdk-ts'
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
}
