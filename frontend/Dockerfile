FROM oven/bun:1 AS dev

WORKDIR /app

# Install dependencies (copy lockfile for reproducible installs)
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile

# Copy source (node_modules excluded via .dockerignore)
COPY . .

EXPOSE 5173

# Vite needs host 0.0.0.0 to be reachable inside Docker
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
