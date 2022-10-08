FROM node:16-alpine

RUN apk add python3 alpine-sdk \
    pixman-dev cairo-dev pango-dev

COPY . /usr/share/diy-discord-bot

WORKDIR /usr/share/diy-discord-bot

RUN npm ci

CMD node src/index.js
