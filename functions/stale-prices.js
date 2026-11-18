"use strict";
/* SERVERLESS FUNCTION (Course 9): which prices are too old to formulate on?
   A pure function with no server of its own. A platform runs it on demand. */
exports.main = async (params = {}) => {
  const thresholdDays = Number.isFinite(params.thresholdDays) ? params.thresholdDays : 14;
  const prices = Array.isArray(params.prices) ? params.prices : [];
  const stale = prices.filter(p => p.ageDays > thresholdDays).map(p => p.name);
  return { statusCode: 200, body: { thresholdDays, stale } };
};
