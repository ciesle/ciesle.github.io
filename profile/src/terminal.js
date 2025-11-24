(function () {
	const filesList = ["about.txt", "intro.txt"];
	const terminal = document.getElementById('terminal');
	const screen = document.getElementById('term-screen');
	const cmdEl = document.getElementById('cmd');
	const promptStr = 'guest@ciesle-farm:~$';
	let buffer = '';
	let yesInterval = null;
	let yesActive = false;

	// prefer scrolling the profile main container so the terminal area (under header) scrolls
	function ensureScrollBottom() {
		requestAnimationFrame(() => {
			if (screen) {
				screen.scrollTop = screen.scrollHeight;
				requestAnimationFrame(() => { screen.scrollTop = screen.scrollHeight; });
			} else {
				let element = document.documentElement;
				let bottom = element.scrollHeight - element.clientHeight;
				window.scroll(0, bottom + 50);
			}
		});
	}

	const inputLine = document.getElementById('input-line');
	function appendLine(text, options = {}) {
		const d = document.createElement('div');
		d.className = 'line';
		if (options.html) {
			d.innerHTML = options.html;
		} else {
			// show empty lines visibly by using a non-breaking space
			if (text === '') d.textContent = '\u00A0';
			else d.textContent = text;
		}
		if (inputLine && inputLine.parentNode === screen) screen.insertBefore(d, inputLine);
		else screen.appendChild(d);
		ensureScrollBottom();
	}

	function appendExecutedCommand(cmdText) {
		const d = document.createElement('div');
		d.className = 'line';
		// Split prompt into: user@host : path $
		const userHost = document.createElement('span');
		userHost.className = 'prompt-user';
		userHost.textContent = 'guest@ciesle-farm';
		const colon = document.createElement('span');
		colon.className = 'prompt-colon';
		colon.textContent = ':';
		const path = document.createElement('span');
		path.className = 'prompt-path';
		path.textContent = '~';
		const dollar = document.createElement('span');
		dollar.className = 'prompt-dollar';
		dollar.textContent = '$ ';
		const c = document.createElement('span');
		c.className = 'cmd';
		c.textContent = cmdText;
		d.appendChild(userHost);
		d.appendChild(colon);
		d.appendChild(path);
		d.appendChild(dollar);
		d.appendChild(c);
		if (inputLine && inputLine.parentNode === screen) screen.insertBefore(d, inputLine);
		else screen.appendChild(d);
		ensureScrollBottom();
	}

	async function history() {
		try {
			const r = await fetch('files/history.txt');
			if (!r.ok) { appendLine('Some error has occured'); ensureScrollBottom(); return; }
			const t = await r.text();
			const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			t.split('\n').forEach(line => {
				if (line.startsWith('# ')) {
					appendLine('', { html: '<h3>' + escapeHtml(line.slice(2)) + '</h3>' });
				} else if (line.startsWith('## ')) {
					appendLine('', { html: '<h4>' + escapeHtml(line.slice(3)) + '</h4>' });
				} else {
					appendLine(line);
				}
			});
			// make sure we scroll to bottom after async content is appended
			ensureScrollBottom();
		} catch (e) { appendLine('Some error has occured'); ensureScrollBottom(); }
	}

	async function catFile(name) {
		// only allow reading files that are declared in filesList
		if (!filesList.includes(name)) {
			appendLine('cat: ' + name + ': No such file or directory');
			ensureScrollBottom();
			return;
		}
		try {
			const r = await fetch('files/' + name);
			if (!r.ok) { appendLine('cat: ' + name + ': No such file or directory'); ensureScrollBottom(); return; }
			const t = await r.text();
			t.split('\n').forEach(line => appendLine(line));
			// make sure we scroll to bottom after async content is appended
			ensureScrollBottom();
		} catch (e) { appendLine('cat: ' + name + ': No such file or directory'); ensureScrollBottom(); }
	}

	function showHelp() {
		appendLine('Commands:');
		appendLine('  whoami  - show the current user');
		appendLine('  pwd     - print working directory');
		appendLine('  ls      - list files');
		appendLine('  cat <file> - show contents of a file');
		appendLine('  cowsay <message> - make a cow say something');
		appendLine('  sl      - show a train');
		appendLine('  history - show history');
		appendLine('  yes     - say yes');
		appendLine('  exit    - return to homepage');
		appendLine('  help    - show this help');
		appendLine('  man     - show this manual');
	}

	function cowsay(message) {
		if (!message) {
			message = 'moo';
		}
		const len = message.length;
		const border = '-'.repeat(len + 2);
		appendLine(' ' + border);
		appendLine('< ' + message + ' >');
		appendLine(' ' + border);
		appendLine('        \\   ^__^');
		appendLine('         \\  (oo)\\_______');
		appendLine('            (__)\\       )\\/\\');
		appendLine('                ||----w |');
		appendLine('                ||     ||');
		ensureScrollBottom();
	}

	function execute(input) {
		const args = input.trim().split(/\s+/).filter(Boolean);
		if (args.length === 0) return;
		const cmd = args[0];
		if (cmd === 'whoami') { appendLine('ciesle(a.k.a. thistle)'); ensureScrollBottom(); return; }
		if (cmd === 'pwd') { appendLine('ciesle-farm (ciesle\'s homepage)'); ensureScrollBottom(); return; }
		if (cmd === 'ls') { filesList.forEach(f => appendLine(f)); ensureScrollBottom(); return; }
		if (cmd === 'cat') {
			if (args.length < 2) { appendLine('cat: missing operand'); ensureScrollBottom(); return; }
			catFile(args[1]);
			return;
		}
		if (cmd === 'cowsay') {
			const message = args.slice(1).join(' ');
			cowsay(message);
			return;
		}
		if (cmd === 'history') { history(); return; }
		if (cmd === 'yes') {
			if (yesActive) { return; }
			yesActive = true;
			inputLine.classList.add('hidden');
			appendLine('yes');
			yesInterval = setInterval(() => { appendLine('yes'); }, 300);
			return;
		}
		if (cmd === 'sl') {
			appendLine('                                                            ');
			appendLine('                     (  ) (@@) ( )  (@)  ()    @@    O     @     O     @      O');
			appendLine('                (@@@)');
			appendLine('            (    )');
			appendLine('          (@@@@)');
			appendLine('       (   )');
			appendLine('');
			appendLine('     ====        ________                ___________');
			appendLine(' _D _|  |_______/        \\__I_I_____===__|_________|');
			appendLine('  |(_)---  |   H\\________/ |   |        =|___ ___|      _________________');
			appendLine('  /     |  |   H  |  |     |   |         ||_| |_||     _|                \\_____A');
			appendLine(' |      |  |   H  |__--------------------| [___] |   =|                        |');
			appendLine(' | ________|___H__/__|_____/[][]~\\_______|       |   -|                        |');
			appendLine(' |/ |   |-----------I_____I [][] []  D   |=======|____|________________________|_');
			appendLine('__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__|__________________________|_');
			appendLine(' |/-=|___|=    ||    ||    ||    |_____/~\\___/          |_D__D__D_|  |_D__D__D_|');
			appendLine('  \\_/      \\O=====O=====O=====O_/      \\_/               \\_/   \\_/    \\_/   \\_/');
			ensureScrollBottom();
			return;
		}
		if (cmd === 'exit') {
			appendLine('exiting...');
			ensureScrollBottom();
			setTimeout(() => { window.location.href = '../index.html'; }, 150);
			return;
		}
		if (cmd === 'help' || cmd === 'man') { showHelp(); ensureScrollBottom(); return; }
		appendLine(cmd + ': command not found (Try running help!)'); ensureScrollBottom();
	}

	function update() { cmdEl.textContent = buffer; }

	terminal.addEventListener('keydown', function (e) {
		// detect Ctrl+C to interrupt running 'yes' command
		if ((e.key === 'c' || e.key === 'C') && e.ctrlKey) {
			if (yesActive) {
				clearInterval(yesInterval);
				yesInterval = null;
				yesActive = false;
				inputLine.classList.remove('hidden');
				appendLine('^C');
				ensureScrollBottom();
				e.preventDefault();
				return;
			}
		}
		if (!yesInterval) {
			if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { buffer += e.key; update(); e.preventDefault(); }
			if (e.key === 'Backspace') { buffer = buffer.slice(0, -1); update(); e.preventDefault(); }
			if (e.key === 'Enter') { appendExecutedCommand(buffer); execute(buffer); buffer = ''; update(); e.preventDefault(); }
		}
		ensureScrollBottom();
	});

	// clicking focuses terminal so keyboard events are captured
	terminal.addEventListener('click', () => terminal.focus());
	// initial focus
	setTimeout(() => terminal.focus(), 200);
})();
