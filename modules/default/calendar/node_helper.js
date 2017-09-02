/* Magic Mirror
 * Node Helper: Calendar
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
var validUrl = require("valid-url");
var CalendarFetcher = require("./calendarfetcher.js");

module.exports = NodeHelper.create({
	// Override start method.
	start: function() {
		var self = this;
		var events = [];

		this.fetchers = [];

		console.log("Starting node helper for: " + this.name);

	},

	// Override socketNotificationReceived method.
	socketNotificationReceived: function(notification, payload) {
		if (notification === "ADD_CALENDAR") {
			//console.log('ADD_CALENDAR: ');
			this.createFetcher(payload.url, payload.fetchInterval, payload.maximumEntries, payload.maximumNumberOfDays, payload.startDate);
		}
		else if (notification == "UPDATE_START_DATE")
		{
			// As time passes, our start date for filtering calendar entries will increase.  Make sure to tell the calendar
			// fetcher the new start date.
			var fetcher = this.fetchers[payload.url];
			if (typeof fetcher != "undefined")
			{
				fetcher.updateStartDate(payload.startDate);
			}
		}
	},

	/* createFetcher(url, reloadInterval)
	 * Creates a fetcher for a new url if it doesn't exist yet.
	 * Otherwise it reuses the existing one.
	 *
	 * attribute url string - URL of the news feed.
	 * attribute reloadInterval number - Reload interval in milliseconds.
	 */

	createFetcher: function(url, fetchInterval, maximumEntries, maximumNumberOfDays, startDate) {
		var self = this;

		if (!validUrl.isUri(url)) {
			self.sendSocketNotification("INCORRECT_URL", {url: url});
			return;
		}

		var fetcher;
		if (typeof self.fetchers[url] === "undefined") {
			console.log("Create new calendar fetcher for url: " + url + " - Interval: " + fetchInterval);
			fetcher = new CalendarFetcher(url, fetchInterval, maximumEntries, maximumNumberOfDays, startDate);

			fetcher.onReceive(function(fetcher) {
				//console.log('Broadcast events.');
				//console.log(fetcher.events());

				self.sendSocketNotification("CALENDAR_EVENTS", {
					url: fetcher.url(),
					events: fetcher.events()
				});
			});
			
			fetcher.onError(function(fetcher, error) {
				self.sendSocketNotification("FETCH_ERROR", {
					url: fetcher.url(),
					error: error
				});
			});

			self.fetchers[url] = fetcher;
		} else {
			//console.log('Use existing news fetcher for url: ' + url);
			fetcher = self.fetchers[url];
			fetcher.broadcastEvents();
		}

		fetcher.startFetch();
	}
});
