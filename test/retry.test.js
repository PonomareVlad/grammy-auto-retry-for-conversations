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
 * Creates a fake fetch that always throws a network error (simulating timeout).
 * Tracks total call count.
 */
function createFakeFetch() {
  const counter = { count: 0 };
  const fakeFetch = async () => {
    counter.count++;
    throw new TypeError("fetch failed");
  };
  return { fakeFetch, counter };
}

/**
 * Creates a bot that uses a fake fetch to simulate network errors.
 * auto-retry with default config will retry HttpErrors (patched to respect maxRetryAttempts).
 */
function createTestBot(fakeFetch) {
  return createBot(TEST_TOKEN, {
    botInfo: BOT_INFO,
    client: {
      fetch: fakeFetch,
    },
    autoRetryConfig: {
      maxRetryAttempts: 1,
      maxDelaySeconds: 5,
    },
  });
}

/**
 * Determines auto-retry activation from the thrown error.
 * grammY wraps fetch errors as HttpError. If auto-retry activated,
 * the request was retried before the error propagated.
 */
function reportResult(label, counter, error) {
  const retryActivated = counter.count > 1;
  console.log([
    `  ${label}:`,
    `auto-retry=${retryActivated ? "YES" : "NO"}`,
    `attempts=${counter.count}`,
    `error=${error?.message ?? "none"}`,
  ].join(" | "));
}

describe("auto-retry on network errors without conversation", () => {
  it("reply (sendMessage) on network error", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/send_message"));
    } catch (err) {
      error = err;
    }

    reportResult("sendMessage (no conversation)", counter, error);
    assert.ok(error, "Expected an error from network failure");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
  });

  it("replyWithPhoto (sendPhoto) on network error", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/send_photo"));
    } catch (err) {
      error = err;
    }

    reportResult("sendPhoto (no conversation)", counter, error);
    assert.ok(error, "Expected an error from network failure");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
  });
});

describe("auto-retry on network errors inside conversation", () => {
  it("reply (sendMessage) inside conversation on network error", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/conv_message"));
    } catch (err) {
      error = err;
    }

    reportResult("sendMessage (conversation)", counter, error);
    assert.ok(error, "Expected an error from network failure");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
  });

  it("replyWithPhoto (sendPhoto) inside conversation on network error", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/conv_photo"));
    } catch (err) {
      error = err;
    }

    reportResult("sendPhoto (conversation)", counter, error);
    assert.ok(error, "Expected an error from network failure");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
  });
});
