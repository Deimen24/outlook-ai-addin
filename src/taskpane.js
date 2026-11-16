"use strict";

/*
 * Task pane UI: wires buttons to the mail, prompt and API helpers.
 */
(function (ai)
{
	let settings = null;
	let controller = null;

	function el(id)
	{
		return document.getElementById(id);
	}

	function set_status(id, text, kind)
	{
		const node = el(id);

		node.textContent = text;
		node.classList.toggle("error", kind === "error");
		node.classList.toggle("ok", kind === "ok");
	}

	function set_busy(busy)
	{
		const buttons = document.querySelectorAll("button");

		for (const b of buttons)
			b.disabled = busy;
		el("btn-stop").disabled = false;
		el("btn-stop").hidden = !busy;
	}

	function abort_request()
	{
		if (controller)
			controller.abort();
		controller = null;
	}

	/*
	 * Item handling
	 */
	function show_no_item()
	{
		el("no-item").hidden = false;
		el("read-actions").hidden = true;
		el("compose-actions").hidden = true;
		el("result-section").hidden = true;
		el("mode-label").textContent = "AI Assistant";
		el("subject").textContent = "";
	}

	async function refresh_item()
	{
		const item = ai.current_item();
		let compose;

		abort_request();
		set_busy(false);
		el("result").value = "";
		set_status("status", "");
		if (!item) {
			show_no_item();
			return;
		}
		compose = ai.is_compose(item);
		el("no-item").hidden = true;
		el("result-section").hidden = false;
		el("read-actions").hidden = compose;
		el("compose-actions").hidden = !compose;
		document.body.className = compose ? "compose" : "read";
		el("mode-label").textContent = compose ? "Verfassen" : "Lesen";
		try {
			const subject = await ai.get_subject(item);
			el("subject").textContent = subject || "(kein Betreff)";
		} catch (e) {
			el("subject").textContent = "";
		}
	}

	/*
	 * Running actions
	 */
	function action_opts(action)
	{
		return {
			target_lang: settings.target_lang,
			question: el("ask-input").value.trim(),
			tone: el("tone-select").value,
			instruction: el("custom-input").value.trim()
		};
	}

	function check_input(action, opts)
	{
		if (action === "ask" && !opts.question)
			return "Bitte eine Frage eingeben.";
		if (action === "custom" && !opts.instruction)
			return "Bitte eine Anweisung eingeben.";
		return null;
	}

	function truncate_mail(mail)
	{
		const max = Number(settings.max_chars) || 12000;

		if (mail.body.length > max)
			mail.body = mail.body.slice(0, max) +
				"\n[… gekürzt]";
		return mail;
	}

	function append_result(delta)
	{
		const out = el("result");

		out.value += delta;
		out.scrollTop = out.scrollHeight;
	}

	async function prepare_prompt(action)
	{
		const opts = action_opts(action);
		const problem = check_input(action, opts);
		let mail;

		if (problem)
			throw new Error(problem);
		mail = await ai.read_mail(ai.current_item());
		if (!mail.body.trim())
			throw new Error("Die E-Mail enthält keinen Text.");
		return ai.build_prompt(action, truncate_mail(mail), opts);
	}

	async function run_action(action)
	{
		if (!ai.is_configured(settings)) {
			el("settings").open = true;
			set_status("status", "Bitte zuerst die Einstellungen " +
				"ausfüllen.", "error");
			return;
		}
		el("result").value = "";
		set_status("status", "Denke nach …");
		set_busy(true);
		controller = new AbortController();
		try {
			const prompt = await prepare_prompt(action);
			await ai.chat(settings, prompt, controller.signal,
				append_result);
			set_status("status", "Fertig.", "ok");
		} catch (e) {
			if (e.name === "AbortError")
				set_status("status", "Abgebrochen.");
			else
				set_status("status", e.message, "error");
		} finally {
			controller = null;
			set_busy(false);
		}
	}

	/*
	 * Result buttons
	 */
	function result_text()
	{
		return el("result").value.trim();
	}

	async function copy_result()
	{
		const text = result_text();

		if (!text)
			return;
		try {
			await navigator.clipboard.writeText(text);
		} catch (e) {
			el("result").select();
			document.execCommand("copy");
		}
		set_status("status", "Kopiert.", "ok");
	}

	async function write_result(fn, done_msg)
	{
		const text = result_text();

		if (!text) {
			set_status("status", "Kein Ergebnis vorhanden.",
				"error");
			return;
		}
		try {
			await fn(ai.current_item(), text);
			set_status("status", done_msg, "ok");
		} catch (e) {
			set_status("status", e.message, "error");
		}
	}

	function open_reply()
	{
		return write_result(async function (item, text) {
			ai.open_reply(item, text);
		}, "Antwortfenster geöffnet.");
	}

	/*
	 * Settings panel
	 */
	function add_model_option(select, id, name)
	{
		const opt = document.createElement("option");

		opt.value = id;
		opt.textContent = name;
		select.appendChild(opt);
	}

	function fill_models(models)
	{
		const select = el("set-model");
		const current = settings.model;

		select.textContent = "";
		if (current && !models.some(function (m) {
			return m.id === current;
		}))
			add_model_option(select, current, current);
		for (const m of models)
			add_model_option(select, m.id, m.name);
		select.value = current;
	}

	function fill_form()
	{
		el("set-server").value = settings.server_url;
		el("set-key").value = settings.api_key;
		el("set-lang").value = settings.target_lang;
		el("set-max").value = settings.max_chars;
		el("set-temp").value = settings.temperature;
		fill_models([]);
	}

	function read_form()
	{
		return {
			server_url: ai.clean_url(el("set-server").value),
			api_key: el("set-key").value.trim(),
			model: el("set-model").value,
			target_lang: el("set-lang").value.trim() || "Deutsch",
			max_chars: Number(el("set-max").value) || 12000,
			temperature: Math.min(1, Math.max(0,
				Number(el("set-temp").value) || 0))
		};
	}

	function check_form(form)
	{
		if (!/^https?:\/\/.+/.test(form.server_url))
			throw new Error("Bitte die Server-URL eintragen " +
				"(z. B. https://openwebui.firma.lan).");
		if (!form.api_key)
			throw new Error("Bitte den API-Schlüssel eintragen.");
	}

	async function load_models()
	{
		const form = read_form();

		check_form(form);
		const models = await ai.list_models(form);

		settings.model = form.model || settings.model;
		fill_models(models);
		if (!el("set-model").value && models.length)
			el("set-model").value = models[0].id;
		return models;
	}

	async function test_connection()
	{
		set_status("settings-status", "Verbinde …");
		try {
			const models = await load_models();
			set_status("settings-status", "Verbunden: " +
				models.length + " Modell(e) gefunden.", "ok");
		} catch (e) {
			set_status("settings-status", e.message, "error");
		}
	}

	async function save_form()
	{
		const form = read_form();

		try {
			await ai.save_settings(form);
			settings = form;
			set_status("settings-status", "Gespeichert.", "ok");
		} catch (e) {
			set_status("settings-status",
				"Speichern fehlgeschlagen: " + e.message,
				"error");
		}
	}

	/*
	 * Startup
	 */
	function bind_events()
	{
		const actions = document.querySelectorAll("[data-action]");

		for (const b of actions) {
			b.addEventListener("click", function () {
				run_action(b.dataset.action);
			});
		}
		el("btn-stop").addEventListener("click", abort_request);
		el("btn-copy").addEventListener("click", copy_result);
		el("btn-reply").addEventListener("click", open_reply);
		el("btn-replace").addEventListener("click", function () {
			write_result(ai.replace_body, "Text ersetzt.");
		});
		el("btn-insert").addEventListener("click", function () {
			write_result(ai.insert_at_cursor, "Eingefügt.");
		});
		el("btn-save").addEventListener("click", save_form);
		el("btn-test").addEventListener("click", test_connection);
		el("btn-models").addEventListener("click", test_connection);
	}

	function watch_item_changes()
	{
		const mbox = Office.context.mailbox;

		if (mbox.addHandlerAsync)
			mbox.addHandlerAsync(Office.EventType.ItemChanged,
				refresh_item);
	}

	function start()
	{
		settings = ai.load_settings();
		fill_form();
		bind_events();
		watch_item_changes();
		refresh_item();
		if (!ai.is_configured(settings)) {
			el("settings").open = true;
			return;
		}
		load_models().catch(function () {
			/* keep the saved model; errors show on "Test" */
		});
	}

	Office.onReady(function (info) {
		if (info.host === Office.HostType.Outlook)
			start();
	});
})(window.aiaddin = window.aiaddin || {});
