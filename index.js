/**
 * WhatsApp bot using whatsapp-web.js, axios, and other libraries.
 *
 * This bot can respond to commands such as asking questions to AI models,
 * converting media to stickers, and providing help information.
 *
 * @module WhatsappWithOpenAI
 */

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const axios = require("axios");
const qrcode = require("qrcode-terminal");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const config = require("./config.json");
const { v4: uuidv4 } = require("uuid");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const resourcesDir = path.join(__dirname, "resources/ffmpeg-image-handler");
const { createCanvas, loadImage } = require('canvas');

if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir, { recursive: true });
}

/**
 * Initializes the WhatsApp client with the specified configuration.
 *
 * @constant {Client} client - The WhatsApp client instance.
 */
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: config.chromePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  },
  ffmpegPath: config.ffmpegPath,
});

/**
 * Event listener for QR code generation.
 *
 * @event client#qr
 * @param {string} qr - The QR code string.
 */
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("QR code received, scan please!");
});

/**
 * Event listener for client ready state.
 *
 * @event client#ready
 */
client.on("ready", () => {
  const enabledCommands = Object.entries(config.commands)
    .map(([command, isEnabled]) => `${isEnabled ? "✅" : "❌"} !${command}`)
    .join("\n");
  console.log(
    `${config.readyMessage}\n\nEnabled Commands:\n${enabledCommands}`
  );
  console.log("Active AI model:", config.activeAI);
});

/**
 * Event listener for incoming messages.
 *
 * @event client#message
 * @param {Message} message - The incoming message object.
 */
client.on("message", async (message) => {
  if (message.body.startsWith("!ask") && config.commands.ask) {
    /**
     * Handles the !ask command to query AI models.
     *
     * @function handleAskCommand
     * @param {Message} message - The incoming message object.
     */
    const query = message.body.replace("!ask", "").trim();
    if (query) {
      try {
        const loadingMessage = await message.reply(`Loading...`);
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 60000)
        );
        let response;

        if (config.activeAI === "gemini") {
          const payload = {
            contents: [
              {
                parts: [{ text: query }],
              },
            ],
          };

          if (message.hasMedia) {
            const media = await message.downloadMedia();
            payload.contents[0].parts.push({
              inline_data: {
                mime_type: media.mimetype,
                data: media.data,
              },
            });
          }
          const GeminiUrl = config.gemini.url + config.gemini.apiKey;
          response = await Promise.race([
            axios.post(GeminiUrl, payload),
            timeout,
          ]);

          const assistantResponse =
            response.data.candidates[0].content.parts[0].text.trim();
          await loadingMessage.edit(assistantResponse);
        } else if (config.activeAI === "openai") {
          const payload = {
            model: config.openai.model,
            messages: [{ role: "user", content: query }],
            temperature: 0.7,
            stream: false,
          };

          response = await Promise.race([
            axios.post(config.openai.url, payload, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${config.openai.apiKey}`,
              },
            }),
            timeout,
          ]);

          const assistantResponse =
            response.data.choices[0].message.content.trim();
          await loadingMessage.edit(assistantResponse);
        } else if (config.activeAI === "olama") {
          const payload = {
            model: config.olama.model,
            prompt: query,
            stream: false,
          };

          response = await Promise.race([
            axios.post(config.olama.url, payload),
            timeout,
          ]);

          const assistantResponse = response.data.response.trim();
          await loadingMessage.edit(assistantResponse);
        }
      } catch (error) {
        console.error(
          "Error:",
          error.response ? error.response.data : error.message
        );
        const errorMessage = `Sorry, I couldn't process your request.`;
        await loadingMessage.reply(errorMessage);
      }
    } else {
      message.reply(`Please provide a query after the command.`);
    }
  } else if (message.body.startsWith("!sticker") && config.commands.sticker) {
    /**
     * Handles the !sticker command to convert media to stickers.
     *
     * @function handleStickerCommand
     * @param {Message} message - The incoming message object.
     */
    const args = message.body.split(" ").slice(1); // Get all arguments after the command
    const mediaUrls = args.filter(arg => arg.startsWith("http"));
    const textMatch = message.body.match(/"([^"]+)"/);
    const mediaCount = message.hasMedia ? 1 : 0; // Count the media in the message
    const totalMedia = mediaUrls.length + mediaCount + (textMatch ? 1 : 0);
  
    if (totalMedia > 5) {
      message.reply("You can only process up to 5 media items at a time.");
      return;
    }
  
    const processMedia = async (media) => {
      if (!media.mimetype) {
        throw new Error("Media mimetype is undefined");
      }
  
      const maxSize = 3 * 1024 * 1024; // 3 MB
      const mediaBuffer = Buffer.from(media.data, "base64");
      if (mediaBuffer.length > maxSize) {
        throw new Error(
          "Media file size is too large. Please upload a file smaller than 3 MB."
        );
      }
  
      if (
        media.mimetype.startsWith("video") ||
        media.mimetype === "image/gif"
      ) {
        const uniqueId = uuidv4();
        const inputPath = path.join(
          resourcesDir,
          `input_${uniqueId}.${media.mimetype.split("/")[1]}`
        );
        const outputPath = path.join(resourcesDir, `output_${uniqueId}.webp`);
        fs.writeFileSync(inputPath, mediaBuffer);
  
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions([
              "-vcodec libwebp",
              "-vf",
              "scale=256:256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2",
              "-qscale",
              "50",
              "-preset",
              "default",
              "-loop",
              "0",
              "-an",
              "-vsync",
              "0",
            ])
            .toFormat("webp")
            .save(outputPath)
            .on("end", resolve)
            .on("error", reject);
        });
  
        const webpData = fs.readFileSync(outputPath, { encoding: "base64" });
        const webpMedia = new MessageMedia("image/webp", webpData);
  
        if (Buffer.byteLength(webpData, "base64") > 1 * 1024 * 1024) {
          throw new Error(
            "Converted WebP file size is too large. Please upload a smaller file."
          );
        }
  
        await message.reply(webpMedia, message.from, {
          sendMediaAsSticker: true,
        });
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
      } else {
        await message.reply(media, message.from, {
          sendMediaAsSticker: true,
        });
      }
    };
  
    const processUrl = async (url) => {
      try {
        const response = await fetch(url);
        const buffer = await response.buffer();
        const media = new MessageMedia("image/gif", buffer.toString("base64"));
        await message.reply(media, message.from, { sendMediaAsSticker: true });
      } catch (error) {
        console.error("Error fetching media from URL:", error);
        message.reply("Failed to fetch media from URL.");
      }
    };
  
    const processText = async (text) => {
      const canvas = createCanvas(512, 512);
      const ctx = canvas.getContext('2d');
  
      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      // Set text properties
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
  
      // Function to wrap text
      const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        const totalHeight = lines.length * lineHeight;
        const startY = y - (totalHeight / 2);
        for (let k = 0; k < lines.length; k++) {
          context.fillText(lines[k], x, startY + (k * lineHeight));
        }
      };
  
      // Adjust font size based on text length
      let fontSize = 40;
      const maxWidth = 480;
      const maxHeight = 480;
      let lineHeight = fontSize * 1.2;
      ctx.font = `bold ${fontSize}px Arial`;
  
      // Calculate the total height of the text
      const words = text.split(' ');
      let line = '';
      const lines = [];
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          lines.push(line);
          line = words[n] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      let totalHeight = lines.length * lineHeight;
  
      // Adjust font size to fit within the canvas
      while (totalHeight > maxHeight && fontSize > 10) {
        fontSize -= 2;
        lineHeight = fontSize * 1.2;
        ctx.font = `bold ${fontSize}px Arial`;
  
        // Recalculate the total height of the text
        line = '';
        lines.length = 0;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        totalHeight = lines.length * lineHeight;
      }
  
      // Wrap and draw text
      wrapText(ctx, text, canvas.width / 2, canvas.height / 2, maxWidth, lineHeight);
  
      const buffer = canvas.toBuffer('image/png');
      const media = new MessageMedia('image/png', buffer.toString('base64'));
      await message.reply(media, message.from, { sendMediaAsSticker: true });
    };
  
    try {
      const mediaPromises = [];
  
      if (message.hasMedia) {
        const media = await message.downloadMedia();
        mediaPromises.push(processMedia(media));
      }
  
      for (const url of mediaUrls) {
        mediaPromises.push(processUrl(url));
      }
  
      if (textMatch) {
        mediaPromises.push(processText(textMatch[1]));
      }
  
      if (mediaPromises.length === 0) {
        message.reply("Please provide a valid URL, media, or text within double quotes.");
        return;
      }
  
      await Promise.all(mediaPromises);
    } catch (error) {
      console.error("Error processing media:", error);
      message.reply(
        "Sorry, there was an error processing the media. " + error.message
      );
    }
  } else if (message.body.startsWith("!help") && config.commands.help) {
    /**
     * Handles the !help command to display available commands.
     *
     * @function handleHelpCommand
     * @param {Message} message - The incoming message object.
     */
    const helpText = `
Available commands:
${config.commands.ask ? "!ask <query> - Ask a question or request information.\n" : ""}${config.commands.sticker ? "!sticker - Send an image or GIF with this command to convert it to a sticker, provide a URL to convert it to a sticker, or use \"TEXT\" to create a text sticker.\n" : ""}${config.commands.help ? "!help - Display this help message." : ""}`;
  message.reply(helpText.trim());
  } else if (message.body.startsWith("!help")) {
    message.reply("No commands are enabled.");
  }
});

/**
 * Initializes the WhatsApp client.
 *
 * @function client.initialize
 */
client.initialize();
