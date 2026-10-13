const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MILLISECONDS = IST_OFFSET_MINUTES * 60 * 1000;
const DATE_TIME_FIELDS = ["onDutyFrom", "onDutyTo", "offCampusFrom", "offCampusTo"];

const parseIstDateTime = (value) => {
  if (typeof value !== "string" || !value.trim()) return value;

  const input = value.trim();
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(input)) return new Date(input);

  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/.exec(input);
  if (!match) return value;

  const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = ""] = match;
  const parts = {
    year: Number(year),
    month: Number(month) - 1,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(fraction.slice(0, 3).padEnd(3, "0")),
  };
  const localWallTimeAsUtc = new Date(Date.UTC(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  ));

  if (
    localWallTimeAsUtc.getUTCFullYear() !== parts.year ||
    localWallTimeAsUtc.getUTCMonth() !== parts.month ||
    localWallTimeAsUtc.getUTCDate() !== parts.day ||
    localWallTimeAsUtc.getUTCHours() !== parts.hour ||
    localWallTimeAsUtc.getUTCMinutes() !== parts.minute ||
    localWallTimeAsUtc.getUTCSeconds() !== parts.second
  ) {
    return new Date(NaN);
  }

  return new Date(localWallTimeAsUtc.getTime() - IST_OFFSET_MILLISECONDS);
};

const normalizeIndividualEventAttendingDateTimes = (payload = {}) => {
  const normalized = { ...payload };
  for (const field of DATE_TIME_FIELDS) {
    if (normalized[field] !== undefined && normalized[field] !== null) {
      normalized[field] = parseIstDateTime(normalized[field]);
    }
  }
  return normalized;
};

const formatDateTimeAsIst = (value) => {
  if (value === undefined || value === null || value === "") return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${new Date(date.getTime() + IST_OFFSET_MILLISECONDS).toISOString().slice(0, -1)}+05:30`;
};

const toIstIndividualEventAttendingResponse = (value) => {
  if (!value) return value;

  const response = typeof value.toObject === "function" ? value.toObject() : { ...value };
  for (const field of DATE_TIME_FIELDS) {
    if (response[field] !== undefined) {
      response[field] = formatDateTimeAsIst(response[field]);
    }
  }
  return response;
};

module.exports = {
  formatDateTimeAsIst,
  normalizeIndividualEventAttendingDateTimes,
  toIstIndividualEventAttendingResponse,
};