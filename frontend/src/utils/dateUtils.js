export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDate(currentDateStr, days, setter) {
  if (!currentDateStr) return;
  const parts = currentDateStr.split('-');
  if (parts.length !== 3) return;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (Number.isNaN(d.getTime())) return;
  d.setDate(d.getDate() + days);
  setter(getLocalDateString(d));
}
