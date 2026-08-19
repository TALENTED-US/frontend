export function expenseCategoryIconPath(name = '') {
  if (/FOOD|식비/.test(name)) return 'M4 3v7a3 3 0 0 0 3 3v8M7 3v7M10 3v7M16 3v18M16 3c3 2 4 5 4 8h-4'
  if (/ALCOHOL_ENTERTAINMENT|술|유흥/.test(name)) return 'M5 4h14l-1 8a6 6 0 0 1-12 0L5 4Zm7 14v3m-4 0h8'
  if (/CAFE_SNACK|카페|간식/.test(name)) return 'M4 7h13v6a6 6 0 0 1-12 0V7Zm13 2h2a3 3 0 0 1 0 6h-3M4 21h14'
  if (/TRANSPORT_FUEL|교통|주유/.test(name)) return 'M6 17h12M7 17l-2 4M17 17l2 4M5 13h14M6 4h12l2 9H4l2-9Zm2 5h.01M16 9h.01'
  if (/SHOPPING|쇼핑/.test(name)) return 'M6 8h12l1 13H5L6 8Zm3 0a3 3 0 0 1 6 0'
  if (/HOUSING_COMMUNICATION|주거|월세|통신/.test(name)) return 'm3 11 9-8 9 8v10h-6v-6H9v6H3V11Z'
  if (/JOB_PREPARATION|취업|교육|자격/.test(name)) return 'm3 6 9-4 9 4-9 4-9-4Zm3 2v6c3 3 9 3 12 0V8M21 6v7'
  if (/HEALTH_FITNESS|건강|운동|의료/.test(name)) return 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z'
  if (/HOBBY_LEISURE|취미|여가/.test(name)) return 'M8 8h8l3 4v6a2 2 0 0 1-3 1l-2-3h-4l-2 3a2 2 0 0 1-3-1v-6l3-4Zm1 4v3m-1.5-1.5h3M15 13h.01M17 15h.01'
  return 'M5 3h14v18H5V3Zm4 4h6M9 11h6M9 15h4'
}
