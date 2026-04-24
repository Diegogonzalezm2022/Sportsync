FROM node:25-alpine3.22
LABEL authors="diego"

RUN mkdir -p /home/app

COPY . /home/app

WORKDIR /home/app

RUN npm install

EXPOSE 65500

CMD ["node", "javascript/app/httpHandler.js"]