FROM node:24-alpine AS builder

# Copy standalone app
COPY .next/standalone /app
# Copy public folder
COPY public /app/apps/landing-page/public
# Copy static assets
COPY .next/static /app/apps/landing-page/.next/static

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app /app

RUN addgroup -S app && adduser -S app -G app
USER app

# Port Next.js listens on
EXPOSE 3000

CMD ["node", "apps/landing-page/server.js"]