module.exports = (request) => {
  return new Promise((resolve, reject) => {
    try {
      let data = ''
      request.on('data', (chunk) => {
        data += chunk
      })
      request.on('end', () => {
        resolve(JSON.parse(data))
      })
    } catch (error) {
      reject(error)
    }
  })
}
