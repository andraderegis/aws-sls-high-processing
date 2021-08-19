const SSM_PREFIX = '/prod/sls-process-stackoverflow-data';

const AWS_VARIABLES = {
  ECS_TASK_DEFINITION: {
    value: 'process-stackoverflow-data:3',
    type: 'String'
  },
  ECS_CLUSTER_NAME: {
    value: 'curso-serverless-ra',
    type: 'String'
  },
  ECS_TASK_LAUNCH_TYPE: {
    value: 'FARGATE',
    type: 'String'
  },
  ECS_TASK_COUNT: {
    value: '1',
    type: 'String'
  },
  ECS_TASK_PLATAFORM_VERSION: {
    value: 'LATEST',
    type: 'String'
  },
  ECS_TASK_CONTAINER_NAME: {
    value: 'process-stackoverflow-data',
    type: 'String'
  },
  ECS_TASK_CONTAINER_FILE_ENV_NAME: {
    value: 'SURVEY_FILE',
    type: 'String'
  },
  ECS_TASK_SUBNETS: {
    value: [
      'subnet-917ffaa0',
      'subnet-61301b6f',
      'subnet-585f2379',
      'subnet-820f7ee4',
      'subnet-856061c8',
      'subnet-6a265435'
    ].join(','),
    type: 'StringList'
  },
  ECS_TASK_SECURITY_GROUPS: {
    value: ['sg-038969465ccf85309'].join(','),
    type: 'StringList'
  },
  ECS_TASK_ASSIGN_PUBLIC_IP: {
    value: 'ENABLED',
    type: 'String'
  },
  ECS_PROCESS_DATA_IMAGE_URL: {
    value: '609157373734.dkr.ecr.us-east-1.amazonaws.com/process-stackoverflow-data',
    type: 'String'
  },
  BUCKET_REPORTS: {
    value: 'reports',
    type: 'String'
  },
  BUCKET_SURVEYS: {
    value: 'stackoverflow-surveys-ra',
    type: 'String'
  },
  LOG_GROUP_NAME: {
    value: '/ecs/sls-process-stackoverflow-data',
    type: 'String'
  },
  REGION: {
    value: 'us-east-1',
    type: 'String'
  },
  SSM_PREFIX: {
    value: SSM_PREFIX,
    type: 'String'
  }
};

module.exports = {
  AWS_VARIABLES,
  SSM_PREFIX
};
