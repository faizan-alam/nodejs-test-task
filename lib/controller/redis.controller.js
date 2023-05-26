const redisClient = require('../redis')

class RedisController {
  get (key) {
    return new Promise((resolve, reject) => {
      try {
        redisClient.get(key, (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve(JSON.parse(result))
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  create (key, value) {
    return new Promise((resolve, reject) => {
      try {
        redisClient.set(key, value, (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve(result)
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  getAllKeys (key) {
    return new Promise((resolve, reject) => {
      try {
        redisClient.keys(key, (err, result) => {
          if (err) {
            reject(err)
            return
          }
          resolve(result)
        })
      } catch (error) {
        reject(error)
      }
    })
  }
}

module.exports = new RedisController()
