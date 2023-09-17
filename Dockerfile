FROM node:alpine
# Set environment variables
ENV api_key_chat=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
# Set the working directory
WORKDIR /usr/src/app
ARG ENVIRONMENT
# RUN apt-get update

# RUN apt-get install ca-certificates

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