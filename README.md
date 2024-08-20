# hello-tokens
A simple utility for creating Bitcoin locking scripts that embed a "Hello World" message in the token.

## Installation

To install the package, run:

```bash
npm i hello-tokens
```

## Example Usage

```ts
import HelloWorldToken from 'hello-tokens'

const script = await HelloWorldToken.createOutputScript(message)
console.log('Generated Locking Script:', script)
```
*Note: You must have the MetaNet Client or other compatible wallet available.*