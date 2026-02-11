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
 * Returns a 429 (rate-limited) response with retry_after.
 * auto-retry will retry once (maxRetryAttempts: 1) then fail with GrammyError.
 */
function rateLimitedResponse(retryAfter = 1) {
  return new Response(
    JSON.stringify({
      ok: false,
      error_code: 429,
      description: "Too Many Requests: retry after " + retryAfter,
      parameters: { retry_after: retryAfter },
    }),
    { status: 429, headers: { "content-type": "application/json" } },
  );
}

/**
 * Creates a fake fetch that always returns a 429 rate-limited response.
 * Tracks total call count.
 */
function createFakeFetch() {
  const counter = { count: 0 };
  const fakeFetch = async () => {
    counter.count++;
    return rateLimitedResponse(1);
  };
  return { fakeFetch, counter };
}

/**
 * Creates a bot that uses a fake fetch to simulate API errors.
 * auto-retry with maxRetryAttempts: 1 will retry once then fail.
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

describe("auto-retry on errors without conversation", () => {
  it("reply (sendMessage) retries once then fails", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/send_message"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error after retries exhausted");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
    console.log(`  sendMessage (no conversation): ${counter.count} attempt(s), error: ${error.message}`);
  });

  it("replyWithPhoto (sendPhoto) retries once then fails", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/send_photo"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error after retries exhausted");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
    console.log(`  sendPhoto (no conversation): ${counter.count} attempt(s), error: ${error.message}`);
  });
});

describe("auto-retry on errors inside conversation", () => {
  it("reply (sendMessage) inside conversation retries once then fails", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/conv_message"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error after retries exhausted");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
    console.log(`  sendMessage (conversation): ${counter.count} attempt(s), error: ${error.message}`);
  });

  it("replyWithPhoto (sendPhoto) inside conversation retries once then fails", { timeout: 30_000 }, async () => {
    const { fakeFetch, counter } = createFakeFetch();
    const bot = createTestBot(fakeFetch);

    let error;
    try {
      await bot.handleUpdate(makeUpdate("/conv_photo"));
    } catch (err) {
      error = err;
    }

    assert.ok(error, "Expected an error after retries exhausted");
    assert.strictEqual(counter.count, 2, "Expected 2 attempts (1 initial + 1 retry)");
    console.log(`  sendPhoto (conversation): ${counter.count} attempt(s), error: ${error.message}`);
  });
});
