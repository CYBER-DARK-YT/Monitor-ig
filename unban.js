const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

// 🔐 Your Telegram Bot Token here
const BOT_TOKEN = '7673395976:AAEVn95a5jfgFVHvgOPt_GxnFde8DILM8AI';
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// 🗃️ Track monitored accounts
const trackingAccounts = {};

// ✅ Check if an Instagram account is available
async function isAccountAvailable(username) {
    const url = `https://www.instagram.com/${username}/`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const html = await response.text();
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);

        if (titleMatch) {
            const title = titleMatch[1].toLowerCase();

            if (title.includes("page isn’t available") || title === "instagram") {
                return false; // Account is unavailable
            } else if (title.includes(username.toLowerCase())) {
                return true; // Account is active
            }
        }

        return null; // Unclear
    } catch (err) {
        console.error("[Error checking Instagram]:", err);
        return null;
    }
}

// ⏱ Monitor the account until it's active again
async function monitorAccount(chatId) {
    const { username, startTime } = trackingAccounts[chatId];

    while (true) {
        const available = await isAccountAvailable(username);

        if (available) {
            const endTime = new Date();
            const duration = Math.floor((endTime - startTime) / 1000);
            const hours = Math.floor(duration / 3600);
            const minutes = Math.floor((duration % 3600) / 60);

            const message = `📢 Recovered @${username}! Took ${hours}h ${minutes}m.`;
            await bot.sendMessage(chatId, message);
            delete trackingAccounts[chatId];
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
}

// 📩 Command handler
bot.onText(/\/unbanwatch\s+@?(\w+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];

    const status = await isAccountAvailable(username);

    if (status === null) {
        return bot.sendMessage(chatId, `⚠️ Unable to check @${username}. Try again later.`);
    }

    if (status === true) {
        return bot.sendMessage(chatId, `✅ This account @${username} is already activated!`);
    }

    bot.sendMessage(chatId, `🚀 Started monitoring @${username} for unban/recovery.`);

    trackingAccounts[chatId] = {
        username,
        startTime: new Date()
    };

    monitorAccount(chatId);
});

console.log("✅ Bot is running. Use /unbanwatch @username in Telegram.");
