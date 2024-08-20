# hello-tokens
A simple utility for creating Bitcoin locking scripts that embed a "Hello World" message in the token.

## Installation

To install the package, run:

```bash
npm i hello-tokens
```

## Example Usage

```ts
import HelloTokens from 'hello-tokens'

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

// Submit the new HelloWorld token to an Overlay Service
const submissionResult = await HelloTokens.submitToOverlay(newToken, overlayURL)

// Find HelloWorld token by message
const helloWorldTokens = await HelloTokens.lookupTokens('Hello Blockchain!', overlayURL)
```
*Note: You must have the MetaNet Client or other compatible wallet available.*
