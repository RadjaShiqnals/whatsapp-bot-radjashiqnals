# RadjaShiqnals-WhatsappBot

This project is a WhatsApp bot built using `whatsapp-web.js`, `axios`, and other libraries. The bot can respond to commands such as asking questions to AI models, converting media to stickers, and providing help information.

## Features

- **Ask AI**: Query AI models like OpenAI, Gemini, Olama, and OpenRouter.
- **Sticker Conversion**: Convert images or GIFs to stickers.
- **Help Command**: Display available commands.

## Requirements

- Node.js

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
   - Update the `config.json` file with your API keys and settings. For example:
     ```json
     {
       "readyMessage": "Your custom ready message",
       "gemini": {
         "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=",
         "apiKey": "YOUR_GEMINI_API_KEY"
       },
       "openai": {
         "url": "https://api.openai.com/v1/chat/completions",
         "apiKey": "YOUR_OPENAI_API_KEY",
         "model": "gpt-4o-mini"
       },
       "olama": {
         "url": "http://localhost:11434/api/generate",
         "model": "llama3.2"
       },
       "openrouter": {
         "url": "https://openrouter.ai/api/v1/chat/completions",
         "apiKey": "YOUR_OPENROUTER_API_KEY",
         "model": "undi95/toppy-m-7b:free"
       },
       "activeAI": "gemini",
       "commands": {
         "ask": true,
         "sticker": true,
         "help": true
       }
     }
     ```

4. Start the bot:
   ```sh
   node index.js
   ```

5. Scan the QR code with your WhatsApp to authenticate.

## Usage

- **!ask <query>**: Ask a question or request information from the AI models.
- **!sticker**: Send an image or GIF with this command to convert it to a sticker.
- **!help**: Display the help message with available commands.

## Terminal Controls

The bot can be configured through the terminal using the following controls:

- Press `Ctrl+X` to enter configuration mode
- In configuration mode:
  1. Change Active AI Model - Switch between Gemini, OpenAI, Olama, and OpenRouter
  2. Modify API Keys - Update API keys for different services
  3. Toggle Commands - Enable/disable specific commands
  4. Show Current Configuration - View current settings
  5. Exit Configuration Mode
- Press `Ctrl+C` to exit configuration mode or stop the bot

### Configuration Tutorial

1. Start the bot using `node index.js`
2. Press `Ctrl+X` to enter configuration mode
3. Select options by entering the corresponding number
4. Follow the prompts to modify settings
5. Changes are saved automatically
6. Press `Ctrl+C` to exit configuration mode
7. The bot will continue running with the new settings

## API Documentation

For detailed information on how the AI models are configured and used, refer to the [API Documentation](api.md).

## License

This project is licensed under the MIT License.
