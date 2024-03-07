# TypingMind Proxy

[![Docker Image CI](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/docker-image.yml/badge.svg?branch=master)](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/docker-image.yml)
[![CodeQL](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/codeql.yml/badge.svg)](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/codeql.yml)
[![Build TypingMind Proxy](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/test.yml/badge.svg)](https://github.com/travis-thuanle/typingmind-proxy/actions/workflows/test.yml)

## 🌟 Introduction

TypingMind Proxy is a flexible and customizable proxy server designed to empower developers to extend its functionality with tailored plugins. Build integrations, automate tasks, and enhance your proxy experience with the power of code.

## 🔌 Enhancing Plugins with Server-Side API Calls

While TypingMind Proxy plugins are primarily designed for client-side logic, they often need to interact with external APIs that require server-side actions (e.g., authentication, complex data processing). Here's how to achieve this:

**1. Extend TypingMind Proxy Functionality**

- **Fork and Modify:** Fork the TypingMind Proxy repository and directly implement your new API proxy endpoint within the server code. This provides the most control and flexibility.
- **Submit a Pull Request:** If your API proxy would be generally useful to the community, consider creating a pull request to integrate it directly into the main TypingMind Proxy project.

**2. Call Your Extended Proxy from the Plugin**

- **Endpoint Access:** Once your API proxy is implemented in TypingMind Proxy, your plugin can make standard HTTP requests to this new endpoint using client-side JavaScript libraries like `fetch` or `axios`.

**Example Scenario**

Let's say you want a plugin that fetches additional user profile data from an external CRM system:

1. You would either fork TypingMind Proxy and add an API endpoint like `/fetch-crm-data`, or submit a pull request with this feature.
2. Your plugin's client-side code would make a request to this endpoint, providing any necessary authorization tokens.
3. TypingMind Proxy's server-side code would handle the API call to the CRM, process the results, and return the data to your plugin.

**Important Considerations:**

- **Security:** Carefully manage API keys and authentication within your proxy implementation.
- **Shared Plugins:** If you create a plugin with server-side dependencies, provide clear instructions if others want to use it in their TypingMind Proxy instances.

## 🚀 Features

- **Powerful Plugin Architecture:** Design plugins to intercept requests, modify responses, and integrate with external services.
- **Streamlined Development:** Clear guidelines and documentation for rapid plugin creation.
- **Flexible Configuration:** Manage plugin settings and behavior through intuitive configuration.
- **Robust Core:** Stable proxy foundation with essential features built-in.
- **TypeScript Support (Optional):** Improved type safety and developer experience. [If TypeScript is integral to your project]
- **Community-Driven:** Open to contributions and plugin sharing.

## 🛠️ Getting Started

### Step 1: Clone the Repository

```bash
git clone https://github.com/travis-thuanle/typingmind-proxy.git
cd typingmind-proxy
```

### Step 2: Environment Configuration

1. **Create `.env`:** Begin by copying the provided `.env.example` file and renaming it to `.env`.

2. **Update `.env`:** Open your new `.env` file and fill in the required environment variables according to the project's specific needs.

### Step 3: Running the Project

- **Development Mode:** To start the project in development mode, execute the following command in your terminal:

```bash
npm run dev
```

## 🤝 Contributing

We welcome your contributions! Help expand TypingMind Proxy's capabilities.

- **Plugin Development:** Check out our 'CONTRIBUTING.md' guide for details on creating plugins.
- **Bug Reports & Ideas:** Open issues to report bugs or suggest new features.
- **Documentation:** Help improve our documentation for other developers.
