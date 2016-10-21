var Q = require('q');
var path = require('path');

var execute = require('lambduh-execute');
var validate = require('lambduh-validate');
var s3Download = require('lambduh-get-s3-object');
var upload = require('lambduh-put-s3-object');
var downloadFile = require('lambduh-download-file');

var WAV_FOLDER = '/tmp/wav/'
var MP3_FOLDER = '/tmp/mp3/'

process.env['PATH'] = process.env['PATH'] + ':/tmp/:' + process.env['LAMBDA_TASK_ROOT']

exports.handler = function(event, context) {
  validate(event, {
    "srcUrl": true,
    "dstBucket": true,
    "dstKey": true
  })

  //create /tmp/pngs/
  .then(function(event) {
    return execute(event, {
      shell: 'mkdir -p '+MP3_FOLDER+'; mkdir -p '+WAV_FOLDER+';',
      logOutput: true
    })
    return execute(event, {
      shell: 'ls',
      logOutput: true
    })
  })

  //download mp3
  .then(function(event) {
    event.filepath = MP3_FOLDER + path.basename(event.srcUrl);
    event.filename = path.basename(event.srcUrl).split('.')[0]+'.wav';
    event.url = event.srcUrl;
    return downloadFile(event);
  })

  //rename, mv png

  //convert pngs to mp4
  .then(function(event) {
    return execute(event, {
      bashScript: 'bin/mp3-to-wav',
      bashParams: [
        MP3_FOLDER+path.basename(event.srcUrl),//input files
        WAV_FOLDER+event.filename//output filename
      ],
      logOutput: true
    })
  })

  //upload mp4
  .then(function(event) {
    return upload(event, {
      dstBucket: event.dstBucket,
      dstKey: event.dstKey,
      uploadFilepath: WAV_FOLDER+event.filename
    })
  })

  //clean up
  .then(function(event) {
    return execute(event, {
      shell: 'rm -f '+WAV_FOLDER+'*; rm -f '+MP3_FOLDER+'*;'
    })
  })

  .then(function(event){
    console.log('finished');
    console.log(event);
    context.done()

  }).fail(function(err) {
    console.log(err);
    context.done(null, err);
  });

}
