FROM node:18.20.5
WORKDIR /app

COPY ./deploy/docker-entrypoint.sh .

COPY ./package*.json .
RUN npm install --production

RUN mkdir -p ./databases
COPY ./databases/default.db ./databases/

COPY server.js ./
COPY client ./


ENTRYPOINT ["./docker-entrypoint.sh"]
