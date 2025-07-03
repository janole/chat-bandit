# Chat Bandit Landing Page

This is the **official landing page** for [Chat Bandit](https://chatbandit.de), built with [Next.js](https://nextjs.org). It showcases the features, downloads, and information about the Chat Bandit desktop AI assistant.

![Screenshot of the landing page / download page of Chat Bandit](https://chatbandit.de/screenshot-landing-page-light.png)

---

## Quick Start

To run the landing page locally for development:

```bash
cd apps/landing-page
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the site.

---

## Build & Deployment

The landing page can be deployed using Docker:

```bash
$ npm run docker:push
```

You can run the docker container locally with

```bash
$ npm run docker:test

...

> landing-page@0.0.1 docker:test
> docker run --rm -p 3000:3000 $(npm run --silent docker:image)

   ▲ Next.js 15.3.4
   - Local:        http://6c44ce9ede70:3000
   - Network:      http://6c44ce9ede70:3000

 ✓ Starting...
```

Connect to http://localhost:3000 to check out the landing page website.

---

## Project Structure

- `app/` - Next.js app directory with pages, layouts, and components.
- `components/` - Reusable UI components including badges, cards, hero sections, and more.
- `public/` - Static assets like icons, screenshots, and downloads.
- `styles/` - Global CSS with Tailwind and custom styles.
- `next.config.ts` - Next.js configuration.

---

Created and maintained by Jan Ole Suhr | [https://janole.com](https://janole.com) | info@chatbandit.de