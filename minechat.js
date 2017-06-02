#!/usr/bin/env node

var readline = require('readline');
var mineflayer = require('mineflayer');
var ansicolors = require('ansicolors');

var colorizers = {
	black: ansicolors.brightBlack,
	dark_blue: ansicolors.blue,
	dark_green: ansicolors.green,
	dark_aqua: ansicolors.cyan,
	dark_red: ansicolors.red,
	dark_purple: ansicolors.magenta,
	gold: ansicolors.yellow,
	gray: ansicolors.brightBlack,
	dark_gray: ansicolors.brightBlack,
	blue: ansicolors.brightBlue,
	green: ansicolors.brightGreen,
	aqua: ansicolors.brightCyan,
	red: ansicolors.brightRed,
	light_purple: ansicolors.brightMagenta,
	yellow: ansicolors.brightYellow,
	white: ansicolors.brightWhite,
	reset: ansicolors.white,
};

function print_help() {
	console.log("usage: [PASSWORD=<password>] node minechat.js <hostname>[:port] <user>");
}

if (process.argv.length < 4) {
	console.log("Too few arguments!");
	print_help();
	process.exit(1);
}

process.argv.forEach(function(val, index, array) {
	if (val == "-h") {
		print_help();
		process.exit(0);
	}
});

var options = {
	username: process.argv[3],
	password: process.env.PASSWORD,
};

var host = process.argv[2];

if (host.indexOf(':') != -1) {
	options.host = host.substring(0, host.indexOf(':'));
	options.port = host.substring(host.indexOf(':')+1);
} else {
	options.host = host;
}

console.log("connecting to " + host);
console.log("user: " + options.username);
if (options.password) {
	console.log("using provided password");
} else {
	console.log("no password provided");
}

var bot = mineflayer.createBot(options);

bot.once('game', function () {
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: process.stdout.isTTY
	});

	rl.on('line', function(line) {
		bot.chat(line);
		rl.prompt();
	});

	rl.on('close', function() {
		rl.output.write('\nClosing connection...\n');
		bot.quit();
	});

	bot.on('message', function(message) {
		readlineOutput(rl, renderMessage(message) + '\n');
	});

	rl.prompt();
});

function onServerEnd(reason) {
	process.stdout.write('\nConnection closed.\n');
	if (reason) {
		process.stdout.write(reason + '\n');
	}
	process.exit(0);
}

bot.on('kicked', function(reason) {
	onServerEnd(renderMessage(JSON.parse(reason)));
});

bot.on('error', function(err) {
	onServerEnd(String(err));
});

// `end` is emitted before `kicked`! We wait a bit, in case a kick is coming right
// after that. If one doesn't, we'll exit anyway.
bot.on('end', function(reason) {
	setTimeout(onServerEnd.bind(null, reason), 100);
});

// This function erases the current readline "entry area" from the screen,
// so that it can be overwritten with output. Works even if the current
// "line" spans several terminal rows.
//
// The cursor is left in the leftmost screen column, in the row where the
// prompt previously stood.
//
// This is all done using some code copied from `readline.js`, and accessing
// an undocumented `prevRows` property. In other words, expect breakage if
// `readline.js` changes significantly.
function readlineErase(rl) {
	var prevRows = rl.prevRows || 0;
	if (prevRows > 0) {
		readline.moveCursor(rl.output, 0, -prevRows);
	}

	// convince readline that it won't need to go upwards before prompting
	rl.prevRows = 0;

	// move to leftmost column
	readline.cursorTo(rl.output, 0);

	// clear bottom of screen
	readline.clearScreenDown(rl.output);
}

// Outputs one or more rows of text (should end in a newline) to
// readline's output. The readline prompt and current entry are saved
// and restored so that new rows appear to be inserted above the prompt.
function readlineOutput(rl, text) {
	readlineErase(rl);

	rl.output.write(text);

	rl.prompt(/*preserveCursor*/true);
}

// Turns a Minecraft JSON chat message into an ANSI-colored string
function renderMessage(message) {
	if (typeof message === 'string') {
		return message;
	}
	if (message.translate) {
		var args = message.with || [];
		// FIXME we should have a table of translations
		return colorizers.red(message.translate + '(' + args.map(renderMessage).join(',') + ')');
	}
	var colorizer = colorizers[message.color] || function(t) { return t };
	var extras = message.extra ? message.extra.map(renderMessage).join('') : '';
	var text = message.text + extras;
	if (message.clickEvent && message.clickEvent.action === 'open_url') {
		text = '[' + text + '](' + message.clickEvent.value + ')';
	}
	return colorizer(text);
}
