FROM node:alpine

ARG chat_key
ENV api_key_chat="$chat_key"
ARG ENVIRONMENT
WORKDIR /usr/src/app
RUN apt update
RUN apt install -y ca-certificates && apt autoremove -y
COPY package*.json .
# RUN npm install axios && npm ci --only=production
RUN if [ "$ENVIRONMENT" = "dev" ]; then npm install axios && npm install fs; else npm install --only=production; fi
COPY . .

CMD ["node", "server.js"]