# MOEX bot

This is a simple telegram bot, which takes data form Moscow Exchange service and returns 20 most liquid bonds

I stole the main idea, and code from this app [https://github.com/empenoso/SilverFir-Investment-Report](https://github.com/empenoso/SilverFir-Investment-Report)
and wrapped it with Telegram bot

## Demo
you can check it with this deployed bot [@moex-bot](https://t.me/MoexTopBondsBot)
> no obligations, it can stop working any time

## Tech info

it's [nodejs](https://nodejs.org) app leverage by [express](https://expressjs.com) and [axios](https://github.com/axios/axios)
data source is [MOEX api](https://iss.moex.com/iss/reference/)

### test
`npm test`

### build
`make build`

### deployment 
to deploy to [Yandex Serverless Containers](https://cloud.yandex.ru/)
create serverless container and fill in `.env` file
```
BOT_TOKEN=<TELEGRAM BOT TOKEN>
LAMBDA_URL=<PUBLIC URL OF YOUR SERVERLESS FUNCTION>
DOCKER_IMAGE=<DOCKER IMAGE IN YANDEX CLOUD REGISTRY>
SERVICE_ACCOUNT_ID=<YANDEX CLOUD SERVICE ACCOUNT ID WITH PERMISSIONS TO DEPLOY THIS SERVERLESS CONTAINER>
```
to build:  `make build`

to deploy: `make deploy`



---

## License
MIT