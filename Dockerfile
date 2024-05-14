FROM node:lts-alpine3.18

ARG chat_key
ENV api_key_chat="$chat_key"
ARG email_key
ENV api_email_key="$email_key"
ARG ENVIRONMENT

WORKDIR /usr/src/app

RUN apk update \
    && apk add --no-cache ca-certificates \
    && apk add --no-cache bash \
    && rm -rf /var/cache/apk/*

COPY package*.json ./

RUN if [ "$ENVIRONMENT" = "dev" ]; then \
        npm install axios && \
        npm install fs; \
    else \
        npm install --only=production && \
        npm cache clean --force; \
    fi

COPY . .

EXPOSE 9000

CMD ["node", "server.js"]