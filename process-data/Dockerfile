FROM node:12-alpine

RUN apk update && apk upgrade && \
  apk add --no-cache openssl ca-certificates

RUN wget https://github.com/Droplr/aws-env/raw/master/bin/aws-env-linux-amd64 -O /bin/aws-env && \
  chmod +x /bin/aws-env

ADD . .

RUN yarn install --frozen-lockfile --production=true --silent

CMD eval $(aws-env) && node index.js
