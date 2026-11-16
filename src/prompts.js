"use strict";

/*
 * Prompt builders. Edit the texts here to change how the model behaves.
 * Every builder returns { system, user }.
 */
(function (ns)
{
	const SYSTEM_PROMPT =
		"You are an email assistant inside Microsoft Outlook. " +
		"Be accurate and concise. Never invent facts that are not " +
		"in the email. Reply with only the requested output, " +
		"no preamble.";

	const TASKS = {
		summarize: function () {
			return "Summarize this email in 3-6 bullet " +
				"points. Then list action items and " +
				"deadlines under the heading 'Action " +
				"items:' (write 'None' if there are " +
				"none). Write in the language of the " +
				"email.";
		},
		reply: function () {
			return "Write a reply to this email in the same " +
				"language as the email. Match its level of " +
				"formality. Do not include a subject line.";
		},
		translate: function (o) {
			return "Translate this email into " + o.target_lang +
				". Keep the formatting.";
		},
		ask: function (o) {
			return "Answer this question about the email: " +
				o.question;
		},
		improve: function () {
			return "Rewrite this draft for clarity and " +
				"correct grammar. Keep the same language, " +
				"meaning and approximate length.";
		},
		shorten: function () {
			return "Rewrite this draft to be as concise as " +
				"possible without losing information.";
		},
		tone: function (o) {
			return "Rewrite this draft in a " + o.tone +
				" tone. Keep the same language and meaning.";
		},
		custom: function (o) {
			return o.instruction;
		}
	};

	function read_message(mail, task)
	{
		return "Subject: " + mail.subject + "\n" +
			"From: " + mail.from_name +
			" <" + mail.from_addr + ">\n" +
			"\n" + mail.body + "\n\n---\nTask: " + task;
	}

	function compose_message(mail, task)
	{
		return "Subject: " + mail.subject + "\n\n" +
			"Draft:\n" + mail.body + "\n\n---\nTask: " + task;
	}

	function build_prompt(action, mail, opts)
	{
		const task = TASKS[action](opts);
		const user = mail.compose ? compose_message(mail, task) :
			read_message(mail, task);

		return { system: SYSTEM_PROMPT, user: user };
	}

	ns.build_prompt = build_prompt;
})(window.aiaddin = window.aiaddin || {});
