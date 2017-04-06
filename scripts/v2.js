function game_client(_ws) {
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
		last_time = Date.now();

		var pid = args[0];
		var game_time = args[1];

		ih.init();
		gs.init(pid, game_time);
		main();
	}

	function render(frame) {
		//TO DO
		return;
	}
}

function game_state(client_speed) {
	//const game values
	var player_speed = 200;
	var client_speed = 1/30;
	var world_x = 640;
	var world_y = 480;

	//game state
	var game_time;
	var pid;
	var players;
	var entities;

	//world snapshots
	var from;
	var to;
	var interp;

	//player movement history
	var past_moves;

	this.init = function(player_id, start_time) {
		pid = player_id;
		game_time = start_time;

		reset();
	}

	function reset() {
		player = {
			'x':0,
			'y':0,
			'a':0
		}
		entities = [];

		from = undefined;
		to = undefined;
		interp = undefined;

		past_moves = [];
	}

	this.update_history = function(history) {
		if (history.length < 1) return;

		history.forEach(function (entry) {
			var commands = entry.commands;

			commands.forEach(function (cmd) {
				apply_move(players[pid], cmd);
			})
			apply_mouse(player, entry.mouseX, entry.mouseY);

			past_moves.push({
				'cmd_id':entry.cmd_id,
				'timestamp':game_time,
				'state':clone(player)
			})
		})
	}

	this.state_update = function(msg) {
		var snapshot = parse(msg)
	}

	function parse(msg) {
		
	}

	function apply_move(obj, move) {
		var dist = Math.floor(player_speed * client_speed);
		if (move == 'UP')    obj.y -= dist;
		if (move == 'DOWN')  obj.y += dist;
		if (move == 'LEFT')  obj.x -= dist;
		if (move == 'RIGHT') obj.x += dist;

		if (obj.x < 0)       obj.x = 0;
		if (obj.x > world_x) obj.x = world_x;
		if (obj.y < 0)       obj.y = 0;
		if (obj.y > world_y) obj.y = world_y;
	}

	function apply_mouse(obj, mx, my) {
		obj.a = Math.atan2((mx-obj.x), (my-obj.y));
	}

	function clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
}