const redisClient = require("../redis");

class RedisController {
  get(key) {
    return new Promise((res, rej) => {
      try {
        redisClient.get(key, (err, result) => {
          if (err) {
            rej(err);
            return;
          }
          res(JSON.parse(result));
        });
      } catch (error) {
        rej(error);
      }
    });
  }
  create(key, value) {
    return new Promise((res, rej) => {
      try {
        redisClient.set(key, value, (err, result) => {
          if (err) {
            rej(err);
            return;
          }
          res(result);
        });
      } catch (error) {
        rej(error);
      }
    });
  }
  getAllKeys(key) {
    return new Promise((res, rej) => {
      try {
        redisClient.keys(key, (err, result) => {
          if (err) {
            rej(err);
            return;
          }
          res(result);
        });
      } catch (error) {
        rej(error);
      }
    });
  }
}

module.exports = new RedisController();
