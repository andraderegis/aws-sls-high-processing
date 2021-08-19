const {
  createReadStream,
  promises: { readFile }
} = require('fs');
const { Transform, Writable, pipeline } = require('stream');
const { promisify } = require('util');
const AWS = require('aws-sdk');
const XLSXChart = require('xlsx-chart');
const csvtojson = require('csvtojson');
const { v4: uuid } = require('uuid');
const assert = require('assert');

const S3 = new AWS.S3();

const pipelineAsync = promisify(pipeline);
const chart = new XLSXChart();

const processDataStream = (salaryTypes, finalData) =>
  new Writable({
    write: (chunk, encoding, cb) => {
      const item = JSON.parse(chunk);

      // console.log('Respondent', item.Respondent);

      if (item.SalaryType === 'NA') {
        return cb();
      }

      finalData.titles.push(item.SalaryType);
      finalData.fields.push(item.Country);

      if (!salaryTypes[item.SalaryType]) {
        // first time, create object for aggregation
        /**
         * {
         *    Monthly: {},
         *    Annual: {},
         *    Weekly: {}
         * }
         */
        salaryTypes[item.SalaryType] = {};
      }

      if (!salaryTypes[item.SalaryType][item.Country]) {
        // initialize country
        /**
         * {
         *    Monthly: {
         *      Brazil: 1
         *    },
         *    Annual: {
         *      Venezuela: 1
         *    },
         *    Weekly: {
         *      UnitedStates: 1
         *    }
         * }
         */

        salaryTypes[item.SalaryType][item.Country] = 1;
        // modify instance and return void;
        return cb();
      }

      // increment each new value
      salaryTypes[item.SalaryType][item.Country] += 1;

      cb();
    }
  });

const mapStream = elaspedBytes => {
  return new Transform({
    objectMode: true,
    transform: (chunk, encoding, cb) => {
      elaspedBytes.count += chunk.length;

      const item = JSON.parse(chunk);
      const data = JSON.stringify({
        Country: item.Country,
        SalaryType: item.SalaryType,
        Respondent: item.Respondent
      });

      cb(null, data);
    }
  });
};

const generateFile = async (finalData, salaryTypes) => {
  const id = uuid();
  const opts = {
    file: `chart-${id}.xlsx`,
    chart: 'column',
    titles: [...new Set(finalData.titles)].sort(),
    fields: [...new Set(finalData.fields)].sort(),
    data: salaryTypes
  };

  const writeFileAsync = promisify(chart.writeFile.bind(chart));
  await writeFileAsync(opts);

  return {
    fileName: opts.file
  };
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const key = 1024;
  const decimalsValue = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const unities = Math.floor(Math.log(bytes) / Math.log(key));

  return parseFloat((bytes / Math.pow(key, unities)).toFixed(decimalsValue)) + '' + sizes[unities];
};

async function main() {
  console.log('starting at...', new Date().toISOString());

  const reportsFolder = process.env.BUCKET_REPORTS;
  assert.ok(reportsFolder, 'env BUCKET_REPORTS is required!');

  const surveyFile = process.env.SURVERY_FILE;
  assert.ok(surveyFile, 'env SURVERY_FILE is required!');

  const surveyFileData = JSON.parse(surveyFile);

  console.time('elapsed time');

  const elaspedBytes = { count: 0 };
  const refSalaryTypes = {};
  const refFinalData = { fields: [], titles: [] };

  console.log('downloading file on demand...');
  const fileStream = S3.getObject(surveyFileData).createReadStream();
  // const fileStream = createReadStream('../survey_results_public.csv');

  await pipelineAsync(
    fileStream,
    csvtojson(),
    mapStream(elaspedBytes),
    processDataStream(refSalaryTypes, refFinalData)
  );

  console.log('salaryType', refSalaryTypes);
  const { fileName } = await generateFile(refFinalData, refSalaryTypes);

  console.log('filename', fileName);
  console.log('elapsedBytes', formatBytes(elaspedBytes.count));
  console.timeEnd('elapsed time');

  const s3Response = await S3.putObject({
    Body: await readFile(fileName),
    Key: fileName,
    Bucket: `${surveyFileData.Bucket}/${reportsFolder}`
  }).promise();

  console.log('S3 Response:', JSON.stringify(s3Response));
  console.log('finished at...', new Date().toISOString());
}

process.env.SURVERY_FILE = JSON.stringify({
  Bucket: 'stackoverflow-surveys-ra',
  Key: 'survey_results_public.csv'
});

process.env.BUCKET_REPORTS = 'reports';

main();
