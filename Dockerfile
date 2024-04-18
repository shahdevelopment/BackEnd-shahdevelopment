# FROM node
FROM node:lts-alpine3.18

ARG chat_key
ARG ENVIRONMENT
ENV api_key_chat="$chat_key"
WORKDIR /usr/src/app
RUN /bin/sh -c apk update
RUN /bin/sh -c apk add ca-certificates && /bin/sh -c apk del .build-deps
# RUN apt update
# RUN apt install ca-certificates && apt autoremove
COPY package*.json .
# RUN npm install axios && npm ci --only=production
RUN if [ "$ENVIRONMENT" = "dev" ]; then npm install axios && npm install fs; else npm install --only=production; fi
COPY . .

CMD ["node", "server.js"]