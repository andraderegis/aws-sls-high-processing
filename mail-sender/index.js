const {
  promises: { writeFile, unlink }
} = require('fs');
const { promisify } = require('util');

const AWS = require('aws-sdk');
const env = require('env-var');
const mailcompose = require('mailcomposer');

const environment = {
  region: env.get('REGION').required().asString(),
  ses: {
    from: env.get('SES_EMAIL_FROM').required().asString(),
    to: env.get('SES_EMAIL_TO').required().asString()
  }
};

const S3 = new AWS.S3();
const SES = new AWS.SES({
  region: environment.region
});

const handler = async event => {
  console.log('received', JSON.stringify(event, null, 2), new Date().toISOString());

  const [
    {
      s3: {
        bucket: { name },
        object: { key }
      }
    }
  ] = event.Records;

  const params = {
    Bucket: name,
    Key: key
  };

  console.log('using bucket data...', JSON.stringify(params));

  console.log('downloading file...');
  const { Body: file } = await S3.getObject(params).promise();

  console.log('saving file locally');
  const pathName = `/tmp/${new Date().getTime()}-${key.replace('/', '')}`;
  await writeFile(pathName, file);

  const mailData = {
    ...environment.ses,
    subject: 'Report Generated'
  };

  const mail = mailcompose({
    ...mailData,
    text: 'Body message. File is attached...\n\n',
    attachments: [
      {
        path: pathName
      }
    ]
  });

  const message = await promisify(mail.build.bind(mail))();
  console.log('sending email...');

  const response = await SES.sendRawEmail({
    RawMessage: {
      Data: message
    }
  }).promise();

  console.log('removing tmp file...');
  await unlink(pathName);

  console.log('done', JSON.stringify(response));

  return {
    statusCode: 200,
    body: JSON.stringify(response, null, 2)
  };
};

module.exports = {
  hello: handler
};
