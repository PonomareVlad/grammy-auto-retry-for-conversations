# grammy-auto-retry-for-conversations

Demo project to test [grammY](https://grammy.dev/) auto-retry plugin behavior with conversations.

## Setup

- **Node.js 24+** required
- Uses [grammy](https://www.npmjs.com/package/grammy) with plugins:
  - [@grammyjs/conversations](https://www.npmjs.com/package/@grammyjs/conversations) — multi-step conversation flows
  - [@grammyjs/auto-retry](https://www.npmjs.com/package/@grammyjs/auto-retry) — automatic retry on rate limits (429) and server errors
  - [@grammyjs/commands](https://www.npmjs.com/package/@grammyjs/commands) — command management

## Bot Commands

| Command | Description |
|---------|-------------|
| `/send_message` | Send a text message (without conversation) |
| `/send_photo` | Send a photo (without conversation) |
| `/conv_message` | Send a text message inside a conversation |
| `/conv_photo` | Send a photo inside a conversation |

## Running

```bash
npm install
TELEGRAM_BOT_TOKEN=your_token_here npm start
```

## Testing

Tests use [undici](https://www.npmjs.com/package/undici) `MockAgent` + `setGlobalDispatcher` to mock Telegram API responses, simulating 429 rate-limit errors with `retry_after: 0` to verify auto-retry behavior.

```bash
npm test
```

### Test Matrix

| Scenario | sendMessage | sendPhoto |
|----------|------------|-----------|
| Without conversation (retry) | ✅ | ✅ |
| Without conversation (no retry) | ✅ | ✅ |
| Inside conversation (retry) | ✅ | ✅ |
| Inside conversation (no retry) | ✅ | ✅ |

## CI

GitHub Actions workflow runs tests on push/PR to `main` using the `TELEGRAM_BOT_TOKEN` secret for bot info.