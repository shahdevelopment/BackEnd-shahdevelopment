FROM node:latest
# Set environment variables
ENV api_key_chat=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
# Set the working directory
WORKDIR /usr/src/app

RUN apt-get update

RUN apt-get install ca-certificates

COPY package*.json .
# RUN npm install
# If you are building your code for production
RUN RUN npm ci --only=production

EXPOSE 9000

USER node
# ADD requirements.txt ./
COPY . .

CMD ["node", "server.js"]