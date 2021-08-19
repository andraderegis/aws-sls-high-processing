SSM_PREFIX="/prod/sls-process-stackoverflow-data"

DOCKER_IMAGE_URL=$(aws ssm get-parameter \
  --name "$SSM_PREFIX/ECS_PROCESS_DATA_IMAGE_URL" \
  --query "Parameter.Value" | jq -r)

AWS_REGION=$(aws ssm get-parameter \
  --name "$SSM_PREFIX/REGION" \
  --query "Parameter.Value" | jq -r)

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" | jq -r)

docker build -t $DOCKER_IMAGE_URL .

docker run \
  -v ~/.aws/:/root/.aws \
  -e SURVEY_FILE='{"Bucket":"stackoverflow-surveys-ra","Key":"survey_results_public.csv"}' \
  -e AWS_ENV_PATH="$SSM_PREFIX" \
  -e AWS_REGION="$AWS_REGION" \
  -t $DOCKER_IMAGE_URL

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker push $DOCKER_IMAGE_URL
