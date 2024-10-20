FROM node:lts-alpine3.18

ARG chat_key
ENV api_key_chat="$chat_key"
ARG email_key
ENV api_email_key="$email_key"
ARG pg_user
ENV POSTGRES_USER="$pg_user"
ARG pg_pass
ENV POSTGRES_PASSWORD="$pg_pass"
ARG pg_db
ENV POSTGRES_DB="$pg_db"
ARG pg_host
ENV DB_HOST="$pg_host"
ARG jwt_secret
ENV JWT_SECRET="$jwt_secret"
ARG admin_email
ENV ADMIN_EMAIL="$admin_email"
ARG front_url
ENV FRONT_URL="$front_url"

ARG ENVIRONMENT



WORKDIR /usr/src/app

RUN apk update \
    && apk add --no-cache ca-certificates \
    && apk add --no-cache bash \
    && apk add --no-cache curl \
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