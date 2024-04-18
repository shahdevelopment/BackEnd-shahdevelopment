FROM alpine:3.18
# Set environment variables
ARG chat_key
ENV api_key_chat="$chat_key"
# Set the working directory
WORKDIR /usr/src/app
ARG ENVIRONMENT
# Install deps
RUN apk update && \
    apk upgrade && \
    apk add --no-cache bash git openssh

# Create Certificate
RUN apk add --no-cache ca-certificates && \
    apk del --no-cache .build-deps

COPY package*.json .
# RUN npm install
# If you are building your code for production
RUN npm install axios && npm ci --only=production
RUN if [ "$ENVIRONMENT" = "dev" ]; then npm install axios && npm install fs; else npm install --only=production; fi
EXPOSE 9000

# USER node
# ADD requirements.txt ./
COPY . .

CMD ["node", "server.js"]