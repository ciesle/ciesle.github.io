(function () {
	const filesList = ["about.txt", "intro.txt"];
	const terminal = document.getElementById('terminal');
	const screen = document.getElementById('term-screen');
	const cmdEl = document.getElementById('cmd');
	const stopButton = document.getElementById('stop-command');
	const cursor = document.getElementById('terminal-cursor');
	const cursorMeasure = document.getElementById('cursor-measure');
	let composing = false;
	let yesInterval = null;
	let yesActive = false;

	function updateCursor() {
		cursorMeasure.textContent = cmdEl.value.slice(0, cmdEl.selectionStart ?? cmdEl.value.length);
		const x = cursorMeasure.getBoundingClientRect().width - cmdEl.scrollLeft;
		cursor.style.setProperty('--cursor-x', `${Math.max(0, Math.min(x, cmdEl.clientWidth - 10))}px`);
	}
	terminal.classList.add('block-cursor-ready');
	for (const event of ['input', 'keyup', 'click', 'select', 'scroll', 'focus', 'compositionend']) {
		cmdEl.addEventListener(event, () => requestAnimationFrame(updateCursor));
	}
	document.addEventListener('selectionchange', () => {
		if (document.activeElement === cmdEl) requestAnimationFrame(updateCursor);
	});

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
		d.className = 'line command-line';
		// Split prompt into: user@host : path $
		const userHost = document.createElement('span');
		userHost.className = 'prompt-user';
		userHost.textContent = 'guest@ciesle-field';
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
		if (cmd === 'pwd') { appendLine('ciesle-field (ciesle\'s homepage)'); ensureScrollBottom(); return; }
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
			stopButton.hidden = false;
			stopButton.focus({ preventScroll: true });
			appendLine('yes');
			yesInterval = setInterval(() => { appendLine('yes'); }, 300);
			return;
		}
		if (cmd === 'sl') {
			const trainLines = [];
			trainLines.push('                                                            ');
			trainLines.push('                     (  ) (@@) ( )  (@)  ()    @@    O     @     O     @      O');
			trainLines.push('                (@@@)');
			trainLines.push('            (    )');
			trainLines.push('          (@@@@)');
			trainLines.push('       (   )');
			trainLines.push('');
			trainLines.push('     ====        ________                ___________');
			trainLines.push(' _D _|  |_______/        \\__I_I_____===__|_________|');
			trainLines.push('  |(_)---  |   H\\________/ |   |        =|___ ___|      _________________');
			trainLines.push('  /     |  |   H  |  |     |   |         ||_| |_||     _|                \\_____A');
			trainLines.push(' |      |  |   H  |__--------------------| [___] |   =|                        |');
			trainLines.push(' | ________|___H__/__|_____/[][]~\\_______|       |   -|                        |');
			trainLines.push(' |/ |   |-----------I_____I [][] []  D   |=======|____|________________________|_');
			trainLines.push('__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__|__________________________|_');
			trainLines.push(' |/-=|___|=    ||    ||    ||    |_____/~\\___/          |_D__D__D_|  |_D__D__D_|');
			trainLines.push('  \\_/      \\O=====O=====O=====O_/      \\_/               \\_/   \\_/    \\_/   \\_/');
			const viewport = document.createElement('div');
			viewport.className = 'train-viewport';
			viewport.style.setProperty('--train-start', `${screen.clientWidth}px`);
			const train = document.createElement('pre');
			train.className = 'train-art';
			const width = Math.max(...trainLines.map(line => line.length));
			const wheelBase = trainLines.slice(14);
			wheelBase[2] = '  \\_/      \\__/  \\__/  \\__/  \\__/      \\_/               \\_/   \\_/    \\_/   \\_/';
			const crankPositions = [[0, 1], [-1, 0], [0, -1], [1, -1], [2, 0], [1, 1]];
			let frame = 0;
			function drawTrain() {
				const lines = trainLines.map(line => line.padEnd(width));
				// New puffs rise from the funnel, expand and drift behind the engine.
				for (let row = 0; row < 7; row++) lines[row] = ' '.repeat(width);
				const puffs = ['()', '( )', '(   )', ' . . ', ' . '];
				for (let age = frame % 3; age < 12; age += 3) {
					const row = 5 - Math.floor(age / 2);
					const x = 7 + age * 2;
					const puff = puffs[Math.min(4, Math.floor(age / 3))];
					lines[row] = lines[row].slice(0, x) + puff + lines[row].slice(x + puff.length);
				}
				for (let row = 0; row < 3; row++) lines[14 + row] = wheelBase[row].padEnd(width);
				const [dx, dy] = crankPositions[frame % crankPositions.length];
				const row = 15 + dy;
				const x = 12 + dx;
				const rod = 'O=====O=====O=====O';
				lines[row] = lines[row].slice(0, x) + rod + lines[row].slice(x + rod.length);
				train.textContent = lines.join('\n');
				frame++;
			}
			drawTrain();
			const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
			let wheelTimer = null;
			function syncTrainMotion() {
				clearInterval(wheelTimer);
				wheelTimer = reducedMotion?.matches ? null : setInterval(drawTrain, 120);
			}
			reducedMotion?.addEventListener('change', syncTrainMotion);
			syncTrainMotion();
			viewport.appendChild(train);
			screen.insertBefore(viewport, inputLine);
			train.addEventListener('animationend', () => {
				clearInterval(wheelTimer);
				reducedMotion?.removeEventListener('change', syncTrainMotion);
				viewport.remove();
				ensureScrollBottom();
			}, { once: true });
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

	function interrupt() {
		if (!yesActive) return;
		clearInterval(yesInterval);
		yesInterval = null;
		yesActive = false;
		inputLine.classList.remove('hidden');
		stopButton.hidden = true;
		appendLine('^C');
		cmdEl.focus({ preventScroll: true });
	}

	cmdEl.addEventListener('compositionstart', () => { composing = true; });
	cmdEl.addEventListener('compositionend', () => { composing = false; });
	inputLine.addEventListener('submit', e => {
		e.preventDefault();
		if (composing || yesActive) return;
		const command = cmdEl.value;
		cmdEl.value = '';
		updateCursor();
		appendExecutedCommand(command);
		execute(command);
		ensureScrollBottom();
	});
	terminal.addEventListener('keydown', e => {
		if (e.isComposing || composing) return;
		if ((e.key === 'c' || e.key === 'C') && e.ctrlKey && yesActive) {
			e.preventDefault();
			interrupt();
		}
	});
	stopButton.addEventListener('click', interrupt);

	// A tap on the terminal focuses a real input, opening the mobile keyboard.
	terminal.addEventListener('click', e => {
		if (yesActive || e.target.closest('a, button, input') || window.getSelection()?.toString()) return;
		cmdEl.focus({ preventScroll: true });
	});
	function fitViewport() {
		if (window.visualViewport) {
			document.documentElement.style.setProperty('--terminal-viewport-height', `${window.visualViewport.height}px`);
		}
		ensureScrollBottom();
	}
	window.visualViewport?.addEventListener('resize', fitViewport);
	window.addEventListener('resize', () => requestAnimationFrame(updateCursor));
	appendExecutedCommand('help');
	execute('help');
	appendExecutedCommand('ls');
	execute('ls');
	updateCursor();
	fitViewport();
	cmdEl.focus({ preventScroll: true });
})();
