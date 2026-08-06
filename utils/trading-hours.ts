/** A 股大致交易时段（简化判断，用于降低非交易时段刷新频率） */
export function isCnMarketOpen(date = new Date()): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;

  const minutes = date.getHours() * 60 + date.getMinutes();
  const morning = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30;
  const afternoon = minutes >= 13 * 60 && minutes <= 15 * 60;
  return morning || afternoon;
}
