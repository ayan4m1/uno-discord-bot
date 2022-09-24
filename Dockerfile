FROM node:16-alpine

COPY . /usr/share/diy-discord-bot

WORKDIR /usr/share/diy-discord-bot

RUN apk add python3 alpine-sdk \
    pixman-dev cairo-dev pango-dev

RUN npm ci

CMD node src/index.js
