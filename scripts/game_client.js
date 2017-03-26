function game_client(_ws) {
	var ws = _ws;
	//public variables
	this.pid;

	//speed at which the client will send commands
	var client_speed = 1.0 / 30;
	//speed at which snapshots are expected to arrive
	var server_speed = 1.0 / 20;
	//browser refresh rate
	var framerate = 1000 / 60

	var world_specs = {
		'x':640,
		'y':480
	}

	var game = new world(world_specs);

	//animation frame function, runs main function at the speed of framerate
	var get_anim_frame = (function(){
    return window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback){
            window.setTimeout(callback, framerate);
        };
	})();

	var paused;
	var last_time;
	var last_sent;
	var game_time;

	var snapshots = [];

	function main() {
		if (paused) { return }

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;
		game_time += dt;

		//send commands
		last_sent += dt;
		if (last_sent >= client_speed) {
			send_commands(window.input.get_commands());
			last_sent = 0;
		}

		iterate(dt);

		last_time = now;
		get_anim_frame(main);
	}

	function send_commands(commands) {
		send_message([window.netm.MSG_MOVE, commands])
	}

	function iterate(dt) {
		var new_ss = false;
		if (snapshots.length > 2) {
			//a new snapshot has arrived, drop old snapshot. take only the last 2
			snapshots = snapshots.slice(snapshots.length - 2);
			new_ss = true;
		}
		if (snapshots.length == 2) {
			if (new_ss) {
				//we have enough snapshots to render. do not interpolate for now
				game.render(snapshots[0], snapshots[1], false);
			} else {
				game.iterate(dt);
			}
		}
	}

	this.new_snapshot = function(state) {
		snapshots.push(new Snapshot(game_time, state));
	}

	this.init = function() {
		//set variables used in main
		paused = false;
		last_time = Date.now();
		last_sent = 0;
		game_time = 0;
		main();
	}

	this.reset = function () {
		paused = true;
		game.reset();
	}

	function send_message(msg) {
		ws.send(JSON.stringify(msg));
	}
}

//-------------------------------------------------------------------//
//--WORLD SNAPSHOTS--------------------------------------------------//
//-------------------------------------------------------------------//

function Snapshot(timestamp, game_objects) {
	this.timestamp = timestamp;
	this.game_objects = game_objects;
}