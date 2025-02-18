SRC=$(shell find . -name "*.go")
.PHONY: fmt install_deps run_dev run_test run_prod

PROD_COLLECTOR_IMAGE_NAME = data_collector
TEST_COLLECTOR_IMAGE_NAME = data_collector_test
PROD_COLLECTOR_ECR_ARN = 213288384225.dkr.ecr.us-west-1.amazonaws.com/data_collector
TEST_COLLECTOR_ECR_ARN = 213288384225.dkr.ecr.us-west-1.amazonaws.com/data_collector_test

install_deps:
	$(info ******************** downloading dependencies ********************)
	go get -v ./...

run_devserver:
	$(info ******************** running dev api server ********************)
	NEWSMUX_ENV=dev NO_AUTH=true go run ./cmd/server/main.go -service=api_server

run_prodserver:
	$(info ******************** running prod api server ********************)
	NEWSMUX_ENV=prod go run ./cmd/server/main.go -service=api_server

run_devbot:
	$(info ******************** running dev bot server ********************)
	NEWSMUX_ENV=dev go run ./cmd/bot/main.go -service=bot_server

run_prodbot:
	$(info ******************** running prod bot server ********************)
	NEWSMUX_ENV=prod go run ./cmd/bot/main.go -service=bot_server

run_prodpublisher:
	$(info ******************** running prod publisher ********************)
	NEWSMUX_ENV=prod go run ./cmd/publisher/main.go -service=feed_publisher

run_devpublisher:
	$(info ******************** running dev publisher ********************)
	NEWSMUX_ENV=dev go run ./cmd/publisher/main.go -service=feed_publisher

run_collector_lambda_locally:
	$(info ******************** running dev collector ********************)
	docker build -t $(PROD_COLLECTOR_IMAGE_NAME) --build-arg ENV_ARG=dev -f cmd/collector/Dockerfile .
	docker run --env _LAMBDA_SERVER_PORT=9000 --env AWS_LAMBDA_RUNTIME_API=localhost --env NEWSMUX_ENV=dev -p 9000:8080 $(PROD_COLLECTOR_IMAGE_NAME)

build_collector_and_push_image:
	$(info ******************** building and push collector image to ECR ********************)
	aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin $(PROD_COLLECTOR_ECR_ARN)
	docker build -t $(PROD_COLLECTOR_IMAGE_NAME) --build-arg ENV_ARG=prod -f cmd/collector/Dockerfile .
	docker tag $(PROD_COLLECTOR_IMAGE_NAME):latest $(PROD_COLLECTOR_ECR_ARN):latest
	docker push $(PROD_COLLECTOR_ECR_ARN):latest

test_build_collector_and_push_image:
	$(info ******************** building and push collector image to ECR ********************)
	aws ecr get-login-password --region us-west-1 | docker login --username AWS --password-stdin $(TEST_COLLECTOR_ECR_ARN)
	docker build -t $(TEST_COLLECTOR_IMAGE_NAME) --build-arg ENV_ARG=dev -f cmd/collector/Dockerfile .
	docker tag $(TEST_COLLECTOR_IMAGE_NAME):latest $(TEST_COLLECTOR_ECR_ARN):latest
	docker push $(TEST_COLLECTOR_ECR_ARN):latest

run_prodpanoptic:
	$(info ******************** running dev panoptic ********************)
	NEWSMUX_ENV=prod go run ./cmd/panoptic/main.go -service=panoptic

run_devpanoptic:
	$(info ******************** running dev panoptic ********************)
	NEWSMUX_ENV=dev go run ./cmd/panoptic/main.go -service=panoptic

prod_config:
	$(info ******************** printing prod config ********************)
	NEWSMUX_ENV=prod go run scripts/panoptic_config/main.go

fmt:
	$(info ******************** checking formatting ********************)
	@test -z $(shell gofmt -l $(SRC)) || (gofmt -d $(SRC); exit 1)

test:
	NEWSMUX_ENV=test go test ./...

generate:
	go generate ./...
