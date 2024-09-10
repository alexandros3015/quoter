import * as PImage from "pureimage";
import * as fs from "fs";
import axios from "axios";
import sharp from "sharp";

const WIDTH = 800;
const HEIGHT = 400;

export class Quote {

    /**
     * @param {string} quote - the quote
     * @param {string} author - the author of the quote
     * @param {string} pfpUrl - the url of the author's profile picture
     * @description Generates an image of the quote
     */
    constructor(quote, author, pfpUrl) {
        this.quote = quote;
        this.author = author;
        this.pfpUrl = pfpUrl;

    }

    async genQuote() {

        let imgpath = "outs/out" + Date.now() + ".png";

        const img1 = PImage.make(WIDTH, HEIGHT);

        const ctx = img1.getContext("2d");

        const fnt = PImage.registerFont(
            "Times New Roman.ttf",
            "Times New Roman"
        );
        fnt.loadSync();

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            let currentY = y;

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, currentY);
                    line = words[n] + ' ';
                    currentY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            context.fillText(line, x, currentY);
            return currentY; // Return the Y position of the last line
        }

        // Quote and author text
        ctx.fillStyle = "white";
        ctx.font = "24pt 'Times New Roman'";

        const textX = WIDTH / 2 + 10;
        const maxWidth = WIDTH / 2 - 20;
        const quoteY = wrapText(ctx, `"${this.quote}"`, textX, 100, maxWidth, 30);

        ctx.font = "18pt 'Times New Roman'";
        ctx.fillText(`- ${this.author}`, textX, quoteY + 30);

        // download profile picture

        let pfpPath = "outs/pfp" + Date.now() + ".png";

        await downloadImage(this.pfpUrl, pfpPath);

        console.log("Image downloaded");

        let img = await PImage.decodePNGFromStream(fs.createReadStream(pfpPath))

        console.log("Image loaded");

        // Calculate dimensions to fit the image on the left half of the canvas
        const aspectRatio = img.width / img.height;
        const drawHeight = HEIGHT / 2;
        const drawWidth = drawHeight * aspectRatio;
        const drawX = WIDTH / 8;
        const drawY = HEIGHT / 4;

        ctx.drawImage(img, 0, 0, img.width, img.height, drawX, drawY, drawWidth, drawHeight);

        await PImage.encodePNGToStream(img1, fs.createWriteStream(imgpath))

        fs.unlinkSync(pfpPath)

        return imgpath
    }

    /**
     * @param {string} imgpath
     */
    deleteFile(imgpath) {
        fs.unlinkSync(imgpath);
    }
}

async function downloadImage(url, path) {
    const response = await axios({
        url,
        responseType: 'arraybuffer', // Download the image as a binary buffer
    });

    // Convert the image to PNG using sharp
    await sharp(response.data)
        .png() // Convert to PNG format
        .grayscale(true) // Convert to grayscale
        .toFile(path); // Save it as a PNG

    console.log('Image downloaded and converted to PNG successfully');
}

export default Quote;
