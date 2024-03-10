<h2 align="center">
  <img height="150" alt="Typing Mind - A better UI for ChatGPT" src="https://www.typingmind.com/banner.png" />
<br/>
TypingMind Plugins Server
</h2>

[![Docker Image CI](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/docker-image.yml/badge.svg?branch=master)](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/docker-image.yml)
[![CodeQL](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/codeql.yml/badge.svg)](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/codeql.yml)
[![Build TypingMind Proxy](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/test.yml/badge.svg)](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/test.yml)

## 🌟 Introduction

TypingMind Plugins Server is a flexible and customizable server designed to empower developers to extend its functionality with tailored plugins. Build integrations, automate tasks, and enhance your experience with the power of code.

## 🔌 Enhancing Plugins with Server-Side API Calls

While TypingMind plugins are primarily designed for client-side logic, they often need to interact with external APIs that require server-side actions (e.g., authentication, complex data processing). Here's how to achieve this:

**1. Extend TypingMind Plugins Server Functionality**

- **Fork and Modify:** Fork the TypingMind Plugins Server repository and directly implement your new API endpoint within the server code. This provides the most control and flexibility.
- **Submit a Pull Request:** If your API would be generally useful to the community, consider creating a pull request to integrate it directly into the main TypingMind Plugins Server project.

**2. Call Your Extended from the Plugin**

- **Endpoint Access:** Once your API is implemented in TypingMind Plugins Server, your plugin can make standard HTTP requests to this new endpoint using client-side JavaScript libraries like `fetch` or `axios`.

**Example Scenario**

Let's say you want a plugin that fetches additional user profile data from an external CRM system:

1. You would either fork TypingMind Proxy and add an API endpoint like `/fetch-crm-data`, or submit a pull request with this feature.
2. Your plugin's client-side code would make a request to this endpoint, providing any necessary authorization tokens.
3. TypingMind Proxy's server-side code would handle the API call to the CRM, process the results, and return the data to your plugin.

**Important Considerations:**

- **Security:** Carefully manage API keys and authentication within your proxy implementation.
- **Shared Plugins:** If you create a plugin with server-side dependencies, provide clear instructions if others want to use it in their TypingMind Plugins Server instances.

## 📋 Features

- **Powerful Plugin Architecture:** Design plugins to intercept requests, modify responses, and integrate with external services.
- **Streamlined Development:** Clear guidelines and documentation for rapid plugin creation.
- **Flexible Configuration:** Manage plugin settings and behavior through intuitive configuration.
- **Robust Core:** Stable proxy foundation with essential features built-in.
- **TypeScript Support (Optional):** Improved type safety and developer experience. [If TypeScript is integral to your project]
- **Community-Driven:** Open to contributions and plugin sharing.

## 🛠️ Getting Started

### Step 1: Clone the Repository

```bash
git clone https://github.com/TypingMind/typingmind-plugins-server.git
cd typingmind-plugins-server
```

### Step 2: Environment Configuration

1. **Create `.env`:** Begin by copying the provided `.env.example` file and renaming it to `.env`.

2. **Update `.env`:** Open your new `.env` file and fill in the required environment variables according to the project's specific needs.

### Step 3: Running the Project

- **Development Mode:** To start the project in development mode, execute the following command in your terminal:

```bash
npm run dev
```

## 🚀 Deploying Your Server

The TypingMind Plugins Server can be deployed to any server that supports Node.js. Here's how to deploy it to Render, a cloud platform that makes it easy to host and scale web apps and services.

1. Create a Render Account: If you don't have one, sign up at <https://render.com>.
2. New Web Service: In your Render dashboard, create a new Web Service.
3. Connect to Repository: Connect your forked TypingMind Plugins Server repository.
4. Environment Variables: Set up any required environment variables in Render's settings for your service.
5. Deploy: Deploy your service!

## 🔗 Integration with TypingMind

Plugin Configuration: In your TypingMind plugin's code, direct API requests to the correct URL of your deployed TypingMind Plugins Server instance on Render.

## 🤝 Contributing

We welcome your contributions! Help expand TypingMind Proxy's capabilities.

- **Plugin Development:** Check out our 'CONTRIBUTING.md' guide for details on creating plugins.
- **Bug Reports & Ideas:** Open issues to report bugs or suggest new features.
- **Documentation:** Help improve our documentation for other developers.
