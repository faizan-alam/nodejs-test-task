module.exports = (schema = [], requestBody) => {
  return new Promise((res, rej) => {
    const missingKeys = [];
    for (let index = 0; index < schema.length; index++) {
      const element = schema[index];
      if (typeof requestBody[element] === "undefined") {
        missingKeys.push(`"${element}" is missing`);
      }
    }
    if (missingKeys.length) {
      rej(missingKeys);
    } else {
      res([]);
    }
  });
};
