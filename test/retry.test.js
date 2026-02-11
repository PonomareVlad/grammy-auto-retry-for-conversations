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

const OK_BODY = JSON.stringify({
  ok: true,
  result: {
    message_id: 1,
    from: BOT_INFO,
    chat: { id: 1, type: "private", first_name: "User" },
    date: Math.floor(Date.now() / 1000),
    text: "ok",
  },
});

/**
 * Creates a fake fetch that fails `failCount` times then succeeds.
 * Tracks total call count.
 */
function createFakeFetch(failCount = 2) {
  const counter = { count: 0 };
  const fakeFetch = async () => {
    counter.count++;
    if (counter.count <= failCount) {
      throw new TypeError("fetch failed");
    }
    return new Response(OK_BODY, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fakeFetch, counter };
}

/**
 * Creates a bot that uses a fake fetch to simulate network errors.
 * auto-retry with default config (rethrowHttpErrors=false) will retry on HttpErrors.
 */
function createTestBot(fakeFetch) {
  return createBot(TEST_TOKEN, {
    botInfo: BOT_INFO,
    client: {
      fetch: fakeFetch,
    },
    autoRetryConfig: {
      maxRetryAttempts: 1,
      maxDelaySeconds: 1,
    },
  });
}

describe("auto-retry on network errors without conversation", () => {
  it("reply (sendMessage) retries on network error then succeeds", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch(2);
    const bot = createTestBot(fakeFetch);

    await bot.handleUpdate(makeUpdate("/send_message"));

    assert.strictEqual(counter.count, 3, "Expected 3 attempts (2 failures + 1 success)");
    console.log(`  sendMessage (no conversation): ${counter.count} attempt(s)`);
  });

  it("replyWithPhoto (sendPhoto) retries on network error then succeeds", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch(2);
    const bot = createTestBot(fakeFetch);

    await bot.handleUpdate(makeUpdate("/send_photo"));

    assert.strictEqual(counter.count, 3, "Expected 3 attempts (2 failures + 1 success)");
    console.log(`  sendPhoto (no conversation): ${counter.count} attempt(s)`);
  });
});

describe("auto-retry on network errors inside conversation", () => {
  it("reply (sendMessage) inside conversation retries on network error then succeeds", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch(2);
    const bot = createTestBot(fakeFetch);

    await bot.handleUpdate(makeUpdate("/conv_message"));

    assert.strictEqual(counter.count, 3, "Expected 3 attempts (2 failures + 1 success)");
    console.log(`  sendMessage (conversation): ${counter.count} attempt(s)`);
  });

  it("replyWithPhoto (sendPhoto) inside conversation retries on network error then succeeds", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch(2);
    const bot = createTestBot(fakeFetch);

    await bot.handleUpdate(makeUpdate("/conv_photo"));

    assert.strictEqual(counter.count, 3, "Expected 3 attempts (2 failures + 1 success)");
    console.log(`  sendPhoto (conversation): ${counter.count} attempt(s)`);
  });
});
