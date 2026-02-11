import { createBot } from "../src/bot.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN environment variable is required");
  process.exit(1);
}

const bot = createBot(token);
bot.start();
console.log("Bot started");
