# API Documentation

This document provides information on how the OpenAI, Gemini, and Olama APIs are used in the RadjaShiqnals-WhatsappBot project.

## OpenAI

The OpenAI API is used to query the OpenAI models for generating responses to user queries.

### Configuration

- **URL**: `https://api.openai.com/v1/chat/completions`
- **API Key**: You need to provide your OpenAI API key in the `config.json` file.
- **Model**: Specify the model to use (e.g., `gpt-4o-mini`).

### Example Payload

```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "user", "content": "<your-query>" }],
  "temperature": 0.7,
  "stream": false
}
```

### Usage

The bot sends a POST request to the OpenAI API with the user's query and receives a response from the AI model.

## Gemini

The Gemini API is used to query the Gemini models for generating responses to user queries.

### Configuration

- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=<your-api-key>`

### Example Payload

```json
{
  "contents": [
    {
      "parts": [{ "text": "<your-query>" }]
    }
  ]
}
```

### Usage

The bot sends a POST request to the Gemini API with the user's query and receives a response from the AI model.

## Olama

The Olama API is used to query the Olama models for generating responses to user queries.

### Configuration

- **URL**: `http://localhost:11434/api/generate`
- **Model**: Specify the model to use (e.g., `llama3.2`).

### Example Payload

```json
{
  "model": "llama3.2",
  "prompt": "<your-query>",
  "stream": false
}
```

### Usage

The bot sends a POST request to the Olama API with the user's query and receives a response from the AI model.
