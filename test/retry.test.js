import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { MockAgent, setGlobalDispatcher, Agent } from "undici";
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
const API_BASE = "https://api.telegram.org";

function makeUpdate(text, updateId = 1) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      from: { id: 1, is_bot: false, first_name: "User" },
      chat: { id: 1, type: "private", first_name: "User" },
      date: Math.floor(Date.now() / 1000),
      text,
    },
  };
}

function successResult(result = true) {
  return { ok: true, result };
}

function messageResult(text = "", messageId = 1) {
  return successResult({
    message_id: messageId,
    from: BOT_INFO,
    chat: { id: 1, type: "private", first_name: "User" },
    date: Math.floor(Date.now() / 1000),
    text,
  });
}

function photoResult(messageId = 1) {
  return successResult({
    message_id: messageId,
    from: BOT_INFO,
    chat: { id: 1, type: "private", first_name: "User" },
    date: Math.floor(Date.now() / 1000),
    photo: [{ file_id: "abc", file_unique_id: "abc", width: 200, height: 300 }],
  });
}

function rateLimitResponse(retryAfter = 0) {
  return {
    statusCode: 429,
    data: JSON.stringify({
      ok: false,
      error_code: 429,
      description: "Too Many Requests: retry after " + retryAfter,
      parameters: { retry_after: retryAfter },
    }),
    responseOptions: {
      headers: { "content-type": "application/json", "retry-after": String(retryAfter) },
    },
  };
}

/**
 * Configures the mock pool to first return 429 then succeed for a given method.
 */
function setupRetryMock(mockPool, method, successResponse, retryAfter = 0) {
  const path = `/bot${TEST_TOKEN}/${method}`;

  // First call: 429 rate limit
  mockPool
    .intercept({ path, method: "POST" })
    .reply(429, rateLimitResponse(retryAfter).data, rateLimitResponse(retryAfter).responseOptions);

  // Second call: success
  mockPool
    .intercept({ path, method: "POST" })
    .reply(200, JSON.stringify(successResponse), {
      headers: { "content-type": "application/json" },
    });
}

/**
 * Configures the mock pool to always succeed for a given method.
 */
function setupSuccessMock(mockPool, method, successResponse) {
  const path = `/bot${TEST_TOKEN}/${method}`;
  mockPool
    .intercept({ path, method: "POST" })
    .reply(200, JSON.stringify(successResponse), {
      headers: { "content-type": "application/json" },
    });
}

describe("auto-retry without conversation", () => {
  let mockAgent;
  let originalDispatcher;

  before(() => {
    originalDispatcher = globalThis[Symbol.for("undici.globalDispatcher.1")];
  });

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    if (originalDispatcher) {
      setGlobalDispatcher(originalDispatcher);
    }
  });

  it("retries sendMessage on 429 and succeeds", async () => {
    const mockPool = mockAgent.get(API_BASE);

    setupRetryMock(mockPool, "sendMessage", messageResult("Message sent without conversation"));

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/send_message"));
  });

  it("retries sendPhoto on 429 and succeeds", async () => {
    const mockPool = mockAgent.get(API_BASE);

    setupRetryMock(mockPool, "sendPhoto", photoResult());

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/send_photo"));
  });

  it("sendMessage succeeds without retry when no rate limit", async () => {
    const mockPool = mockAgent.get(API_BASE);

    setupSuccessMock(mockPool, "sendMessage", messageResult("Message sent without conversation"));

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/send_message"));
  });

  it("sendPhoto succeeds without retry when no rate limit", async () => {
    const mockPool = mockAgent.get(API_BASE);

    setupSuccessMock(mockPool, "sendPhoto", photoResult());

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/send_photo"));
  });
});

describe("auto-retry inside conversation", () => {
  let mockAgent;
  let originalDispatcher;

  before(() => {
    originalDispatcher = globalThis[Symbol.for("undici.globalDispatcher.1")];
  });

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    if (originalDispatcher) {
      setGlobalDispatcher(originalDispatcher);
    }
  });

  it("retries sendMessage inside conversation on 429 and succeeds", async () => {
    const mockPool = mockAgent.get(API_BASE);

    // The /conv_message command enters a conversation which calls sendMessage
    setupRetryMock(mockPool, "sendMessage", messageResult("Message sent inside conversation"));

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/conv_message"));
  });

  it("retries sendPhoto inside conversation on 429 and succeeds", async () => {
    const mockPool = mockAgent.get(API_BASE);

    // The /conv_photo command enters a conversation which calls sendPhoto
    setupRetryMock(mockPool, "sendPhoto", photoResult());

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/conv_photo"));
  });

  it("sendMessage inside conversation succeeds without retry when no rate limit", async () => {
    const mockPool = mockAgent.get(API_BASE);

    setupSuccessMock(mockPool, "sendMessage", messageResult("Message sent inside conversation"));

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/conv_message"));
  });

  it("sendPhoto inside conversation succeeds without retry when no rate limit", async () => {
    const mockPool = mockAgent.get(API_BASE);

    setupSuccessMock(mockPool, "sendPhoto", photoResult());

    const bot = createBot(TEST_TOKEN, {
      botInfo: BOT_INFO,
      autoRetryConfig: { maxDelaySeconds: 1 },
      client: { fetch: globalThis.fetch },
    });

    bot.catch((err) => { throw err; });

    await bot.handleUpdate(makeUpdate("/conv_photo"));
  });
});
