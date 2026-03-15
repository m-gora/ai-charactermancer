FROM oven/bun:1 AS dev

WORKDIR /app

# Install dependencies (copy lockfile for reproducible installs)
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile

# Copy source (node_modules excluded via .dockerignore)
COPY . .

EXPOSE 5173

# Re-run install at startup so the node_modules volume is always in sync with
# the lockfile even when new packages were added without removing the volume.
CMD ["sh", "-c", "bun install && bun run dev --host 0.0.0.0"]
