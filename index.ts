import { Quote } from "./image-gen.js";
import {
  ApplicationCommandOptionType,
  Client,
  GatewayIntentBits,
} from "discord.js";
import { REST } from "discord.js";
import { Routes } from "discord.js";
import * as fs from "node:fs";
import sqlite3 from "sqlite3";
const { Database } = sqlite3;

const token = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const db = new Database("db.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote TEXT,
      author INTEGER,
      quoter INTEGER,
      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `);
});

const commands = [
  {
    name: "count",
    description: "Counts the number of quotes in the database",
  },
  {
    name: "quote",
    description: "Generates a quote",
    options: [
      {
        name: "quote",
        description: "The quote to generate",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "author",
        description: "The ID of the user who said the quote",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },
];
const rest = new REST({ version: "10" }).setToken(token as string);
try {
  console.log("registering slash commands");
  rest
    .put(Routes.applicationCommands(CLIENT_ID as string), { body: commands })
    .then(() => {
      console.log("registered commands");
    });
} catch (e) {
  console.log(e);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user!.tag}!`);
  console.log("Bot started");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  let quote = message.content;

  let parts = checkQuote(quote);

  if (parts != null) {
    try {
      let quoteAuthorUser = await client.users.fetch(parts.afterAt);
      let author = quoteAuthorUser.username;
      let pfpUrl = quoteAuthorUser.displayAvatarURL();

      let q = new Quote(parts.beforeAt, author, pfpUrl);
      let img = await q.genQuote();

      const stmt = db.prepare(
        "INSERT INTO quotes (quote, author, quoter) VALUES (?, ?, ?)"
      );
      stmt.run(parts.beforeAt, quoteAuthorUser.id, message.author.id);
      stmt.finalize();

      await message.reply({
        files: [img],
        content: "<@" + quoteAuthorUser.id + ">",
      });
      await message.delete();

      q.deleteFile(img);
    } catch (e) {
      console.log(e);
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const command = interaction.commandName;

    switch (command) {
      case "count":
        db.get("SELECT COUNT(*) as count FROM quotes", async (err, row) => {
          await interaction.reply(
            // @ts-ignore
            `There are ${row.count} quotes in the database.`
          );
        });

        break;
      case "quote":
        const quote = interaction.options.get("quote")?.value;
        const author = interaction.options
          .get("author")
          ?.value?.toString()
          .replace("<@", "")
          .replace(">", "");

        if (quote && author) {
          try {
            let quoteAuthorUser = await client.users.fetch(author);
            let pfpUrl = quoteAuthorUser.displayAvatarURL();
            let q = new Quote(
              quote as string,
              quoteAuthorUser.username,
              pfpUrl
            );
            let img = await q.genQuote();

            const stmt = db.prepare(
              "INSERT INTO quotes (quote, author, quoter) VALUES (?, ?, ?)"
            );
            stmt.run(quote, quoteAuthorUser.id, interaction.user.id);
            stmt.finalize();

            await interaction.reply({
              files: [img],
              content: "<@" + quoteAuthorUser.id + ">",
            });
            await interaction.deleteReply();

            q.deleteFile(img);
          } catch (e) {
            await interaction.reply("error");
          }
        } else {
          await interaction.reply("error");
        }
        break;
    }
  }
});

function checkQuote(str: string) {
  const regex = /^[\"\'“”‘’](.*?)[\"\'“”‘’] - <@(.*)>$/;

  const match = str.match(regex);

  if (match) {
    return {
      beforeAt: match[1],
      afterAt: match[2],
    };
  } else {
    return null;
  }
}

client.login(token);
