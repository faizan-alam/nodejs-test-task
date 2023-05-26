module.exports = (_) => {
  const date = new Date(_)
  const day = date.getDate()
  const month = date.getMonth() + 1 // Months are zero-based
  const year = date.getFullYear()

  const formattedDay = String(day).padStart(2, '0')
  const formattedMonth = String(month).padStart(2, '0')

  return `${formattedDay}/${formattedMonth}/${year}`
}
