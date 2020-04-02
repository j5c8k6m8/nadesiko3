FROM node:13-alpine
WORKDIR /app

RUN apk add --update --no-cache p7zip
RUN apk add --update --no-cache xdotool

RUN npm -g install nadesiko3

ENV NAKO_HOME /usr/local/lib/node_modules/nadesiko3
