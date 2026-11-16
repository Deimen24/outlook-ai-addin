"use strict";

/*
 * Office.js helpers: read the current item and write results back.
 */
(function (ns)
{
	/*
	 * Turn an Office callback API into a Promise.
	 * Usage: office_call(item.body, "getAsync", Office.CoercionType.Text)
	 */
	function office_call(obj, fn, ...args)
	{
		return new Promise(function (resolve, reject) {
			obj[fn](...args, function (res) {
				const ok = Office.AsyncResultStatus.Succeeded;

				if (res.status === ok)
					resolve(res.value);
				else
					reject(new Error(res.error.message));
			});
		});
	}

	function current_item()
	{
		return Office.context.mailbox.item || null;
	}

	function is_compose(item)
	{
		return typeof item.subject !== "string";
	}

	async function get_subject(item)
	{
		if (is_compose(item))
			return await office_call(item.subject, "getAsync");
		return item.subject || "";
	}

	async function read_mail(item)
	{
		const body = await office_call(item.body, "getAsync",
			Office.CoercionType.Text);
		const subject = await get_subject(item);
		const from = (!is_compose(item) && item.from) || {};

		return {
			compose: is_compose(item),
			subject: subject || "",
			from_name: from.displayName || "",
			from_addr: from.emailAddress || "",
			body: body || ""
		};
	}

	function escape_html(text)
	{
		return text.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function text_to_html(text)
	{
		return escape_html(text).replace(/\r?\n/g, "<br>");
	}

	function open_reply(item, text)
	{
		item.displayReplyForm(text_to_html(text));
	}

	/*
	 * Write text into a compose body, matching its format (HTML or
	 * plain text). fn is "setAsync" or "setSelectedDataAsync".
	 */
	async function write_body(item, fn, text)
	{
		const type = await office_call(item.body, "getTypeAsync");

		if (type === Office.CoercionType.Html)
			return office_call(item.body, fn, text_to_html(text),
				{ coercionType: Office.CoercionType.Html });
		return office_call(item.body, fn, text,
			{ coercionType: Office.CoercionType.Text });
	}

	function replace_body(item, text)
	{
		return write_body(item, "setAsync", text);
	}

	function insert_at_cursor(item, text)
	{
		return write_body(item, "setSelectedDataAsync", text);
	}

	ns.current_item = current_item;
	ns.is_compose = is_compose;
	ns.get_subject = get_subject;
	ns.read_mail = read_mail;
	ns.open_reply = open_reply;
	ns.replace_body = replace_body;
	ns.insert_at_cursor = insert_at_cursor;
})(window.aiaddin = window.aiaddin || {});
