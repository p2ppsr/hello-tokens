# hello-tokens
A simple utility for creating Bitcoin locking scripts that embed a "Hello World" message in the token.

## Installation

To install the package, run:

```bash
npm i hello-tokens
```

## Example Usage

```ts
import { HelloTokens } from 'hello-tokens'

// Create an output script
const script = await HelloTokens.createOutputScript('Hello Blockchain!')
const overlayURL = 'https://staging-overlay.babbage.systems'

// Create the action
const newToken = await createAction({
  outputs: [{
    satoshis: 1,
    script,
    description: 'New HelloWorld token'
  }],
  description: 'Create a HelloWorld token'
})

const beef = toBEEFfromEnvelope({
  rawTx: newToken.rawTx,
  inputs: newToken.inputs,
  txid: newToken.txid
}).beef

// Submit the new HelloWorld token to an Overlay Service
const submitResults = await fetch(`${overlayURL}/submit`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/octet-stream',
    'X-Topics': JSON.stringify(['tm_helloworld'])
  },
  body: new Uint8Array(beef)
})

// Find HelloWorld token by message
const lookupResults = await fetch(`${overlayURL}/lookup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    service: 'ls_helloworld',
    query: 'Hello Blockchain!'
  })
})

// Parse the lookup answer
const lookupAnswer = await lookupResults.json()
const message = await HelloTokens.parseLookupAnswer(lookupAnswer)
```
*Note: You must have the MetaNet Client or other compatible wallet available.*
