# hello-tokens
A simple helper for creating and discovering **“Hello World”** tokens on Bitcoin SV.

---

## Installation

```bash
npm i hello-tokens
```

---

## Quick start

```ts
import { createToken, queryTokens } from 'hello-tokens'

// 1 — Create a token that embeds the given UTF-8 message
await createToken('Hello, Blockchain!')

// 2 — Later: look it up via the ls_helloworld overlay
const tokens = await queryTokens({
  limit: 10,
  message: 'Hello, Blockchain!'
})

console.log(tokens[0].message) // → "Hello, Blockchain!"
```

> Behind the scenes **`createToken`** builds a PUSH-DROP locking script, funds it with 1 sat, and broadcasts the transaction with the topic `tm_helloworld` so overlay servers can track it instantly.

---

## Advanced usage

### Injecting your own wallet / resolver instances

If your app already manages a funded `WalletClient` (or wants to reuse a single `LookupResolver`), just pass them in:

```ts
import { createToken, queryTokens } from 'hello-tokens'
import { WalletClient, LookupResolver } from '@bsv/sdk'

const wallet   = new WalletClient()
const resolver = new LookupResolver({
  networkPreset: (await wallet.getNetwork()).network
})

await createToken('Hi again', { wallet })

const results = await queryTokens(
  { limit: 5, sortOrder: 'desc' },
  { resolver }
)
```

### Low-level helpers

Need to decode an overlay response yourself?

```ts
import { decodeLookupAnswer } from 'hello-tokens'

const answer   = await fetchOverlay(...)
const tokens   = decodeLookupAnswer(answer)
```

---

## API Overview

| Function | Purpose |
|----------|---------|
| **`createToken(message, opts?)`** | Create & broadcast a new Hello-World token. |
| **`queryTokens(params, opts?)`**  | Fetch existing outputs from an `ls_helloworld` overlay. |
| **`decodeLookupAnswer(answer)`**  | Convert a raw overlay answer into strongly-typed results. |

All functions are **stateless** and accept optional dependency injections, keeping your bundle small and your tests easy.

---

*Compatible with any BRC-100 wallet*