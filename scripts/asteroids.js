//checking that script file has been found
window.print_msg('status', 'scripts loaded');

window.CS = new connect_screen();
window.GS = new game_screen();

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
			ws.onopen = function () {
				window.print_msg('status', 'connected');
			};
			ws.onmessage = function (e) {
				window.print_msg('status', e.data);
			};
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
	}

	this.init();
}