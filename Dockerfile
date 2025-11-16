# Apify Actor Dockerfile
FROM apify/actor-node-playwright-chrome:20

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --include=optional --no-audit --no-fund

# Install Playwright dependencies
RUN npx playwright install chrome
RUN npx playwright install-deps chrome

# Copy source code
COPY . ./

# Start the actor
CMD npm start
