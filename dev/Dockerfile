FROM node
# Set environment variables
ARG chat_key
ENV api_key_chat="$chat_key"
# Set the working directory
WORKDIR /usr/src/app
ARG ENVIRONMENT
RUN apt-get update

ARG postgresPass
ENV POSTGRES_PASSWORD="$postgresPass"

ARG postgresUser
ENV POSTGRES_USER="$postgresUser"

ARG postgresDb
ENV POSTGRES_DB="$postgresDb"

ARG postgresHost
ENV POSTGRES_HOST="$postgresHost"

ARG rabbitmqUser
ENV RABBITMQ_DEFAULT_USER="$rabbitmqUser"

ARG rabbitmqPass
ENV RABBITMQ_DEFAULT_PASS="$rabbitmqPass"

ARG RABBIT_MQ_HOST
ENV RABBIT_MQ_HOST="$rabbitmq_host"



RUN apt-get install ca-certificates && apt autoremove

COPY package*.json .
# RUN npm install
# If you are building your code for production
RUN npm install axios && npm ci --only=production
RUN if [ "$ENVIRONMENT" = "dev" ]; then npm install axios && npm install fs; else npm install --only=production; fi
EXPOSE 9000

# USER node
# ADD requirements.txt ./
COPY . .

CMD ["npm", "start"]