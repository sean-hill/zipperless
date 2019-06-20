const fs = require('fs')
const unzipper = require('unzipper')
const childProcess = require('child_process')

exports.handler = async (event, context) => {
  const downloadedFilePath = await this.download()
  const unzippedPath = await this.extract(downloadedFilePath)
  const stdout = await this.execute(unzippedPath)
  return this.response(stdout)
}

exports.download = async () => {
  return './zipper.zip'
}

exports.extract = async zippedFilePath => {
  const unzippedPath = '/tmp/zippered'
  await new Promise(resolve => {
    fs.createReadStream(zippedFilePath)
      .pipe(unzipper.Extract({ path: unzippedPath }))
      .on('close', resolve)
  })
  return unzippedPath
}

exports.execute = async unzippedPath => {
  return new Promise((resolve, reject) => {
    const process = childProcess.fork(`${unzippedPath}/index.js`, [], {
      silent: true
    })
    let stdout = ''
    process.on('error', reject)
    process.stdout.on('data', msg => (stdout += msg))
    process.on('exit', () => resolve(stdout))
  })
}

exports.response = stdout => ({
  statusCode: 200,
  body: JSON.stringify({ stdout })
})
