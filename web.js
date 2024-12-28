const express = require("express");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const bodyParser = require("body-parser");
const config = require("./config.json");
const fs = require("fs");
const WebSocket = require("ws");
const axios = require("axios");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const ffmpeg = require("fluent-ffmpeg");
const crypto = require("crypto");
const session = require("express-session");

const app = express();
const port = 3000;

let encryptionKey;
let scannerPhoneNumber;

const getScannerPhoneNumber = async (client) => {
    const chats = await client.getChats();
    const scannerChat = chats.find(
        (chat) =>
            chat.isGroup === undefined &&
            chat.isReadOnly === false &&
            chat.lastMessage &&
            chat.lastMessage.from === chat.lastMessage.to
    );
    if (scannerChat) {
        return scannerChat.id._serialized;
    }
    console.log("No scanner chat found");
    return null;
};
app.use(bodyParser.json());

app.use(
    session({
        secret: "your-secret-key",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Set to true if using HTTPS
    })
);

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/login", (req, res) => {
    const { key } = req.body;
    if (key === encryptionKey) {
        req.session.loggedIn = true;
        res.send("Login successful.");
    } else {
        res.status(401).send("Invalid key.");
    }
});

app.use((req, res, next) => {
    if (req.path !== "/login" && (!req.session.loggedIn || !clientReady)) {
        res.redirect("/login");
    } else {
        next();
    }
});

let qrCodeData = "";
let clientReady = false;

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

client.on("qr", (qr) => {
    console.log("QR code received, generating...");
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error("Error generating QR code:", err);
            return;
        }
        qrCodeData = url;
        console.log("QR code generated");
        broadcast({ type: "qr", data: qrCodeData });
    });
});

client.on("ready", async () => {
    clientReady = true;
    scannerPhoneNumber = await getScannerPhoneNumber(client);
    if (scannerPhoneNumber) {
        scannerPhoneNumber = scannerPhoneNumber.split("@")[0]; // Extract the phone number
    }
    console.log("Encryption key are on the scanner phone number!");
    console.log("Client is ready!");
    if (!encryptionKey) {
        encryptionKey = crypto.randomBytes(32).toString("hex");
        if (scannerPhoneNumber) {
            await client.sendMessage(
                `${scannerPhoneNumber}@c.us`,
                `Your encryption key: ${encryptionKey}`
            );
        }
        broadcast({ type: "ready", key: encryptionKey });
    } else {
        broadcast({ type: "ready" });
    }
});

client.on("message", async (message) => {
    if (message.body.startsWith("!ask") && config.commands.ask) {
        const query = message.body.replace("!ask", "").trim();
        if (query) {
            let loadingMessage;
            try {
                loadingMessage = await message.reply(`Loading...`);
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
                    console.log("GeminiUrl", GeminiUrl);
                    
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
                if (loadingMessage) {
                    await loadingMessage.edit(errorMessage);
                } else {
                    await message.reply(errorMessage);
                }
            }
        } else {
            message.reply(`Please provide a query after the command.`);
        }
    } else if (message.body.startsWith("!sticker") && config.commands.sticker) {
        if (message.hasMedia) {
            try {
                const media = await message.downloadMedia();
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
                        __dirname,
                        `input_${uniqueId}.${media.mimetype.split("/")[1]}`
                    );
                    const outputPath = path.join(__dirname, `output_${uniqueId}.webp`);
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
            } catch (error) {
                console.error("Error downloading or processing media:", error);
                message.reply(
                    "Sorry, there was an error processing the media. " + error.message
                );
            }
        } else {
            message.reply("Please send an image or GIF with the !sticker command.");
        }
    } else if (message.body.startsWith("!help") && config.commands.help) {
        const helpText = `
Available commands:
${config.commands.ask ? "!ask <query> - Ask a question or request information.\n" : ""}${config.commands.sticker ? "!sticker - Send an image or GIF with this command to convert it to a sticker.\n" : "" }${config.commands.help ? "!help - Display this help message." : ""}`;
        message.reply(helpText.trim());
    } else if (message.body.startsWith("!help")) {
        message.reply("No commands are enabled.");
    } else if (message.body.startsWith("!")) {
        const errorMessage = `Sorry, I don't understand that command. Type !help to see available commands.`;
        message.reply(errorMessage);
    }
});

client.initialize();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/config", (req, res) => {
    res.json(config);
});

app.post("/config", (req, res) => {
    const { activeAI, command } = req.body;
    if (activeAI) {
        config.activeAI = activeAI;
    }
    if (command) {
        config.commands[command] = !config.commands[command];
    }
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
    res.send(
        `Command ${command} is now ${config.commands[command] ? "on" : "off"}`
    );
});

app.post("/disconnect", (req, res) => {
    client.destroy();
    clientReady = false;
    qrCodeData = "";
    res.send("Client disconnected!");
});

app.post("/logout", async (req, res) => {
    await client.logout();
    clientReady = false;
    qrCodeData = "";
    fs.rmSync('.wwebjs_auth', { recursive: true, force: true });
    fs.rmSync('.wwebjs_cache', { recursive: true, force: true });
    res.send("Client logged out and session data deleted!");
});

app.post("/validate-api", async (req, res) => {
    try {
        let response;
        if (config.activeAI === "gemini") {
            const URL = config.gemini.url + config.gemini.apiKey;
            response = await axios.post(
                URL,
                {
                    contents: [{ parts: [{ text: "say `test` just that" }] }],
                }
            );
        } else if (config.activeAI === "openai") {
            response = await axios.post(
                config.openai.url,
                {
                    model: config.openai.model,
                    messages: [{ role: "user", content: "say `test` just that" }],
                    temperature: 0.7,
                    stream: false,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${config.openai.apiKey}`,
                    },
                }
            );
        } else if (config.activeAI === "olama") {
            response = await axios.post(config.olama.url, {
                model: config.olama.model,
                prompt: "say `test` just that",
                stream: false,
            });
        }

        if (response.status === 200) {
            res.json({ valid: true });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error(
            "API validation error:",
            error.response ? error.response.data : error.message
        );
        res.json({ valid: false, error: error.message });
    }
});

const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    if (clientReady) {
        ws.send(JSON.stringify({ type: "ready", key: encryptionKey , aimodel: config.activeAI}));
    } else if (qrCodeData) {
        ws.send(JSON.stringify({ type: "qr", data: qrCodeData }));
    }
});

function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}
