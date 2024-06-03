/**
 * To be called from the visualization's click handler, after computing the
 * correct time range from the target of the click.
 *
 * @param earliestTime - the lower bound of the time range,
 *          can be an ISO-8601 timestamp or an epoch time in seconds.
 * @param latestTime - the upper bound of the time range,
 *          can be an ISO-8601 timestamp or an epoch time in seconds.
 * @param browserEvent - the original browser event that caused the drilldown
 *
 * example usage:
 *
 * this.drilldownToTimeRange('1981-08-18T00:00:00.000-07:00', '1981-08-19T00:00:00.000-07:00', e);
 */
const _drilldownToTimeRange = function (earliestTime, latestTime, browserEvent) {
  this.drilldown({
    earliest: earliestTime,
    latest: latestTime
  }, browserEvent);
}

module.exports = _drilldownToTimeRange