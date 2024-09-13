import {Quote} from "./image-gen.js";
import {Client, GatewayIntentBits} from 'discord.js';
import * as fs from "node:fs";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessages,] });

const token = process.env.TOKEN

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Bot started")
});


client.on('messageCreate', async message => {
    if (message.author.bot) return;

    let quote = message.content;


    let parts = checkQuote(quote)

    if(parts != null) {

        let quoteAuthorUser = await client.users.fetch(parts.afterAt);
        let author = quoteAuthorUser.username
        let pfpUrl = quoteAuthorUser.displayAvatarURL()

        let q = new Quote(parts.beforeAt, author, pfpUrl);
        let img = await q.genQuote();

        await message.reply({files: [img], content: "<@" + quoteAuthorUser.id + ">"});
        await message.delete()

        q.deleteFile(img)
    }
    // "the j" - <@1120942938126553190>
});

function checkQuote(str) {
    // Define the regular expression to match the format: "..." - @...
    const regex = /^[\"\'“”‘’](.*?)[\"\'“”‘’] - <@(.*)>$/;


    // Test if the string matches the regex
    const match = str.match(regex);

    if (match) {
        // Return the parts where the three dots are (before and after the " - ")
        return {
            beforeAt: match[1], // This captures the part inside the quotes
            afterAt: match[2]   // This captures the part after @
        };
    } else {
        // Return null if the format doesn't match
        return null;
    }
}

client.login(token);
