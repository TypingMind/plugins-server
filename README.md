<h2 align="center">
  <img height="150" alt="Typing Mind - A better UI for ChatGPT" src="https://www.typingmind.com/banner.png" />
<br/>
Plugins Server
</h2>

[![Docker Image CI](https://github.com/TypingMind/plugins-server/actions/workflows/docker-image.yml/badge.svg?branch=main)](https://github.com/TypingMind/plugins-server/actions/workflows/docker-image.yml)
[![CodeQL](https://github.com/TypingMind/plugins-server/actions/workflows/codeql.yml/badge.svg)](https://github.com/TypingMind/plugins-server/actions/workflows/codeql.yml)
[![Build TypingMind Proxy](https://github.com/TypingMind/plugins-server/actions/workflows/test.yml/badge.svg)](https://github.com/TypingMind/plugins-server/actions/workflows/test.yml)

## 🌟 Introduction

Plugins Server provides additional features for [TypingMind's Plugins](https://docs.typingmind.com/plugins) where extra server-side processing is needed.

Plugins Server is used by some built-in plugins on Typing Mind (e.g., Web Page Reader). Other plugins can also make use of the existing endpoints of the Plugins Server if needed. New endpoints can be added via Pull Requests.

Plugins Server is open-sourced and is intended to be self-hosted by individual users for private use only.

## 🔌 How to use (for Typing Mind users)

Two simple steps:

1. Deploy this repo on any hosting provider that supports NodeJS (e.g., Render.com, AWS, etc.). (We also provide a Dockerfile for easy deployment on Docker-supported hosting providers)
2. Use the server endpoint URL in your Settings page of Typing Mind's plugins.

Follow this guide for detailed instructions: [How to Deploy Plugins Server on Render.com](https://docs.typingmind.com/plugins/plugins-server/how-to-deploy-plugins-server-on-render)

## List of available endpoints

After deploying, visit your Plugins Server URL to see the list of available endpoints (served in Swagger UI).

## 🛠️ Development (for Typing Mind plugins developers)

- **Development Mode:** To start the project in development mode, execute the following command in your terminal:

```bash
npm install
npm run dev
```

## To take advantage of the YouTube Transcript endpoint, create a plugin with the follosing config:

```
{
    "id": "youtube_transcript",
    "code": "async function fetchPageContent(url, pluginServer) {\n  const response = await fetch(\n    `${pluginServer}/youtube-transcript?query=${encodeURIComponent(url)}`\n  );\n\n  if (!response.ok) {\n    throw new Error(\n      `Failed to fetch web content: ${response.status} - ${response.statusText}`\n    );\n  }\n\n  const data = await response.json();\n  return data.responseObject;\n}\n\nasync function youtube_transcript(params, userSettings) {\n  const { url } = params;\n  const { pluginServer } = userSettings;\n\n  if (!pluginServer) {\n    throw new Error(\n      'Missing plugin server URL. Please set it in the plugin settings.'\n    );\n  }\n\n  const cleanPluginServer = pluginServer.replace(/\\/$/, '');\n\n  try {\n    const response = await fetchPageContent(url, cleanPluginServer);\n    return response.textOnly;\n  } catch (error) {\n    console.error('Error summarizing webpage:', error);\n    return 'Error: Unable to generate a summary. Please try again later.';\n  }\n}",
    "uuid": "71defcd9-3f9d-4f29-b968-568eea74b41d",
    "emoji": "🧩",
    "title": "YouTube Transcript",
    "iconURL": "data:image/png;base64,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",
    "openaiSpec": {
        "name": "youtube_transcript",
        "parameters": {
            "type": "object",
            "required": [
                "url"
            ],
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL of the youtube video whose transcript we should fetch"
                }
            }
        },
        "description": "Fetch a transcript for the youtube video with a given URL."
    },
    "outputType": "respond_to_ai",
    "oauthConfig": null,
    "userSettings": [
        {
            "name": "pluginServer",
            "label": "Plugin Server",
            "required": true,
            "description": "The URL of the plugin server",
            "placeholder": "https://..."
        }
    ],
    "overviewMarkdown": "## YouTube Transcript\n\nFetch transcript for youtube videos using typingmind plugins server. https://github.com/TypingMind/plugins-server",
    "authenticationType": "AUTH_TYPE_NONE",
    "implementationType": "javascript"
}
```

## 🤝 Contributing

We welcome your contributions! Help expand TypingMind Plugins Server's capabilities.

- **Plugin Development:** Check out our 'CONTRIBUTING.md' guide for details on creating plugins.
- **Bug Reports & Ideas:** Open issues to report bugs or suggest new features.
- **Documentation:** Help improve our documentation for other developers.
