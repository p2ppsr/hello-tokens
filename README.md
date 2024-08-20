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
const script = await HelloTokens.createOutputScript(message)

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
const submissionResult = await HelloTokens.submitToOverlay(
  newToken, 
  'https://staging-overlay.babbage.systems'
)
```
*Note: You must have the MetaNet Client or other compatible wallet available.*
