const { v4: uuidv4 } = require("uuid");

const { REDIS_TARGET_KEY } = require("../constant");
const dateFormat = require("../helpers/dateFormat");
const redisController = require("./redis.controller");

class TargetController {
  checkCriteria(target, visitorInfo) {
    const timestamp = dateFormat(visitorInfo.timestamp);
    const maxAcceptsPerDay = target.maxAcceptsPerDay;
    const request = target.request || [];
    const noOfRequestMatchWithTimestamp = request.filter(
      (row) => dateFormat(row) === timestamp
    ).length;

    if (noOfRequestMatchWithTimestamp >= maxAcceptsPerDay) {
      return false;
    }

    if (
      target.accept.geoState.$in &&
      !target.accept.geoState.$in.includes(visitorInfo.geoState)
    ) {
      return false;
    }
    if (
      target.accept.hour.$in &&
      !target.accept.hour.$in.includes(
        new Date(visitorInfo.timestamp).getUTCHours().toString()
      )
    ) {
      return false;
    }

    return true;
  }
  updateRequestCounter(param, timestamp) {
    return new Promise(async (res, rej) => {
      try {
        const id = param.id;
        const request = param.request || [];
        request.push(timestamp);
        const payload = JSON.stringify({
          ...param,
          id,
          request,
        });
        await redisController.create(`${REDIS_TARGET_KEY}:${id}`, payload);
        res(true);
      } catch (error) {
        rej(error);
      }
    });
  }

  create(param) {
    return new Promise(async (res, rej) => {
      const id = uuidv4();
      const paramsWithId = { ...param, id, request: [] };
      const payload = JSON.stringify(paramsWithId);

      try {
        await redisController.create(`${REDIS_TARGET_KEY}:${id}`, payload);
        res(paramsWithId);
      } catch (error) {
        rej(error);
      }
    });
  }
  getAll() {
    return new Promise(async (res, rej) => {
      try {
        const keys = await redisController.getAllKeys(`${REDIS_TARGET_KEY}:*`);
        const targets = [];

        for (const key of keys) {
          const item = await redisController.get(key);
          targets.push(item);
        }
        res(targets);
      } catch (error) {
        rej(error);
      }
    });
  }
  get(id) {
    return new Promise(async (res, rej) => {
      try {
        const item = await redisController.get(`${REDIS_TARGET_KEY}:${id}`);
        res(item);
      } catch (error) {
        rej(error);
      }
    });
  }
  updateById(param, id) {
    return new Promise(async (res, rej) => {
      try {
        const item = await redisController.get(`${REDIS_TARGET_KEY}:${id}`);
        if (!item) {
          throw "Item not found";
        }
        const paramsWithId = { ...item, ...param, id };
        const payload = JSON.stringify(paramsWithId);
        await redisController.create(`${REDIS_TARGET_KEY}:${id}`, payload);
        res(paramsWithId);
      } catch (error) {
        rej(error);
      }
    });
  }
  getFilteredDecisions(visitorInfo) {
    return new Promise(async (res, rej) => {
      try {
        const allTargets = await this.getAll();
        const filteredTargets = allTargets.filter((target) => {
          return this.checkCriteria(target, visitorInfo);
        });

        if (filteredTargets.length === 0) {
          return rej("rejected");
        }

        const highestValueTarget = filteredTargets.reduce((prev, current) => {
          return prev.value > current.value ? prev : current;
        });

        await this.updateRequestCounter(
          highestValueTarget,
          visitorInfo.timestamp
        );

        res(highestValueTarget.url);
      } catch (error) {
        rej(error);
      }
    });
  }
}

module.exports = new TargetController();
