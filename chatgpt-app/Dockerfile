# Build from the repository root: docker build -f chatgpt-app/Dockerfile .
FROM node:22-alpine AS build

WORKDIR /app/chatgpt-app

# Install only this package's dependency graph, independent of the website app.
COPY chatgpt-app/package.json chatgpt-app/package-lock.json ./
RUN npm ci

COPY chatgpt-app/ ./
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV HOST=0.0.0.0
WORKDIR /app/chatgpt-app

# The server bundle contains its Node dependencies; these are the runtime assets
# it reads from disk when serving the MCP UI resource.
COPY --from=build /app/chatgpt-app/dist ./dist
COPY --from=build /app/chatgpt-app/web/widget.html ./web/widget.html
COPY --from=build /app/chatgpt-app/web/dist/widget.txt ./web/dist/widget.txt
COPY --from=build /app/chatgpt-app/web/dist/widget.css ./web/dist/widget.css

EXPOSE 8787
CMD ["node", "dist/server.js"]
