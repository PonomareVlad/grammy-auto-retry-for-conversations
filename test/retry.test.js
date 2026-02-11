import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBot } from "../src/bot.js";

const BOT_INFO = {
  id: 123456789,
  is_bot: true,
  first_name: "TestBot",
  username: "test_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
};

const TEST_TOKEN = "123456789:TEST_TOKEN";

// Connection refused — triggers immediate network error (HttpError in grammY)
const UNREACHABLE_API_ROOT = "http://127.0.0.1:1";

function makeUpdate(text, updateId = 1) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      from: { id: 1, is_bot: false, first_name: "User" },
      chat: { id: 1, type: "private", first_name: "User" },
      date: Math.floor(Date.now() / 1000),
      text,
      entities: [{ type: "bot_command", offset: 0, length: text.length }],
    },
  };
}

/**
 * Creates a bot configured with an unreachable apiRoot.
 * Installs a transformer to count every API call attempt.
 */
function createTestBot(autoRetryConfig = {}) {
  const retryCounter = { count: 0, methods: [] };

  const bot = createBot(TEST_TOKEN, {
    botInfo: BOT_INFO,
    client: {
      apiRoot: UNREACHABLE_API_ROOT,
      timeoutSeconds: 5,
    },
    autoRetryConfig: {
      maxRetryAttempts: 3,
      maxDelaySeconds: 5,
      ...autoRetryConfig,
    },
  });

  // Install a transformer to count every call attempt
  bot.api.config.use((prev, method, payload, signal) => {
    retryCounter.count++;
    retryCounter.methods.push(method);
    return prev(method, payload, signal);
  });

  return { bot, retryCounter };
}

describe("auto-retry on network errors without conversation", () => {
  it("reply (sendMessage) on network error", { timeout: 15_000 }, async () => {
    const { bot, retryCounter } = createTestBot({ rethrowHttpErrors: true });

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/send_message"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error from unreachable API");
    console.log(`  sendMessage (no conversation): ${retryCounter.count} attempt(s), error: ${error.message}`);
    console.log(`  methods called: [${retryCounter.methods}]`);
  });

  it("replyWithPhoto (sendPhoto) on network error", { timeout: 15_000 }, async () => {
    const { bot, retryCounter } = createTestBot({ rethrowHttpErrors: true });

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/send_photo"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error from unreachable API");
    console.log(`  sendPhoto (no conversation): ${retryCounter.count} attempt(s), error: ${error.message}`);
    console.log(`  methods called: [${retryCounter.methods}]`);
  });
});

describe("auto-retry on network errors inside conversation", () => {
  it("reply (sendMessage) inside conversation on network error", { timeout: 15_000 }, async () => {
    const { bot, retryCounter } = createTestBot({ rethrowHttpErrors: true });

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/conv_message"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error from unreachable API");
    console.log(`  sendMessage (conversation): ${retryCounter.count} attempt(s), error: ${error.message}`);
    console.log(`  methods called: [${retryCounter.methods}]`);
  });

  it("replyWithPhoto (sendPhoto) inside conversation on network error", { timeout: 15_000 }, async () => {
    const { bot, retryCounter } = createTestBot({ rethrowHttpErrors: true });

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/conv_photo"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error from unreachable API");
    console.log(`  sendPhoto (conversation): ${retryCounter.count} attempt(s), error: ${error.message}`);
    console.log(`  methods called: [${retryCounter.methods}]`);
  });
});
