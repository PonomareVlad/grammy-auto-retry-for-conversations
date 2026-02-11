import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";
import { conversations, createConversation } from "@grammyjs/conversations";

/**
 * Creates and configures the bot instance.
 * @param {string} token - Telegram bot token
 * @param {object} [options] - Bot options
 * @param {object} [options.botInfo] - Pre-fetched bot info to skip getMe call
 * @param {object} [options.autoRetryConfig] - Config for auto-retry plugin
 * @param {object} [options.client] - Additional client options passed to Bot (e.g. { apiRoot })
 * @returns {Bot}
 */
export function createBot(token, options = {}) {
  const botOptions = {};
  if (options.botInfo) botOptions.botInfo = options.botInfo;
  if (options.client) botOptions.client = options.client;
  const bot = new Bot(token, botOptions);

  bot.api.config.use(
    autoRetry({
      maxRetryAttempts: 1,
      maxDelaySeconds: 5,
      ...options.autoRetryConfig,
    })
  );

  bot.use(conversations());

  async function conversationSendMessage(conversation, ctx) {
    await ctx.reply("Message sent inside conversation");
  }

  async function conversationSendPhoto(conversation, ctx) {
    await ctx.replyWithPhoto("https://picsum.photos/200/300", {
      caption: "Photo sent inside conversation",
    });
  }

  bot.use(createConversation(conversationSendMessage));
  bot.use(createConversation(conversationSendPhoto));

  bot.command("send_message", (ctx) =>
    ctx.reply("Message sent without conversation")
  );

  bot.command("send_photo", (ctx) =>
    ctx.replyWithPhoto("https://picsum.photos/200/300", {
      caption: "Photo sent without conversation",
    })
  );

  bot.command("conv_message", (ctx) =>
    ctx.conversation.enter("conversationSendMessage")
  );

  bot.command("conv_photo", (ctx) =>
    ctx.conversation.enter("conversationSendPhoto")
  );

  return bot;
}
