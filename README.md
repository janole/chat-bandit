# Welcome to Chat Bandit

**Chat Bandit** is an open-source, privacy-focused desktop AI assistant supporting both local and cloud AI models. It integrates local LLMs such as Ollama and llama.cpp and connects to cloud providers like OpenAI, Google AI, and OpenRouter, offering a seamless and customizable AI chatbot experience.

![Screenshot of the main interface of Chat Bandit running on a MacBook Pro](https://chatbandit.de/screenshot-light.png)

---

## Repository Structure

- **[`apps`](./apps)**
  - [`electron`](./apps/electron): Desktop Electron app with React-based UI.
  - [`landing-page`](./apps/landing-page): Next.js based landing page for the project.
- **[packages](./packages)**
  - [`ai-core`](./packages/ai-core): Core AI logic and types.
  - [`ai-chat`](./packages/ai-chat): React components and hooks for chat UI.
  - [`ai-electron`](./packages/ai-electron): Electron IPC and backend integration.
  - [`basic-app`](./packages/basic-app): UI primitives and layout components.
  - [`try-catch`](./packages/try-catch): Utility for error handling.

---

## Features (in progress)

- Cross-platform Electron desktop app with smooth UI.
- Support for local AI models (llama.cpp, Ollama).
- Integration with cloud AI providers (OpenAI, Google AI, OpenRouter).
- Model management UI and download handling.
- Rich markdown chat interface with image support.
- Privacy-first design: all data stored locally.
- Auto-updates and multi-window support.

---

## Getting Started

### Electron App
```bash
cd apps/electron
npm install
npm run dev
```

### Landing Page
```bash
cd apps/landing-page
npm install
npm run dev
```

---

## Notes

- This project is a **work in progress**.
- APIs, UI, and features may change frequently.
- Contributions and feedback are welcome!

---

## License

This project is open-source and licensed under the MIT License.

---

Created and maintained by Jan Ole Suhr | [https://janole.com](https://janole.com) | info@chatbandit.de