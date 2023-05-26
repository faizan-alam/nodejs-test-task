process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')
var fakeRedis = require('../lib/redis')

var server = require('../lib/server')
const targetController = require('../lib/controller/target.controller')

const targetSample = {
  url: 'http://example.com',
  value: 0.5,
  maxAcceptsPerDay: 10,
  accept: {
    geoState: {
      $in: ['ca', 'ny']
    },
    hour: {
      $in: ['13', '14', '15']
    }
  }
}
const bulkViewRoute = async (maxAcceptsPerDay, visitorInfo) => {
  for (
    let index = 0;
    index < [...new Array(maxAcceptsPerDay)].length;
    index++
  ) {
    await targetController.getFilteredDecisions(visitorInfo)
  }
}

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('create a target', function (t) {
  const url = '/api/targets'
  fakeRedis.flushdb()
  servertest(
    server(),
    url,
    { encoding: 'json', method: 'POST' },
    (err, res) => {
      t.falsy(err, 'no error')
      t.deepEqual(res.statusCode, 200, 'correct statusCode')
      t.deepEqual(res.body.status, 'OK', 'return OK')
      const requestPayload = res.body.payload
      delete requestPayload.id
      delete requestPayload.request
      t.deepEqual(requestPayload, targetSample, 'return OK')
      t.end()
    }
  ).end(JSON.stringify(targetSample))
})

test.serial.cb('validate post targets api', function (t) {
  const url = '/api/targets'
  fakeRedis.flushdb()
  servertest(
    server(),
    url,
    { encoding: 'json', method: 'POST' },
    (err, res) => {
      t.falsy(err, 'no error')
      t.deepEqual(res.statusCode, 400, 'correct statusCode')
      t.end()
    }
  ).end(JSON.stringify({}))
})

test.serial.cb('get all target', function (t) {
  const url = '/api/targets'
  fakeRedis.flushdb()
  targetController.create(targetSample)
  targetController.create(targetSample)
  targetController.create(targetSample)

  servertest(server(), url, { encoding: 'json', method: 'GET' }, (err, res) => {
    t.falsy(err, 'no error')
    t.deepEqual(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body.status, 'OK', 'return OK')
    t.deepEqual(res.body.payload.length, 3, 'return 3 item')
    t.end()
  })
})

test.serial.cb('get single target by id', function (t) {
  fakeRedis.flushdb()
  targetController.create(targetSample).then((res) => {
    const id = res.id
    const url = '/api/target/' + id
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')

      t.deepEqual(
        res.body.payload,
        { ...targetSample, id: id, request: [] },
        'contains target data'
      )
      t.end()
    })
  })
})
test.serial.cb('validate get target by id api', function (t) {
  fakeRedis.flushdb()
  targetController.create(targetSample).then((res) => {
    const id = null
    const url = '/api/target/' + id
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 400, 'correct statusCode')

      t.end()
    })
  })
})

test.serial.cb('update a target', function (t) {
  const updatedFields = {
    url: 'http://another.example.com',
    maxAcceptsPerDay: 20
  }

  fakeRedis.flushdb()
  targetController.create(targetSample).then((res) => {
    const item = res
    const id = item.id
    const url = '/api/target/' + id
    servertest(
      server(),
      url,
      { encoding: 'json', method: 'POST' },
      function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 200, 'correct statusCode')
        t.deepEqual(
          res.body.payload,
          { ...item, ...updatedFields },
          'payload matches'
        )
        t.end()
      }
    ).end(JSON.stringify(updatedFields))
  })
})

test.serial.cb('validate update target by id api', function (t) {
  fakeRedis.flushdb()
  targetController.create(targetSample).then((res) => {
    const id = null
    const url = '/api/target/' + id
    servertest(
      server(),
      url,
      { encoding: 'json', method: 'POST' },
      function (err, res) {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 400, 'correct statusCode')
        t.end()
      }
    ).end(JSON.stringify({}))
  })
})
test.serial.cb('reject decision', function (t) {
  const url = '/route'
  fakeRedis.flushdb()
  targetController.create(targetSample)
  const visitorInfo = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T23:28:59.513Z'
  }

  servertest(
    server(),
    url,
    { encoding: 'json', method: 'POST' },
    (err, res) => {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 400, 'correct statusCode')
      t.is(res.body.decision, 'Rejected', 'return reject decision')
      t.end()
    }
  ).end(JSON.stringify(visitorInfo))
})

test.serial.cb('validate route api', function (t) {
  const url = '/route'
  const visitorInfo = {
    publisher: 'abc'
  }

  servertest(
    server(),
    url,
    { encoding: 'json', method: 'POST' },
    (err, res) => {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 400, 'correct statusCode')
      t.end()
    }
  ).end(JSON.stringify(visitorInfo))
})

test.serial.cb('route returns remaining url', function (t) {
  const url = '/route'
  fakeRedis.flushdb()
  targetController.create(targetSample)
  const visitorInfo = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T14:28:59.513Z'
  }

  servertest(
    server(),
    url,
    { encoding: 'json', method: 'POST' },
    (err, res) => {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(res.body.payload, targetSample.url, 'return url')
      t.end()
    }
  ).end(JSON.stringify(visitorInfo))
})

test.serial.cb('accepting only maxAcceptsPerDay request', function (t) {
  const url = '/route'
  fakeRedis.flushdb()
  targetController.create(targetSample)
  const visitorInfo = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-19T14:28:59.513Z'
  }
  bulkViewRoute(10, visitorInfo).then(() => {
    servertest(
      server(),
      url,
      { encoding: 'json', method: 'POST' },
      (err, res) => {
        t.falsy(err, 'no error')
        t.is(res.statusCode, 400, 'correct statusCode')
        t.is(res.body.decision, 'Rejected', 'return reject decision')
        t.end()
      }
    ).end(JSON.stringify(visitorInfo))
  })
})
