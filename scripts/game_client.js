function game_client(_ws) {
	this.ws = _ws;
	//public variables
	this.pid;

	//speed at which the client will send commands
	var client_speed = 1.0 / 30;
	//speed at which snapshots are expected to arrive
	var server_speed = 1.0 / 20;
	//browser refresh rate
	var framerate = 1000 / 60;

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

		window.print_msg('GC_time', 'GC_TIME: '+dt);

		last_time = now;
		get_anim_frame(main);
	}

	function send_commands(commands) {
		if (window.input.is_down('ESCAPE')) {
			ws.close();
			return;
		}
		message = {
			'moves':commands,
			'angle':0,
			'cl_time':game_time,
		}
		send_message([window.netm.MSG_MOVE, message]);
	}

	function iterate(dt) {
		var new_ss = false;
		if (snapshots.length > 2) {
			//a new snapshot has arrived, drop old snapshot. take only the last 2
			snapshots = snapshots.slice(snapshots.length - 2);
			new_ss = true;
		}
		if (snapshots.length == 2) {
			if (new_ss || !game.exists()) {
				//we have enough snapshots to render. do not interpolate for now
				game.render(snapshots[0], snapshots[1], false);
			} else {
				console.log('new render request');
				game.iterate(dt);
			}
		}
	}

	this.state_update = function(state) {
		window.print_msg('GC', 'GC:state_update  '+JSON.stringify(state));
		var s_time = state.shift();
		//console.log('server time: '+s_time);
		this.new_snapshot(s_time, state);
	}

	this.new_snapshot = function(s_time, state) {
		snapshots.push(new Snapshot(s_time, state));
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
		if (this.ws.readyState === this.ws.CLOSED) { return }
		this.ws.send(JSON.stringify(msg));
	}
}

//-------------------------------------------------------------------//
//--WORLD SNAPSHOTS--------------------------------------------------//
//-------------------------------------------------------------------//

function Snapshot(timestamp, game_objects) {
	this.timestamp = timestamp;
	this.game_objects = game_objects;
}