AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="609157373734"
DOCKER_IMAGE_URL="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/process-stackoverflow-data"

docker build -t $DOCKER_IMAGE_URL .

docker run $DOCKER_IMAGE_URL

aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker push $DOCKER_IMAGE_URL