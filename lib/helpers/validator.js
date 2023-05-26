module.exports = (schema = [], requestBody) => {
  return new Promise((resolve, reject) => {
    const missingKeys = []
    for (let index = 0; index < schema.length; index++) {
      const element = schema[index]
      if (typeof requestBody[element] === 'undefined') {
        missingKeys.push(`"${element}" is missing`)
      }
    }
    if (missingKeys.length) {
      reject(missingKeys)
    } else {
      resolve([])
    }
  })
}
