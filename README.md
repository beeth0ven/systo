# ⚡ Systo

> Composable reactive state systems for fluid UIs and stateful AI agents.

[![Release](https://img.shields.io/github/v/release/beeth0ven/systo?include_prereleases&label=release&color=orange)](https://github.com/beeth0ven/systo/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> ⚠️ **Status: Active Alpha / Experimental**  
> APIs are actively evolving. Breaking changes may occur during alpha iterations.

---

## 📦 Installation

Since the package is currently hosted on **GitHub Packages**, configure your project's registry first:

### 1. Add `.npmrc`
Create a `.npmrc` file in the root of your project:
```ini
@beeth0ven:registry=https://npm.pkg.github.com
```

### 2. Install Package
```bash
# Using pnpm
pnpm add @beeth0ven/systo

# Using npm
npm install @beeth0ven/systo
```

---

## 🚀 Quick Example

```typescript
import { pipe, scan, view } from '@beeth0ven/systo';

// 1. Core State Graph (e.g. Agent Memory / Conversation History)
const agentSystem = scan({
  initialState: { messages: [], status: 'idle' },
  reduce: (state, event) => {
    switch (event.type) {
      case 'PROMPT':
        return {
          ...state,
          messages: [...state.messages, { role: 'user', content: event.text }],
          status: 'thinking',
        };
      case 'RESPONSE':
        return {
          ...state,
          messages: [...state.messages, { role: 'assistant', content: event.text }],
          status: 'idle',
        };
      default:
        return state;
    }
  },
});

// 2. Observe and Dispatch
const store = agentSystem.observe({
  next: (state) => console.log('State changed:', state),
});

store.dispatch({ type: 'PROMPT', text: 'Hello Systo!' });
```

---

## 🧩 Core Primitives

- **`scan`**: Accumulates events into a state graph using pure reducers.
- **`view`**: Local projections, sub-agent scopes, token buffering, and bidirectional event transformations.
- **`share`**: Multicasts an upstream store across multiple subscribers with reference-counted lifecycles.
- **`on`**: Side-effect interception, telemetry, and lifecycle hooks (`init`, `next`, `dispatch`, `dispose`).
- **`pipe`**: Composes operators linearly.

---

## 📄 License

[MIT](LICENSE) © 2026