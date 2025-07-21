FROM node:20-alpine

WORKDIR ./app

COPY package*.json pnpm-lock.yaml ./

RUN npm install -g pnpm

RUN pnpm install

COPY . .

RUN pnpm prisma:generate

RUN pnpm build

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma:deploy && pnpm start"]