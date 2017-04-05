function game_client(_ws) {
	var pid;
	var client_speed = 1/30;

	var ws = _ws;
	var gs = new game_state(client_speed);
	var ih = new input_handler(ws, client_speed);

	var get_anim_frame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, 1000 / 60);
        };
	})();

	var canvas = document.getElementById('viewport');
	canvas.width = 640;
	canvas.height = 480;
	var ctx = canvas.getContext('2d');

	var paused;
	var last_time;
	function main() {
		if (paused) return;

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		//handle input
		var history = ih.pop_history();
		gs.update_history(history);

		//update game state and then render it
		frame = gs.next_frame(dt);
		render(frame);

		last_time = now;
		get_anim_frame(main);
	}

	this.init = function(args) {
		console.log('starting game client');
		
		paused = false;
		pid = args[0];
		last_time = Date.now();

		ih.init();
		gs.init(args[1]);
		main();
	}

	function render(frame) {
		//TO DO
		return;
	}
}

function input_handler(_ws, tick_rate) {
	//input variables
	var ws = _ws;
	var cmd_id = 0;
	var last_id = 0;
	var registered_cmds = [];

	//timer variables
	var tick_rate = tick_rate;
	var paused;
	function cycle() {
		if (paused) return;

		handle_input();

		window.setTimeout(cycle, tick_rate * 1000);
	}

	this.init = function() {
		paused = false;
		cycle();
	}

	function handle_input() {
		if (!document.hasFocus()) return

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
				'moves':commands,
				'mouseX':cx,
				'mouseY':cy
			}

			registered_cmds.push(move);

			cmd_id += 1;

			ws.send(JSON.stringify([window.netm.MSG_MOVE, move]));
		}
	}

	function pop_history() {
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

function game_state(client_speed) {
	//const game values
	var player_speed = 200;
	var client_speed = client_speed;

	//game state
	var game_time;
	var player;
	var entities;

	//world snapshots
	var from;
	var to;
	var interp;

	//player movement history

	this.init = function(time) {
		var game_time = time;
	}

	this.update_history = function(history) {

	}
}