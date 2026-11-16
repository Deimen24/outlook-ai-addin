"use strict";

/*
 * Open WebUI API client (OpenAI-compatible endpoints).
 */
(function (ns)
{
	const NET_ERROR_MSG =
		"Server nicht erreichbar. Bitte URL, HTTPS-Zertifikat und " +
		"CORS (CORS_ALLOW_ORIGIN in Open WebUI) prüfen.";

	function auth_headers(s)
	{
		return {
			"Authorization": "Bearer " + s.api_key,
			"Content-Type": "application/json"
		};
	}

	function http_error(status)
	{
		let msg = "Serverfehler (HTTP " + status + ").";

		if (status === 401 || status === 403)
			msg = "API-Schlüssel ungültig (HTTP " + status + ").";
		else if (status === 404)
			msg = "Server-URL falsch (HTTP 404).";
		return new Error(msg);
	}

	const MIXED_MSG =
		"Das Add-in läuft über HTTPS, der Server nur über HTTP. " +
		"Outlook blockiert diese Verbindung (Mixed Content). " +
		"Open WebUI muss per HTTPS erreichbar sein.";

	async function do_fetch(url, opts)
	{
		let res;

		if (location.protocol === "https:" && url.startsWith("http:"))
			throw new Error(MIXED_MSG);
		try {
			res = await fetch(url, opts);
		} catch (e) {
			if (e.name === "AbortError")
				throw e;
			throw new Error(NET_ERROR_MSG);
		}
		if (!res.ok)
			throw http_error(res.status);
		return res;
	}

	async function list_models(s)
	{
		const res = await do_fetch(s.server_url + "/api/models",
			{ headers: auth_headers(s) });
		const json = await res.json();

		return (json.data || []).map(function (m) {
			return { id: m.id, name: m.name || m.id };
		});
	}

	function chat_request(s, prompt, stream, signal)
	{
		const body = {
			model: s.model,
			stream: stream,
			temperature: Number(s.temperature),
			messages: [
				{ role: "system", content: prompt.system },
				{ role: "user", content: prompt.user }
			]
		};

		return {
			method: "POST",
			headers: auth_headers(s),
			body: JSON.stringify(body),
			signal: signal
		};
	}

	function chunk_error(json)
	{
		const err = json.error;

		return new Error("Modellfehler: " +
			(typeof err === "string" ? err : err.message));
	}

	/*
	 * Handle one SSE line. Returns true when the stream is finished.
	 */
	function parse_sse_line(line, on_delta)
	{
		let json;

		if (!line.startsWith("data:"))
			return false;
		line = line.slice(5).trim();
		if (line === "[DONE]")
			return true;
		try {
			json = JSON.parse(line);
		} catch (e) {
			return false;
		}
		if (json.error)
			throw chunk_error(json);
		const choice = json.choices && json.choices[0];
		const delta = choice && choice.delta && choice.delta.content;
		if (delta)
			on_delta(delta);
		return false;
	}

	async function read_stream(res, on_delta)
	{
		const reader = res.body.getReader();
		const dec = new TextDecoder();
		let buf = "";

		for (;;) {
			const { done, value } = await reader.read();

			if (done)
				break;
			buf += dec.decode(value, { stream: true });
			const lines = buf.split("\n");
			buf = lines.pop();
			for (const line of lines) {
				if (parse_sse_line(line.trim(), on_delta))
					return;
			}
		}
		parse_sse_line(buf.trim(), on_delta);
	}

	async function chat_plain(s, prompt, signal, on_delta)
	{
		const url = s.server_url + "/api/chat/completions";
		const res = await do_fetch(url,
			chat_request(s, prompt, false, signal));
		const json = await res.json();

		if (json.error)
			throw chunk_error(json);
		on_delta(json.choices[0].message.content || "");
	}

	/*
	 * Stream a chat completion; falls back to a normal request if the
	 * server or client does not deliver a stream.
	 */
	async function chat(s, prompt, signal, on_delta)
	{
		const url = s.server_url + "/api/chat/completions";
		let got_text = false;
		const track = function (d) {
			got_text = true;
			on_delta(d);
		};
		const res = await do_fetch(url,
			chat_request(s, prompt, true, signal));

		if (res.body && window.TextDecoder) {
			await read_stream(res, track);
			if (got_text)
				return;
		}
		await chat_plain(s, prompt, signal, on_delta);
	}

	ns.list_models = list_models;
	ns.chat = chat;
})(window.aiaddin = window.aiaddin || {});
