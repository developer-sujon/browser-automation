# Use official Playwright image to ensure all browser dependencies are present
# We pin the version to match package.json to avoid re-downloading browsers
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# Install Bun
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
# We skip browser download because they are already in the base image
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Set default port for Cloud Run
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["bun", "start"]
