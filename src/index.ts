import pushdrop from 'pushdrop'

/**
 * Class for creating Bitcoin locking scripts that embed a "Hello World" message.
 */
export default class HelloWorldToken {
  /**
   * Creates a Bitcoin locking script that pushes and drops the given message with a simple P2PK lock.
   *
   * @param {string} message - The message to embed in the Bitcoin locking script.
   * @returns {Promise<string>} - A promise that resolves to the locking script in hex format.
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
}
