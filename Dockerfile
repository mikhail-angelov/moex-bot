FROM node:16-slim

WORKDIR /app
COPY ./package*.json .
RUN npm ci -p
COPY ./src ./src

CMD [ "node", "src/index.js" ]