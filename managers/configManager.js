const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config.json');
    this.config = require(this.configPath);
    this.menuState = 'main';
    this.inputBuffer = '';
    this.currentApiKeyType = null;
    this.showMenu();
  }

  handleKeypress(ch, key) {
    console.log(`Received key: ${ch}, key object:`, key ? key.name : 'undefined');
    
    // Handle different menu states
    switch (this.menuState) {
      case 'main':
        return this.handleMainMenu(ch);
      case 'aimodel':
        return this.handleAIModelMenu(ch);
      case 'apikeys':
        return this.handleAPIKeysMenu(ch, key);
      case 'apikey_input':
        return this.handleAPIKeyInput(ch, key);
      case 'commands':
        return this.handleCommandsMenu(ch);
      case 'viewconfig':
        console.log('View config: any key pressed, returning to main menu');
        this.menuState = 'main';
        this.showMenu();
        return true;
    }
    return true;
  }

  showMenu() {
    console.clear();
    switch (this.menuState) {
      case 'main':
        console.log('\n=== Bot Configuration Manager ===');
        console.log('1. Change Active AI Model');
        console.log('2. Modify API Keys');
        console.log('3. Toggle Commands');
        console.log('4. Show Current Configuration');
        console.log('5. Exit Configuration Mode');
        console.log('\nPress a number to select (1-5)...');
        break;
      case 'aimodel':
        console.log('\n=== Change Active AI Model ===');
        console.log('1. Gemini');
        console.log('2. OpenAI');
        console.log('3. Olama');
        console.log('\nCurrent: ' + this.config.activeAI);
        break;
      case 'apikeys':
        console.log('\n=== Modify API Keys ===');
        console.log('1. Gemini API Key');
        console.log('2. OpenAI API Key');
        console.log('\nCurrent Keys:');
        console.log('Gemini: ' + this.maskApiKey(this.config.gemini.apiKey));
        console.log('OpenAI: ' + this.maskApiKey(this.config.openai.apiKey));
        break;
      case 'commands':
        console.log('\n=== Toggle Commands ===');
        Object.entries(this.config.commands).forEach(([cmd, enabled], i) => {
          console.log(`${i + 1}. ${cmd} (${enabled ? 'Enabled' : 'Disabled'})`);
        });
        break;
      case 'viewconfig':
        console.log('\n=== Current Configuration ===');
        console.log('Active AI:', this.config.activeAI);
        console.log('\nEnabled Commands:');
        Object.entries(this.config.commands).forEach(([cmd, enabled]) => {
          console.log(`- ${cmd}: ${enabled ? 'Enabled' : 'Disabled'}`);
        });
        console.log('\nAPI Keys:');
        console.log('- Gemini:', this.maskApiKey(this.config.gemini.apiKey));
        console.log('- OpenAI:', this.maskApiKey(this.config.openai.apiKey));
        console.log('\nPress any key to go back...');
        break;
    }
  }

  handleMainMenu(ch) {
    console.log(`Main menu: pressed ${ch}`);
    switch(ch) {
      case '1':
        this.menuState = 'aimodel';
        this.showMenu();
        return true;
      case '2':
        this.menuState = 'apikeys';
        this.showMenu();
        return true;
      case '3':
        this.menuState = 'commands';
        this.showMenu();
        return true;
      case '4':
        this.menuState = 'viewconfig';
        this.showMenu();
        return true;
      case '5':
        console.log('Exiting config mode');
        return false;
      default:
        return true;
    }
  }

  handleAIModelMenu(ch) {
    switch(ch) {
      case '1':
        this.config.activeAI = 'gemini';
        this.saveConfig();
        break;
      case '2':
        this.config.activeAI = 'openai';
        this.saveConfig();
        break;
      case '3':
        this.config.activeAI = 'olama';
        this.saveConfig();
        break;
    }
    this.menuState = 'main';
    this.showMenu();
    return true;
  }

  handleAPIKeysMenu(ch, key) {
    if (ch === '1' || ch === '2') {
      console.log('\nEnter new API key:');
      this.inputBuffer = '';
      this.menuState = 'apikey_input';
      this.currentApiKeyType = ch;
      return true;
    }
    
    if (this.menuState === 'apikey_input') {
      if (key.name === 'return') {
        if (this.currentApiKeyType === '1') {
          this.config.gemini.apiKey = this.inputBuffer;
        } else {
          this.config.openai.apiKey = this.inputBuffer;
        }
        this.saveConfig();
        this.menuState = 'main';
        this.showMenu();
      } else if (key.name === 'backspace') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        process.stdout.write('\b \b');
      } else if (!key.ctrl) {
        this.inputBuffer += ch;
        process.stdout.write(ch);
      }
      return true;
    }

    this.menuState = 'main';
    this.showMenu();
    return true;
  }

  handleAPIKeyInput(ch, key) {
    if (!key) return true;
    
    if (key.name === 'return') {
      console.log('Enter pressed, saving API key');
      if (this.currentApiKeyType === '1') {
        this.config.gemini.apiKey = this.inputBuffer;
      } else {
        this.config.openai.apiKey = this.inputBuffer;
      }
      this.saveConfig();
      this.menuState = 'main';
      this.showMenu();
    } else if (key.name === 'backspace') {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
      process.stdout.write('\b \b');
    } else if (!key.ctrl && ch) {
      this.inputBuffer += ch;
      process.stdout.write(ch);
    }
    return true;
  }

  handleCommandsMenu(ch) {
    const index = parseInt(ch) - 1;
    const commands = Object.keys(this.config.commands);
    if (index >= 0 && index < commands.length) {
      const cmd = commands[index];
      this.config.commands[cmd] = !this.config.commands[cmd];
      this.saveConfig();
    }
    this.menuState = 'main';
    this.showMenu();
    return true;
  }

  maskApiKey(key) {
    if (!key) return 'Not set';
    return key.slice(0, 4) + '...' + key.slice(-4);
  }

  saveConfig() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    console.log('\nConfiguration saved successfully!');
    console.log('\nReturning to main menu...');
    setTimeout(() => {
      this.menuState = 'main';
      this.showMenu();
    }, 1000);
  }

  close() {
    this.currentHandler = null;
    this.currentResolve = null;
  }
}

module.exports = ConfigManager;
