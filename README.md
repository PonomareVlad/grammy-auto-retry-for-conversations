# grammy-auto-retry-for-conversations

Demo project to test [grammY](https://grammy.dev/) auto-retry plugin behavior with conversations, specifically investigating differences in retry behavior between conversation and non-conversation API requests on network timeouts.

## Setup

- **Node.js 24+** required
- Uses [grammy](https://www.npmjs.com/package/grammy) with plugins:
  - [@grammyjs/conversations](https://www.npmjs.com/package/@grammyjs/conversations) — multi-step conversation flows
  - [@grammyjs/auto-retry](https://www.npmjs.com/package/@grammyjs/auto-retry) — automatic retry on network errors, rate limits, and server errors
  - [@grammyjs/commands](https://www.npmjs.com/package/@grammyjs/commands) — command management

## Bot Commands

| Command | Description |
|---------|-------------|
| `/send_message` | `ctx.reply()` — sendMessage without conversation |
| `/send_photo` | `ctx.replyWithPhoto()` — sendPhoto without conversation |
| `/conv_message` | `ctx.reply()` inside conversation |
| `/conv_photo` | `ctx.replyWithPhoto()` inside conversation |

## Running

```bash
npm install
TELEGRAM_BOT_TOKEN=your_token_here npm start
```

## Testing

Tests point the bot's `apiRoot` to a non-routable address (`http://192.0.2.1` — TEST-NET-1, RFC 5737) to trigger real network timeouts. A pre-fetched `botInfo` is used to skip the internal `bot.init()` / `getMe` call. Each test counts API call attempts via a transformer to observe auto-retry behavior.

```bash
npm test
```

### Test Matrix

| Scenario | sendMessage | sendPhoto |
|----------|------------|-----------|
| Without conversation | ✅ | ✅ |
| Inside conversation | ✅ | ✅ |

## CI

GitHub Actions workflow runs tests on push/PR to `main` using the `TELEGRAM_BOT_TOKEN` secret for bot info.