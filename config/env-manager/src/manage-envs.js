const AWS = require('aws-sdk');

const { AWS_VARIABLES, SSM_PREFIX } = require('./env');

const SSM = new AWS.SSM({
  region: AWS_VARIABLES.REGION.value
});

const sleep = miliseconds => {
  return new Promise(resolve => {
    setTimeout(resolve, miliseconds);
  });
};

(async () => {
  const promises = [];

  for (const [key, data] of Object.entries(AWS_VARIABLES)) {
    const { value, type } = data;

    if (!value) {
      continue;
    }

    console.log('Scheduling insertion');

    const result = SSM.putParameter({
      Overwrite: true,
      Name: `${SSM_PREFIX}/${key}`,
      Type: type,
      Value: value
    }).promise();

    promises.push(result);

    // avoiding DOS during put parameters on AWS SSM
    await sleep(500);
  }

  const awsSSMParameters = await Promise.all(promises);

  console.log('AWS SSM Parameters', awsSSMParameters);
})();
