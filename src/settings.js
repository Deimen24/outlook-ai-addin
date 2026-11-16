"use strict";

/*
 * Settings: stored per user in the mailbox via Office roaming settings.
 */
(function (ns)
{
	const SETTINGS_KEY = "aiaddin_settings";

	const DEFAULTS = {
		server_url: "",
		api_key: "",
		model: "",
		target_lang: "Deutsch",
		max_chars: 12000,
		temperature: 0.3
	};

	function clean_url(url)
	{
		url = (url || "").trim();
		while (url.endsWith("/"))
			url = url.slice(0, -1);
		/* users often paste the API path; the code adds it itself */
		if (url.toLowerCase().endsWith("/api"))
			url = url.slice(0, -4);
		return url;
	}

	function load_settings()
	{
		const saved = Office.context.roamingSettings.get(SETTINGS_KEY);

		return Object.assign({}, DEFAULTS, saved || {});
	}

	function save_settings(s)
	{
		const rs = Office.context.roamingSettings;

		s.server_url = clean_url(s.server_url);
		rs.set(SETTINGS_KEY, s);
		return new Promise(function (resolve, reject) {
			rs.saveAsync(function (res) {
				const ok = Office.AsyncResultStatus.Succeeded;

				if (res.status === ok)
					resolve();
				else
					reject(new Error(res.error.message));
			});
		});
	}

	function is_configured(s)
	{
		return Boolean(s.server_url && s.api_key && s.model);
	}

	ns.DEFAULTS = DEFAULTS;
	ns.clean_url = clean_url;
	ns.load_settings = load_settings;
	ns.save_settings = save_settings;
	ns.is_configured = is_configured;
})(window.aiaddin = window.aiaddin || {});
