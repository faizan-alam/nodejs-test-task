var URL = require('url')
var http = require('http')
var cuid = require('cuid')
var Corsify = require('corsify')
var sendJson = require('send-data/json')
var ReqLogger = require('req-logger')
var healthPoint = require('healthpoint')
var HttpHashRouter = require('http-hash-router')

var redis = require('./redis')
var version = require('../package.json').version

var router = HttpHashRouter()
var logger = ReqLogger({ version: version })
var health = healthPoint({ version: version }, redis.healthCheck)
var cors = Corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, accept, content-type'
})

const transformDataBlob = require("./helpers/transformDataBlob");
const targetController = require("./controller/target.controller");
const validator = require("./helpers/validator");

router.set('/favicon.ico', empty)

router.set("/route", async function (req, res) {
  try {
    if (req.method === "POST") {
      const body = await transformDataBlob(req);
      await validator(["geoState", "timestamp"], body);
      const payload = await targetController.getFilteredDecisions(body);
      res.statusCode = 200;
      sendJson(req, res, {
        status: "OK",
        payload,
        decision: "Accepted",
      });
      return;
    }
    res.statusCode = 404;
    sendJson(req, res, {
      error: http.STATUS_CODES[404],
      decision: "Rejected",
    });
  } catch (error) {
    console.log("🚀 ~ file: server.js:29 ~ error:", error);
    res.statusCode = 400;
    sendJson(req, res, {
      error: error,
      decision: "Rejected",
    });
  }
});

router.set("/api/target/:id", async function (req, res, opt) {
  try {
    if (req.method === "GET") {
      const id = opt.params.id;
      await validator(["id"], opt.params);
      const payload = await targetController.get(id);
      if (!payload) {
        throw "Not Found";
      }
      res.statusCode = 200;
      sendJson(req, res, {
        status: "OK",
        payload,
      });
      return;
    } else if (req.method === "POST") {
      const body = await transformDataBlob(req);
      await validator(["id"], opt.params);

      const payload = await targetController.updateById(body, opt.params.id);
      res.statusCode = 200;
      sendJson(req, res, {
        status: "OK",
        payload,
      });
      return;
    }
    res.statusCode = 404;
    sendJson(req, res, {
      error: http.STATUS_CODES[404],
    });
  } catch (error) {
    res.statusCode = 400;
    sendJson(req, res, {
      error,
    });
  }
});

router.set("/api/targets", async function (req, res) {
  try {
    if (req.method === "POST") {
      const body = await transformDataBlob(req);
      await validator(["url", "maxAcceptsPerDay", "accept"], body);

      const payload = await targetController.create(body);
      res.statusCode = 200;
      sendJson(req, res, {
        status: "OK",
        payload,
      });
      return;
    }
    if (req.method === "GET") {
      const payload = await targetController.getAll();
      res.statusCode = 200;
      sendJson(req, res, {
        status: "OK",
        payload,
      });
      return;
    }
    res.statusCode = 404;
    sendJson(req, res, {
      error: http.STATUS_CODES[404],
    });
  } catch (error) {
    res.statusCode = 400;
    sendJson(req, res, {
      error,
    });
  }
});

module.exports = function createServer () {
  return http.createServer(cors(handler))
}

function handler (req, res) {
  if (req.url === '/health') return health(req, res)
  req.id = cuid()
  logger(req, res, { requestId: req.id }, function (info) {
    info.authEmail = (req.auth || {}).email
    console.log(info)
  })
  router(req, res, { query: getQuery(req.url) }, onError.bind(null, req, res))
}

function onError (req, res, err) {
  if (!err) return

  res.statusCode = err.statusCode || 500
  logError(req, res, err)

  sendJson(req, res, {
    error: err.message || http.STATUS_CODES[res.statusCode]
  })
}

function logError (req, res, err) {
  if (process.env.NODE_ENV === 'test') return

  var logType = res.statusCode >= 500 ? 'error' : 'warn'

  console[logType]({
    err: err,
    requestId: req.id,
    statusCode: res.statusCode
  }, err.message)
}

function empty (req, res) {
  res.writeHead(204)
  res.end()
}

function getQuery (url) {
  return URL.parse(url, true).query // eslint-disable-line
}
