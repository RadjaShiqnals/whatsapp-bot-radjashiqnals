# RadjaShiqnals-WhatsappBot

This project is a WhatsApp bot built using `whatsapp-web.js`, `axios`, and other libraries. The bot can respond to commands such as asking questions to AI models, converting media to stickers, and providing help information.

## Features

- **Ask AI**: Query AI models like OpenAI, Gemini, and Olama.
- **Sticker Conversion**: Convert images or GIFs to stickers.
- **Help Command**: Display available commands.

## Requirements

- Node.js
- Google Chrome
- FFMPEG

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/RadjaShiqnals/RadjaShiqnals-WhatsappBot.git
   cd RadjaShiqnals-WhatsappBot
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Configure the bot:
   - Copy `example-config.json` to `config.json`:
     - **Command Prompt**:
       ```cmd
       copy example-config.json config.json
       ```
     - **PowerShell**:
       ```powershell
       Copy-Item example-config.json config.json
       ```
     - **macOS/Linux**:
       ```sh
       cp example-config.json config.json
       ```
   - Update the `config.json` file with your API keys and settings.

4. Start the bot:
   ```sh
   node index.js
   ```

5. Scan the QR code with your WhatsApp to authenticate.

## Usage

- **!ask <query>**: Ask a question or request information from the AI models.
- **!sticker**: Send an image or GIF with this command to convert it to a sticker.
- **!help**: Display the help message with available commands.

## License

This project is licensed under the MIT License.
