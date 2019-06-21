process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1'

const fs = require('fs-extra')
const tar = require('tar')
const childProcess = require('child_process')
const awsSdk = require('aws-sdk')

exports.handler = async (event, context) => {
  console.time('total')
  const downloadedFilePath = await this.download()
  const unzippedPath = await this.extract(downloadedFilePath)
  const stdout = await this.execute(unzippedPath)
  console.timeEnd('total')
  return this.response(stdout)
}

exports.download = async () => {
  console.time('download')
  const s3 = new awsSdk.S3()
  const response = await s3
    .getObject({
      Bucket: 'zipperless',
      Key: 'zipper.tar.gz'
    })
    .promise()

  const zippedFilePath = '/tmp/zipper.zip'
  await fs.writeFile(zippedFilePath, response.Body)

  console.timeEnd('download')
  return zippedFilePath
}

exports.extract = async zippedFilePath => {
  console.time('extract')

  const unzippedPath = '/tmp/zippered'
  await fs.mkdirp(unzippedPath)

  await tar.x({
    file: zippedFilePath,
    cwd: unzippedPath
  })

  console.timeEnd('extract')
  return unzippedPath
}

exports.execute = async unzippedPath => {
  console.time('execute')

  const stdout = await new Promise((resolve, reject) => {
    const process = childProcess.fork(`${unzippedPath}/index.js`, [], {
      silent: true
    })
    let stdout = ''
    process.on('error', reject)
    process.stdout.on('data', msg => (stdout += msg))
    process.on('exit', () => resolve(stdout))
  })

  console.timeEnd('execute')
  return stdout
}

exports.response = stdout => ({
  statusCode: 200,
  body: JSON.stringify({ stdout })
})
