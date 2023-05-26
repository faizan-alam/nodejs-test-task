module.exports = (request) => {
  return new Promise((res, rej) => {
    try {
      let data = "";
      request.on("data", (chunk) => {
        data += chunk;
      });
      request.on("end", () => {
        res(JSON.parse(data));
      });
    } catch (error) {
      rej(error);
    }
  });
};
