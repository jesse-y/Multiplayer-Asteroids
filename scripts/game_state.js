function game_state(client_speed) {
	//const game values
	var player_speed = 200;
	var client_speed = 1/30;
	var world_x = 640;
	var world_y = 480;

	//game state
	var game_time;
	var pid;
	var player;

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
		player = new Object;

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
				apply_move(player, cmd);
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
		var snapshot = parse(msg);
		game_time = snapshot.timestamp;

		if (to == undefined) {
			//instantiate local predicted player starting position
			var sp = snapshot.state.players[pid].state;
			player.x = sp.x;
			player.y = sp.y;
			player.a = sp.a;
		}

		if (past_moves.length != 0) {
			var last_id = snapshot.state.players[pid].last_id;
			var curr_id = past_moves[past_moves.length - 1].cmd_id;
			var index = past_moves.length - (curr_id - last_id) - 1;
		}

		//reconcile last input only if the last id we received exists in our past_moves array		
		if (last_id && curr_id && index >= 0) {
			window.print_msg('reconcile', 'unacked moves: '+past_moves.length);

			//console.log('index='+index+', last_id='+last_id+', curr_id='+curr_id+', length='+past_moves.length);
			var client_state = past_moves[index].state;
			var server_state = snapshot.state.players[pid].state;

			var ox = client_state.x - server_state.x;
			var oy = client_state.y - server_state.y;

			//handle incorrect predictions
			if (ox != 0 || oy != 0) {
				player.x = server_state.x;
				player.y = server_state.y;
			}

			window.print_msg('offset', 'current offset: x='+ox+', y='+oy);

			past_moves = past_moves.slice(index + 1);
		}

		from = clone(to);
		to = snapshot;
		interp = clone(from);
	}

	this.next_frame = function(dt) {
		game_time += dt;

		//we cannot return an interpolated frame if from and to snapshots don't exist
		if (from == undefined || to == undefined) return;

		interp.timestamp += dt;
		var frac_t = ((interp.timestamp - from.timestamp) / (to.timestamp - from.timestamp));

		//debug prediction info
		var debug_str = 'local: [x: ' + Math.floor(player.x) + 
			', y: ' + Math.floor(player.y) + 
			', angle: ' + player.a + 
			', mouseX: ' + window.input.mouseX() + 
			', mouseY: ' + window.input.mouseY() + ']';
		window.print_msg('local_predict', debug_str);

		//interpolate players
		for (var key in interp.state.players) {
			if (to.state.players.hasOwnProperty(key)) {
				//get player if it exists in both from and to
				var server_player = interp.state.players[key].state;
				fp = from.state.players[key].state;
				tp = to.state.players[key].state;

				//tween translation
				server_player.x = fp.x + ((tp.x-fp.x) * frac_t);
				server_player.y = fp.y + ((tp.y-fp.y) * frac_t);

				//tween rotation
				var adiff = (tp.a-fp.a);
				if (adiff < -Math.PI) adiff += 2*Math.PI;
				if (adiff > Math.PI) adiff -= 2*Math.PI;

				server_player.a = fp.a + (adiff * frac_t);
			}
		}
		//add predicted player to the frame object
		var predicted_player = player;
		predicted_player.pid = pid;
		interp.predicted_player = predicted_player;

		//TO DO: check collisions and update animations

		return interp;
	}

	function parse(msg) {
		if (typeof msg != 'string') {
			return msg;
		} else {
			//TO DO - only use if using a custom game state representation
			return;
		}
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
		if (obj != undefined) {
			return JSON.parse(JSON.stringify(obj));
		}
	}
}