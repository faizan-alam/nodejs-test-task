const { v4: uuidv4 } = require('uuid')

const { REDIS_TARGET_KEY } = require('../constant')
const dateFormat = require('../helpers/dateFormat')
const redisController = require('./redis.controller')

class TargetController {
  checkCriteria (target, visitorInfo) {
    const timestamp = dateFormat(visitorInfo.timestamp)
    const maxAcceptsPerDay = target.maxAcceptsPerDay
    const request = target.request || []
    const noOfRequestMatchWithTimestamp = request.filter(
      (row) => dateFormat(row) === timestamp
    ).length

    if (noOfRequestMatchWithTimestamp >= maxAcceptsPerDay) {
      return false
    }

    if (
      target.accept.geoState.$in &&
      !target.accept.geoState.$in.includes(visitorInfo.geoState)
    ) {
      return false
    }
    if (
      target.accept.hour.$in &&
      !target.accept.hour.$in.includes(
        new Date(visitorInfo.timestamp).getUTCHours().toString()
      )
    ) {
      return false
    }

    return true
  }

  updateRequestCounter (param, timestamp) {
    return new Promise((resolve, reject) => {
      const id = param.id
      const request = param.request || []
      request.push(timestamp)
      const payload = JSON.stringify({
        ...param,
        id,
        request
      })
      redisController.create(`${REDIS_TARGET_KEY}:${id}`, payload).then(row => {
        resolve(true)
      }).catch(error => reject(error))
    })
  }

  create (param) {
    return new Promise((resolve, reject) => {
      const id = uuidv4()
      const paramsWithId = { ...param, id, request: [] }
      const payload = JSON.stringify(paramsWithId)

      redisController.create(`${REDIS_TARGET_KEY}:${id}`, payload).then(row => {
        resolve(paramsWithId)
      }).catch(error => reject(error))
    })
  }

  getAll () {
    return new Promise((resolve, reject) => {
      redisController.getAllKeys(`${REDIS_TARGET_KEY}:*`).then(async (keys) => {
        const targets = []

        for (const key of keys) {
          const item = await redisController.get(key)
          targets.push(item)
        }
        resolve(targets)
      })
    })
  }

  get (id) {
    return new Promise((resolve, reject) => {
      redisController.get(`${REDIS_TARGET_KEY}:${id}`).then(row => {
        resolve(row)
      }).catch(error => reject(error))
    })
  }

  updateById (param, id) {
    return new Promise((resolve, reject) => {
      redisController.get(`${REDIS_TARGET_KEY}:${id}`).then(async item => {
        if (!item) {
          throw new Error('Item not found')
        }
        const paramsWithId = { ...item, ...param, id }
        const payload = JSON.stringify(paramsWithId)
        await redisController.create(`${REDIS_TARGET_KEY}:${id}`, payload)
        resolve(paramsWithId)
      }).catch(error => reject(error))
    })
  }

  getFilteredDecisions (visitorInfo) {
    return new Promise((resolve, reject) => {
      this.getAll().then(async allTargets => {
        const filteredTargets = allTargets.filter((target) => {
          return this.checkCriteria(target, visitorInfo)
        })

        if (filteredTargets.length === 0) {
          throw new Error('rejected')
        }

        const highestValueTarget = filteredTargets.reduce((prev, current) => {
          return prev.value > current.value ? prev : current
        })

        await this.updateRequestCounter(
          highestValueTarget,
          visitorInfo.timestamp
        )

        resolve(highestValueTarget.url)
      }).catch(error => {
        reject(error)
      })
    })
  }
}

module.exports = new TargetController()
