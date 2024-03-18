<h2 align="center">
  <img height="150" alt="Typing Mind - A better UI for ChatGPT" src="https://www.typingmind.com/banner.png" />
<br/>
Plugins Server
</h2>

[![Docker Image CI](https://github.com/TypingMind/plugins-server/actions/workflows/docker-image.yml/badge.svg?branch=main)](https://github.com/TypingMind/plugins-server/actions/workflows/docker-image.yml)
[![CodeQL](https://github.com/TypingMind/plugins-server/actions/workflows/codeql.yml/badge.svg)](https://github.com/TypingMind/plugins-server/actions/workflows/codeql.yml)
[![Build TypingMind Proxy](https://github.com/TypingMind/plugins-server/actions/workflows/test.yml/badge.svg)](https://github.com/TypingMind/plugins-server/actions/workflows/test.yml)

## 🌟 Introduction

Plugins Server provides a proxy server for [Typing Mind's Plugins](https://docs.typingmind.com/plugins). A proxy server is needed for complex use cases where a server is required for processing data that cannot be done from the client side in Typing Mind.

Plugins Server is used by some built-in plugins on Typing Mind (e.g., Web Page Reader). Other plugins can also make use of the existing endpoints of the Plugins Server if needed. New endpoints can be added via Pull Requests.

Plugins Server is open-sourced and is intended to be self-hosted by individual users for private use only.

## 🔌 How to use (for Typing Mind users)

Two simple steps:

1. Deploy this repo on any hosting provider that supports NodeJS (e.g., Render.com, AWS, etc.). (We also provide a Dockerfile for easy deployment on Docker-supported hosting providers)
2. Use the server endpoint URL in your Settings page of Typing Mind's plugins.

Follow this guide for detailed instructions: [How to Deploy Plugins Server on Render.com](https://docs.typingmind.com/plugins/plugins-server/how-to-deploy-plugins-server-on-render)

## List of available endpoints

After deploying, visit your Plugins Server URL to see the list of available endpoints (served in Swagger UI).

Here are the latest endpoints from our public servers: https://plugins.typingmind.com/ (**Note**: this public server only hosts the API documentation. You cannot use this Public Server as your proxy. You must deploy your own Plugins Server to use all the available endpoints).

## 🛠️ Development (for Typing Mind plugins developers)

- **Development Mode:** To start the project in development mode, execute the following command in your terminal:

```bash
npm install
npm run dev
```

## 🤝 Contributing

We welcome your contributions! Help expand TypingMind Plugins Server's capabilities.

- **Plugin Development:** Check out our 'CONTRIBUTING.md' guide for details on creating plugins.
- **Bug Reports & Ideas:** Open issues to report bugs or suggest new features.
- **Documentation:** Help improve our documentation for other developers.
