FROM node:slim

ARG chat_key
ENV api_key_chat="$chat_key"
ARG ENVIRONMENT
WORKDIR /usr/src/app
RUN /bin/sh apt update
RUN /bin/sh apt install ca-certificates && /bin/sh apt autoremove
COPY package*.json .
# RUN npm install axios && npm ci --only=production
RUN if [ "$ENVIRONMENT" = "dev" ]; then npm install axios && npm install fs; else npm install --only=production; fi
COPY . .

CMD ["node", "server.js"]