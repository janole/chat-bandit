FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Only copy necessary files
COPY .next/standalone /app
COPY public /app/apps/landing-page/public
COPY .next/static /app/apps/landing-page/.next/static

# Port Next.js listens on
EXPOSE 3000

CMD ["node", "apps/landing-page/server.js"]