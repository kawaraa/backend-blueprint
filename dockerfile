# FROM node:22
FROM node:lts-alpine

WORKDIR /

COPY . .

RUN npm install --omit=dev

EXPOSE 3001

CMD ["npm", "start"]

