import {Quote} from "./image-gen.js";
import {Client, GatewayIntentBits, REST, Routes} from 'discord.js';
import * as fs from "node:fs";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMessages,] });

const token = process.env.TOKEN
const client_id = process.env.CLIENT_ID

let channel_id = null
loadQuoteChannel()

const rest = new REST({version:'10'}).setToken(token);

const commands = [
    {
        name:"set_quote_channel",
        description:"Set the channel for quotes",
        options:[
            {
                name: "channel",
                description:"Channel for quotes",
                type:7,
                required:true
            }
        ]

    }
]

try{
    console.log("registering slash commands")
    rest.put(Routes.applicationCommands(client_id),
        {body:commands})
        .then(()=>{
            console.log("registered commands")
        })
}
catch (e){
    console.log(e)
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log("Bot started")
});


client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if(message.channelId !== channel_id) return

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

client.on("interactionCreate", async interaction => {

    if(!interaction.isChatInputCommand()) return;
    if(interaction.user.id != "743902235473346563") return

    if(interaction.commandName === "set_quote_channel") {

        channel_id = interaction.options.data[0].value

        saveQuoteChannel()
        await interaction.reply("set")
    }
})

function checkQuote(str) {
    // Define the regular expression to match the format: "..." - @...
    const regex = /^"(.*?)" - <@(.*)>$/;

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

function saveQuoteChannel() {
    // save to a file
    fs.writeFileSync('channel_id.txt', channel_id);
}

function loadQuoteChannel() {
    // load from a file
    try{
        channel_id = fs.readFileSync('channel_id.txt', 'utf8') || null;
    }
    catch (e){
        console.log("couldnt load channel id")
    }
}
