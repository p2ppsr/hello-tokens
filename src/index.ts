import { Transaction } from '@bsv/sdk'
import pushdrop from 'pushdrop'

/**
 * Class for creating Bitcoin locking scripts that embed a "Hello World" message.
 */
export class HelloTokens {
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
  static async createOutputScript(message: string): Promise<string> {
    return await pushdrop.create({
      fields: [Buffer.from(message)],
      protocolID: 'helloworld',
      keyID: '1'
    })
  }

  /**
   * Parses lookup answer returned from an overlay service.
   * 
   * @param lookupDataToParse - Lookup answer containing output data to parse.
   * @returns - The HelloWorld message associated with the first output.
   */
  static async parseLookupAnswer(lookupDataToParse: any): Promise<string | undefined> {
    if (lookupDataToParse.type === 'output-list') {
      const tokensFromLookup = await Promise.all(lookupDataToParse.outputs.map(async output => {
        const tx = Transaction.fromBEEF(output.beef)

        const result = pushdrop.decode({
          script: tx.outputs[output.outputIndex].lockingScript.toHex(),
          fieldFormat: 'buffer'
        })

        const helloMessage = result.fields[0].toString('utf8')

        return {
          message: helloMessage,
          sats: tx.outputs[output.outputIndex].satoshis,
          token: {
            txid: tx.id('hex'),
            outputIndex: output.outputIndex,
            lockingScript: tx.outputs[output.outputIndex].lockingScript.toHex()
          }
        }
      }))
      return tokensFromLookup[0].message
    }
    return undefined
  }
}