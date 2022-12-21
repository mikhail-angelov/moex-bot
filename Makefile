include .env

build:
	docker build -t ${DOCKER_IMAGE} .
deploy:
	docker push  ${DOCKER_IMAGE}
	yc serverless container revision deploy \
		--container-name moex-bot \
		--image ${DOCKER_IMAGE} \
		--execution-timeout 30s \
		--service-account-id ${SERVICE_ACCOUNT_ID}

register:
	curl -F "url=${LAMBDA_URL}" https://api.telegram.org/bot${BOT_TOKEN}/setWebhook

unregister:
	curl https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook