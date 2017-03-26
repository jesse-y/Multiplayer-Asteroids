//checking that script file has been found
window.print_msg('status', 'scripts loaded');

//network message codes and regex to identify them
var check_nm = new RegExp('^nm[0-9]{2}$', 'i');

var username = '';
var ws;
window.CS = new connect_screen();
window.GS = new game_screen();
window.LS = new lobby_screen();
window.GC = new game_client(ws)

function connect_screen() {
	this.init = function() {
		var cs_div = document.createElement('div');
		cs_div.id = 'connect_screen';

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
				ws_url = 'ws://hawkleon.com:8008/connect';
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
				window.show('connect_screen');
			};
		});

		var cs_checkbox = document.createElement('input');
		cs_checkbox.id = 'local_checkbox';
		cs_checkbox.type = 'checkbox';
		cs_checkbox.checked = true;

		cs_div.appendChild(cs_textbox);
		cs_div.appendChild(cs_button);
		cs_div.appendChild(cs_checkbox);
		cs_div.appendChild(document.createTextNode('Local'));

		document.getElementById('app').appendChild(cs_div);
	};

	this.init();
}

function game_screen() {
	this.init = function() {
		var gs_canvas = document.createElement('canvas');
		gs_canvas.id = 'viewport';

		document.getElementById('app').appendChild(gs_canvas);
	};

	this.init();
}

function lobby_screen() {
	var ls_table_id = 'lobby_table';
	var uid_list = [];
	var usernames_dict = {};
	this.init = function() {
		var ls_div = document.createElement('div');
		ls_div.id = 'lobby_screen';

		var ls_h1 = document.createElement('h1');
		ls_h1.appendChild(document.createTextNode('Finding Match ...'));

		var ls_table = this.create_table(uid_list);
		ls_table.id = ls_table_id;

		ls_div.appendChild(ls_h1);
		ls_div.appendChild(ls_table);
		document.getElementById('app').appendChild(ls_div);
	}
	this.create_table = function(uid_list) {
		var table = document.createElement('table');

		table.border = '1px';
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
			var username = input[i+1];
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

function open_handler(e) {
	window.print_msg('status', 'connected');

	username = document.getElementById('username_textbox').value;
	send_message([window.netm.MSG_JOIN, username]);

	window.hide('connect_screen');
	window.show('lobby_screen');
}

function message_handler(e) {
	window.print_msg('status', 'got new message: '+ e.data);
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
				window.GC.pid = msg[1];
				window.GC.init();
				break;
			case window.netm.MSG_G_STATE:
				window.GC.state_update(msg.slice(1));
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