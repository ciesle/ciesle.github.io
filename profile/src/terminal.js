(function () {
	const files = { 'about.txt': 'このページについて' };
	const directories = {
		products: { href: '/profile/contents/products.html', description: '過去の制作物' },
		awards: { href: '/profile/contents/awards.html', description: '受賞歴' },
		history: { href: '/profile/contents/history.html', description: '経歴' },
	};
	const terminal = document.getElementById('terminal');
	const introduction = `名前: ciesle(a.k.a. thistle)\n職業: 大学生\nレベル: ${terminal.dataset.level}\nTwitter: @cies1e\nGitHub: @ciesle\n所属: 東京大学工学部計数工学科\n所持資格: ネットワークスペシャリスト\n趣味: プログラミング、読書、神社巡り他`;
	const screen = document.getElementById('term-screen');
	const cmdEl = document.getElementById('cmd');
	const cursor = document.getElementById('terminal-cursor');
	const cursorMeasure = document.getElementById('cursor-measure');
	let composing = false;

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
			screen.scrollTop = screen.scrollHeight;
			requestAnimationFrame(() => { screen.scrollTop = screen.scrollHeight; });
		});
	}

	const inputLine = document.getElementById('input-line');
	function appendElement(element) {
		screen.insertBefore(element, inputLine);
		ensureScrollBottom();
	}
	function appendLine(text, headingTag) {
		const d = document.createElement('div');
		d.className = 'line';
		if (headingTag) {
			const heading = document.createElement(headingTag);
			heading.textContent = text;
			d.appendChild(heading);
		} else {
			// show empty lines visibly by using a non-breaking space
			d.textContent = text === '' ? '\u00A0' : text;
		}
		appendElement(d);
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
		appendElement(d);
	}

	async function readFile(path) {
		const response = await fetch('files/' + path);
		if (!response.ok) throw new Error('File request failed');
		return response.text();
	}

	async function catFile(name) {
		const directory = name.replace(/^\.\//, '').replace(/\/$/, '');
		if (Object.hasOwn(directories, directory) || name === '.' || name === './') {
			appendLine('cat: ' + name + ': Is a directory');
			return;
		}
		// Only allow reading declared files.
		if (!Object.hasOwn(files, name)) {
			appendLine('cat: ' + name + ': No such file or directory');
			ensureScrollBottom();
			return;
		}
		try {
			const t = await readFile(name);
			t.split('\n').forEach(line => appendLine(line));
			// make sure we scroll to bottom after async content is appended
			ensureScrollBottom();
		} catch (e) { appendLine('cat: ' + name + ': No such file or directory'); ensureScrollBottom(); }
	}

	function showHelp() {
		const commands = [
			['whoami', '私が誰か出力する'],
			['pwd', '現在の作業ページの名前を出力する'],
			['ls', '記事の名前をリスト表示する'],
			['cat <file>', 'ファイルの内容を出力する'],
			['cd <directory>', 'カレントページを指定した記事に変更する'],
			['cowsay <message>', '牛がメッセージを話す'],
			['sl', '列車が発車する'],
			['exit', 'ページの正常終了'],
			['help', 'このhelpを出力する'],
		];
		const width = Math.max(...commands.map(([command]) => command.length));
		appendLine('コマンド一覧:');
		commands.forEach(([command, description]) => {
			appendLine(`  ${command.padEnd(width)} - ${description}`);
		});
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
		if (cmd === 'whoami') {
			introduction.split('\n').forEach(line => appendLine(line));
			return;
		}
		if (cmd === 'pwd') { appendLine('ciesle-field (ciesle\'s homepage)'); ensureScrollBottom(); return; }
		if (cmd === 'ls') {
			const entries = [
				...Object.entries(files),
				...Object.entries(directories).map(([name, directory]) => [name + '/', directory.description]),
			];
			const width = Math.max(...entries.map(([name]) => name.length));
			entries.forEach(([name, description]) => appendLine(`${name.padEnd(width)} - ${description}`));
			return;
		}
		if (cmd === 'cd') {
			if (args.length > 2) { appendLine('cd: 引数が多すぎます'); return; }
			const directory = (args[1] ?? '').replace(/^\.\//, '').replace(/\/$/, '');
			if (!directory || directory === '.' || directory === '~') return;
			if (!Object.hasOwn(directories, directory)) {
				appendLine('cd: ' + args[1] + ': ディレクトリが見つかりません');
				return;
			}
			window.location.href = directories[directory].href;
			return;
		}
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
		if (cmd === 'help') { showHelp(); ensureScrollBottom(); return; }
		appendLine(cmd + ': command not found (Try running help!)'); ensureScrollBottom();
	}

	cmdEl.addEventListener('compositionstart', () => { composing = true; });
	cmdEl.addEventListener('compositionend', () => { composing = false; });
	inputLine.addEventListener('submit', e => {
		e.preventDefault();
		if (composing) return;
		const command = cmdEl.value;
		cmdEl.value = '';
		updateCursor();
		appendExecutedCommand(command);
		execute(command);
		ensureScrollBottom();
	});
	// A tap on the terminal focuses a real input, opening the mobile keyboard.
	terminal.addEventListener('click', e => {
		if (e.target.closest('a, button, input') || window.getSelection()?.toString()) return;
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
