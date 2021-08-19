APP_NAME="process-stackoverflow-data"
CLUSTER_NAME="curso-serverless-ra"
PROJECT_NAME="sls-process-stackoverflow-data"
REGION="us-east-1"
LOG_GROUP_NAME="/ecs/$PROJECT_NAME"

ECS_ROLE_NAME="ECSTaskExecutionRole"
# role from AWS IAM Policies
ECS_ROLE_ARN="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"

CUSTOM_POLICY_NAME="$APP_NAME-policy"
# value from create custom policy process-stackoverflow-data-policy step
CUSTOM_POLICY_ARN="arn:aws:iam::609157373734:policy/process-stackoverflow-data-policy"

# value from create container registry step
ECR_URI_DOCKER="609157373734.dkr.ecr.us-east-1.amazonaws.com/process-stackoverflow-data"
SSM_ENV_PATH="/prod/$PROJECT_NAME"

#value from create task definitions for fargate step
TASK_DEFINTION_ARN="arn:aws:ecs:us-east-1:609157373734:task-definition/process-stackoverflow-data:1"

VPC_ID="vpc-4e038133"
SECURITY_GROUP_NAME="$PROJECT_NAME"
SECURITY_GROUP_ID="sg-038969465ccf85309"

# create ECSTaskExecutionRole role (app main policy)
aws iam create-role \
  --region $REGION \
  --role-name $ECS_ROLE_NAME \
  --assume-role-policy-document file://templates/task-execution-assume-role.json \
  | tee logs/1.iam-create-role.json

# give permissions (attach policy AmazonECSTaskExecutionRolePolicy) to execute calls on ecs role (ECSTaskExecutionRole)
aws iam attach-role-policy \
  --region $REGION \
  --role-name $ECS_ROLE_NAME \
  --policy-arn $ECS_ROLE_ARN

# permissions to create instance, access aws s3 and environment variables:
# access stackoverflow-surveys-ra bucket
# download download cvs of stackoverflow-surveys-ra
# upload xlsx report to stackoverflow-surveys-ra/reports
# read variables of Systems Manager Parameter Store (ssm)
aws iam create-policy \
  --policy-name $CUSTOM_POLICY_NAME \
  --policy-document file://templates/custom-access-policy.json \
  | tee logs/2.create-policy.json


# give permissions (attach policy process-stackoverflow-data-policy, created above) 
# to role ECSTaskExecutionRole
aws iam attach-role-policy \
  --region $REGION \
  --role-name $ECS_ROLE_NAME \
  --policy-arn $CUSTOM_POLICY_ARN

# create cluster on Elastic Container Service (ECS)
aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  | tee logs/3.create-cluster.json

# create log groups for a specific cluster
aws logs create-log-group \
  --log-group-name $LOG_GROUP_NAME \
  | tee logs/4.logs-create-log-group.json

# create container registry
aws ecr create-repository \
  --repository-name $APP_NAME \
  --image-scanning-configuration scanOnPush=true \
  --region $REGION \
  | tee logs/5.create-docker-repository.json

# create task definitions for fargate. this step defines how containter will be working and it
# configurations, as like kubernetes
aws ecs register-task-definition \
  --cli-input-json file://templates/task-definition.json \
  | tee logs/6.register-task.json

# list all task definitions
aws ecs list-task-definitions \
  | tee logs/7.list-tasks-definitions.json

# security
aws ec2 describe-vpcs \
  | tee logs/8.describe-vpcs.json

# this value came from above comand for describe vpcs
VPC_ID="vpc-4e038133"
aws ec2 describe-subnets \
  --filters="Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" \
  | tee logs/9.describe-subnets.json

aws ec2 create-security-group \
  --group-name $SECURITY_GROUP_NAME \
  --description "grupo de acesso em ecs tasks" \
  | tee logs/10.create-security-group.json

# this value came from create security group.
SECURITY_GROUP_ID="sg-038969465ccf85309"

CURRENT_PUBLIC_IP=$(curl ipecho.net/plain; echo "/32")

aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp \
  --port 80 \
  --cidr $CURRENT_PUBLIC_IP \
  --region $REGION \
  | tee logs/11.authorize-sec-group.json

# CLEAN UP ALL RESOURCES

# listing task definitions
TASKS=$(aws ecs list-task-definitions --query "taskDefinitionArns[*]" | jq -r '.[]')

# removing task definitions
for i in $(printf '%s\n' "${TASKS[@]}"); do
  echo 'desregistering' $i
  aws ecs deregister-task-definition \
    --task-definition $i
done

# removing log group
aws logs delete-log-group \
  --log-group-name $LOG_GROUP_NAME

# removing cluster
aws ecs delete-cluster \
  --cluster $CLUSTER_NAME

# removing security group
aws ec2 delete-security-group \
  --group-name $SECURITY_GROUP_NAME

# removing ecr
aws ecr delete-repository \
  --repository-name $APP_NAME --force

# detaching policy
aws iam detach-role-policy \
  --region $REGION \
  --role-name $ECS_ROLE_NAME \
  --policy-arn $CUSTOM_POLICY_ARN

# removing policy
aws iam \
  --region $REGION \
  delete-policy \
  --policy-arn $CUSTOM_POLICY_ARN

# removing role
aws iam delete-role \
  --region $REGION \
  --role-name $ECS_ROLE_NAME

# removing environment variables
aws ssm delete-parameters \
  --names `aws ssm get-parameters-by-path --path "$SSM_ENV_PATH" --query "Parameters[*].Name" --output text --max-items 9`

# removing bucket (before remove serverless project, this step is mandatory)
aws s3 rm s3://stackoverflow-surveys-ra --recursive

