//checking that script file has been found
window.print_msg('status', 'scripts loaded');

//network message codes and regex to identify them
var check_nm = new RegExp('^nm[0-9]{2}$', 'i');

var username = '';
var ws;
window.CS = new connect_screen();
window.GS = new game_screen();
window.LS = new lobby_screen();
window.GC = new game_client();
window.GO = new game_over_screen();

function connect_screen() {
	this.init = function() {
		var cs_div = document.createElement('div');
		cs_div.id = 'connect_screen';

		var cs_title = document.createElement('span');
		cs_title.id = 'title_span';
		cs_title.appendChild(document.createTextNode('ASTEROIDS'));

		var cs_textbox = document.createElement('input');
		cs_textbox.id = 'username_textbox';
		cs_textbox.type = 'text';
		cs_textbox.value = 'new_player';
		cs_textbox.addEventListener('click', function(e) {
			e.target.setSelectionRange(0,e.target.value.length);
		});

		var cs_button = document.createElement('button');
		cs_button.id = 'connect_button';
		cs_button.appendChild(document.createTextNode('Connect'));
		cs_button.addEventListener('click', function (e) {
			window.print_msg('status', 'connecting ...');
			var ws_url;
			if (document.getElementById('local_checkbox').checked) {
				ws_url = 'ws://localhost:8080/connect';
			} else {
				ws_url = 'ws://asteroids.hawkleon.com/connect';
			}
			ws = new WebSocket(ws_url);
			ws.onopen = open_handler;
			ws.onmessage = message_handler;
			ws.onerror = function (e) {
				window.print_msg('status', e.message);
			};
			ws.onclose = function (e) {
				window.print_msg('status', 'disconnected');
				window.GC.reset_screen();
				window.LS.reset();
				window.hide('lobby_screen');
				window.show('connect_screen');
				window.hide('game_over_screen');
			};
		});

		var cs_checkbox = document.createElement('input');
		cs_checkbox.id = 'local_checkbox';
		cs_checkbox.type = 'checkbox';
		cs_checkbox.checked = false;
		cs_checkbox.style.display = 'none';

		var local_span = document.createElement('span');
		local_span.id = 'local_span';
		local_span.appendChild(document.createTextNode('LOCAL'));
		local_span.style.display = 'none';

		cs_div.appendChild(cs_title);
		cs_div.appendChild(cs_textbox);
		cs_div.appendChild(cs_button);
		cs_div.appendChild(cs_checkbox);
		cs_div.appendChild(local_span);

		document.getElementById('app').appendChild(cs_div);
	};

	this.init();
}

function game_screen() {
	this.init = function() {
		var txt_load = document.createElement('div');
		txt_load.id = 'font_load';
		txt_load.appendChild(document.createTextNode('sample text'));

		var gs_canvas = document.createElement('canvas');
		gs_canvas.id = 'viewport';

		var app = document.getElementById('app');
		app.appendChild(txt_load);
		app.appendChild(gs_canvas);
	};

	this.init();
}

function lobby_screen() {
	const padding = '                    ';

	var ls_table_id = 'lobby_table';
	var uid_list = [];
	var usernames_dict = {};
	this.init = function() {
		var ls_div = document.createElement('div');
		ls_div.id = 'lobby_screen';

		var ls_h1 = document.createElement('h1');
		ls_h1.appendChild(document.createTextNode('Finding Match'));

		var ls_table = this.create_table(uid_list);
		ls_table.id = ls_table_id;

		ls_div.appendChild(ls_h1);
		ls_div.appendChild(ls_table);
		document.getElementById('app').appendChild(ls_div);
	}
	this.create_table = function(uid_list) {
		var table = document.createElement('table');

		uid_list.forEach(function(entry) {
			var tr = document.createElement('tr');
			var td = document.createElement('td');
			td.appendChild(document.createTextNode(usernames_dict[entry]));
			tr.appendChild(td);
			table.appendChild(tr);
		});
		return table;
	}
	this.update_table = function() {
		var table = this.create_table(uid_list);
		table.id = ls_table_id;

		document.getElementById('lobby_screen').replaceChild(
			table, 
			document.getElementById(ls_table_id)
		);
	}
	this.add_user = function(input) {
		for (var i = 0; i < input.length; i += 2) {
			var uid = input[i];
			var username = (input[i+1] + padding).slice(0,20);
			if (usernames_dict.hasOwnProperty(uid)) {
				console.log('add_user function failed, key already exists: ' + uid);
				continue;
			} else {
				uid_list.push(uid);
				usernames_dict[uid] = username;
			}
		}
		this.update_table();
	}
	this.del_user = function(uid) {
		var index = uid_list.indexOf(uid);
		uid_list.splice(index, 1);
		delete usernames_dict[uid];
		this.update_table();
	}
	this.reset = function() {
		uid_list = [];
		usernames_dict = {};
		this.update_table();
	}

	this.init();
}

function game_over_screen() {
	this.init = function() {
		var gos_div = document.createElement('div');
		gos_div.id = 'game_over_screen';

		var gos_quit_button = document.createElement('button');
		gos_quit_button.id = 'gos_btn_quit';
		gos_quit_button.appendChild(document.createTextNode('QUIT'));
		gos_quit_button.addEventListener('click', function (e) {
			if (ws) {
				ws.close();
				ws = null;
			}
			window.print_msg('status', 'disconnected');
			window.GC.reset_screen();
			window.LS.reset();
			window.hide('lobby_screen');
			window.show('connect_screen');
			window.hide('game_over_screen');
		});

		var gos_replay_button = document.createElement('button');
		gos_replay_button.id = 'gos_btn_replay';
		gos_replay_button.appendChild(document.createTextNode('REPLAY'));
		gos_replay_button.addEventListener('click', function (e) {
			send_message([window.netm.MSG_RESTART]);
			window.hide('game_over_screen');
			window.LS.reset();
			window.show('lobby_screen');
			window.GC.reset_screen();
		})

		gos_div.appendChild(gos_quit_button);
		gos_div.appendChild(gos_replay_button);

		document.getElementById('app').appendChild(gos_div);
	}

	this.init();
}

function open_handler(e) {
	window.print_msg('status', 'connected');

	username = document.getElementById('username_textbox').value;
	send_message([window.netm.MSG_JOIN, username]);

	window.hide('connect_screen');
	window.show('lobby_screen');
}

function message_handler(e) {
	//window.print_msg('status', 'got new message: '+ e.data);
	var msg;

	try { msg = JSON.parse(e.data) }
	catch (except) { /*console.log(except.message, except.stack, e.data); */return; }

	var nm = msg[0];
	if (check_nm.test(nm)) {
		switch (String(nm)) {
			case window.netm.MSG_JOIN:
				window.LS.add_user(msg.slice(1));
				break;
			case window.netm.MSG_QUIT:
				window.LS.del_user(msg[1]);
				break;
			case window.netm.MSG_START:
				window.hide('lobby_screen');
				window.LS.reset();
				window.GC.init(ws, msg.slice(1));
				break;
			case window.netm.MSG_G_STATE:
				window.GC.state_update(msg[1]);
				break;
			case window.netm.MSG_GAMEOVER:
				window.GC.game_over(msg.slice(1));
				window.show('game_over_screen');
				break;
			case window.netm.MSG_STOP_GAME:
				window.GC.stop_game();
				break;
			default:
				console.log('failed to recognise nm code: '+msg); break;
		}
	} else {
		console.log('var "nm" is not a network code: ' + msg)
	}
}

function send_message(msg) {
	ws.send(JSON.stringify(msg));
}