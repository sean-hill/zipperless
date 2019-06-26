process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1'

const fs = require('fs-extra')
const tar = require('tar')
const awsSdk = require('aws-sdk')

exports.handler = async (event, context) => {
  console.time('total')
  const url = event.queryStringParameters.url
  const downloadedFilePath = await this.download()
  const unzippedPath = await this.extract(downloadedFilePath)
  const result = await this.execute({ unzippedPath, handlerInputs: { url } })
  console.timeEnd('total')
  return this.response(result)
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

  const zippedFilePath = '/tmp/zipper.tar.gz'
  await fs.writeFile(zippedFilePath, response.Body)

  console.timeEnd('download')
  return zippedFilePath
}

exports.extract = async zippedFilePath => {
  console.time('extract')

  const unzippedPath = '/tmp/zippered'
  await fs.remove(unzippedPath)
  await fs.mkdirp(unzippedPath)

  await tar.x({
    file: zippedFilePath,
    cwd: unzippedPath
  })

  console.timeEnd('extract')
  return unzippedPath
}

exports.execute = async ({ unzippedPath, handlerInputs }) => {
  console.time('execute')

  const executable = require(unzippedPath)
  const result = await executable.handler(handlerInputs)

  console.timeEnd('execute')
  return result
}

exports.response = result => ({
  statusCode: 200,
  body: JSON.stringify({ result })
})
