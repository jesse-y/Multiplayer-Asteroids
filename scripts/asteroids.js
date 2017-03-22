//checking that script file has been found
window.print_msg('status', 'scripts loaded');

var ws;
window.CS = new connect_screen();
window.GS = new game_screen();
window.LS = new lobby_screen();

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
	this.init = function() {
		var ls_div = document.createElement('div');
		ls_div.id = 'lobby_screen';

		var ls_h1 = document.createElement('h1');
		ls_h1.appendChild(document.createTextNode('Finding Match ...'));

		var ls_table = this.create_table(
			[['new_player01'], ['new_player02'],['new_player03'],['new_player04']]
		);

		ls_div.appendChild(ls_h1);
		ls_div.appendChild(ls_table);
		document.getElementById('app').appendChild(ls_div);
	}
	this.create_table = function(users_array) {
		var table = document.createElement('table');
		table.border = '1px';
		users_array.forEach(function(entry) {
			var tr = document.createElement('tr');
			entry.forEach(function(entry) {
				var td = document.createElement('td');
				td.appendChild(document.createTextNode(entry));
				tr.appendChild(td);
			});
			table.appendChild(tr);
		});
		return table;
	}

	this.init();
}

function open_handler(e) {
	window.print_msg('status', 'connected');
	var username = document.getElementById('username_textbox').value;
	send_message(['new_user', username]);

	window.hide('connect_screen');
	window.show('lobby_screen');
}

function message_handler(e) {
	window.print_msg('status', 'got new message');
	console.log(e.data);
	//var msg = JSON.parse(e.data);
	//console.log(msg);
}

function send_message(msg) {
	ws.send(JSON.stringify(msg));
}