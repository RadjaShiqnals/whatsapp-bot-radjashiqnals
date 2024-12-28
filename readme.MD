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

If you don't have FFMPEG installed, you can install them using Chocolatey:

1. Install Chocolatey (if not already installed):
   ```sh
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. Install FFMPEG:
   ```sh
   choco install ffmpeg -y
   ```

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

4. **Important**: Before starting the bot, make sure to set up `executablePath` with the path to your Chrome executable and `ffmpegPath` with the path to your FFMPEG executable in the `index.js` file.

5. Start the bot:
   ```sh
   node index.js
   ```

6. Scan the QR code with your WhatsApp to authenticate.

## Usage

- **!ask <query>**: Ask a question or request information from the AI models.
- **!sticker**: Send an image or GIF with this command to convert it to a sticker.
- **!help**: Display the help message with available commands.

## License

This project is licensed under the MIT License.
