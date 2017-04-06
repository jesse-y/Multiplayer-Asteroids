(function () {
	var keys = {};
	var mouse = {
		x: 0,
		y:0
	};

	function setKey(event, status) {
		var code = event.keyCode;
		var key;

		switch(code) {
			case 38:
			case 87:
				key = 'UP'; break;
			case 40:
			case 83:
				key = 'DOWN'; break;
			case 37:
			case 65:
				key = 'LEFT'; break;
			case 39:
			case 68:
				key = 'RIGHT'; break;
			case 27:
				key = 'ESCAPE'; break;
			default:
				key = String.fromCharCode(code);
		}
		keys[key] = status;
	}

	document.addEventListener('keydown', function(e) {
		setKey(e, true);
	});
	document.addEventListener('keyup', function(e) {
		setKey(e, false);
	});
	document.addEventListener('blur', function () {
		keys= {};
	});
	document.addEventListener('mousemove', function(e) {
		mouse.x = e.clientX;
		mouse.y = e.clientY;
	});

	window.input = {
		is_down: function(key) {
			return keys[key.toUpperCase()];
		},
		all_keys: function() {
			return keys;
		},
		mouseX: function() {
			return mouse.x;
		},
		mouseY: function() {
			return mouse.y;
		},
		get_commands: function() {
			var commands = [];
			if (keys['UP']) {
				commands.push('UP');
			}
			if (keys['DOWN']) {
				commands.push('DOWN');
			}
			if (keys['LEFT']) {
				commands.push('LEFT');
			}
			if (keys['RIGHT']) {
				commands.push('RIGHT');
			}
			if (keys['ESCAPE']) {
				commands.push('ESCAPE');
			}
			return commands;
		}
	};
})();

function input_handler() {
	//input variables
	var ws;
	var cmd_id = 0;
	var registered_cmds = [];

	//timer variables
	var tick_rate;
	var paused;
	function cycle() {
		if (paused) return;

		handle_input();

		window.setTimeout(cycle, tick_rate * 1000);
	}

	this.init = function(_ws, _tick_rate) {
		ws = _ws;
		tick_rate = _tick_rate;
		paused = false;
		cycle();
	}

	function handle_input() {
		if (!document.hasFocus() || ws == undefined) return

		if (window.input.is_down('ESCAPE')) {
			ws.close();
			return;
		}

		var commands = window.input.get_commands();

		var rect = document.getElementById('viewport').getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		if (ws && ws.readyState === ws.OPEN) {
			var move = {
				'cmd_id':cmd_id,
				'commands':commands,
				'mouseX':cx,
				'mouseY':cy
			}

			registered_cmds.push(move);

			cmd_id += 1;
			//console.log('input last cmd_id: '+cmd_id);
			ws.send(JSON.stringify([window.netm.MSG_MOVE, move]));
		}
	}

	this.pop_history = function() {
		var result;
		if (registered_cmds.length < 1) {
			result = [];	
		} else {
			result = registered_cmds;
			registered_cmds = [];
		}
		return result;
	}

	this.stop = function() {
		paused = true;
	}
}