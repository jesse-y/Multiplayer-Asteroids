function game_state() {
	//const game values
	var player_speed = 250;
	var client_speed;
	var world_x;
	var world_y;

	//game state
	var game_time;
	var pid;
	var col_id;
	var lives;
	var score;
	var player;
	var alive;

	//world snapshots
	var from;
	var to;
	var interp;

	//player movement history and prediction errors
	var past_moves;
	var predict_err;

	this.pid = function() {
		return pid;
	}
	this.lives = function() {
		return lives;
	}
	this.col_id = function() {
		return col_id;
	}
	this.score = function() {
		return score;
	}

	this.init = function(player_id, start_time, world) {
		console.log('initialising game state');
		pid = player_id;
		game_time = start_time;

		world_x = world.x;
		world_y = world.y;
		client_speed = 1/world.client_rate;

		this.reset();
	}

	this.reset = function() {
		player = undefined;

		from = undefined;
		to = undefined;
		interp = undefined;

		past_moves = [];

		predict_err = {
			'x':0,
			'y':0,
		}
	}

	this.extend_history = function(history) {
		if (history.length < 1) return;

		history.forEach(function (entry) {
			if (player != undefined) {
				var commands = entry.commands;

				//apply game logic to input to determine predicted player state
				commands.forEach(function (cmd) {
					apply_move(player, cmd);
				})
				apply_mouse(player, entry.mouseX, entry.mouseY);

				past_moves.push({
					'cmd_id':entry.cmd_id,
					'timestamp':game_time,
					'state':clone(player)
				})
			}
		})
	}

	function update_history() {
		//update history with prediction offset
		past_moves.forEach(function (entry) {
			entry.state.x += predict_err.x;
			entry.state.y += predict_err.y;
		})
	}

	var num_pings = 0;
	var tot_pings = 0;
	this.state_update = function(msg) {
		//window.print_msg('cbs', JSON.stringify(msg));
		window.print_msg('status', 'connected: ' + Object.keys(msg.state.entities).length + 
						 ' objects, msg length ~'+JSON.stringify(msg).length+' char');

		var snapshot = parse(msg);
		game_time = snapshot.timestamp;

		if (to == undefined) {
			//instantiate local predicted player starting position
			var sp = snapshot.state.entities[pid];
			player = new Object;
			player.x = sp.x;
			player.y = sp.y;
			player.a = sp.a;
		}

		if (snapshot.state.entities[pid].alive) {
			if (!alive) {
				//we have just respawned, reset player position
				var p = snapshot.state.entities[pid];
				player.x = p.x;
				player.y = p.y;
				player.a = p.a;
				//reset past_moves to prevent jittering on respawn
				past_moves = [];
			}
			alive = true;
		} else {
			alive = false;
		}

		if (past_moves.length != 0 && alive) {
			var last_id = snapshot.state.entities[pid].last_id;
			var curr_id = past_moves[past_moves.length - 1].cmd_id;
			var index = past_moves.length - (curr_id - last_id) - 1;
		}

		//reconcile last input only if the last id we received exists in our past_moves array		
		if (index >= 0 && index < past_moves.length && alive) {
			//window.print_msg('reconcile', 'unacked moves: '+past_moves.length);

			var client_state = past_moves[index].state;
			var server_state = snapshot.state.entities[pid];

			tot_pings += Math.round((snapshot.timestamp-past_moves[index].timestamp)*1000)
			num_pings += 1;

			//calculate prediction errors. multiply by -1 to correct errors by addition
			predict_err.x = (client_state.x - server_state.x) * -1;
			predict_err.y = (client_state.y - server_state.y) * -1;

			if (predict_err.x != 0 || predict_err.y != 0) {
				//console.log('prediction error: client=[x:'+client_state.x+',y:'+client_state.y+'], server=[x:'+server_state.x+',y:'+server_state.y+'], predict_err[x:'+predict_err.x+',y:'+predict_err.y+']')
				//apply non-zero prediction errors and update past move history to match
				player.x += predict_err.x;
				player.y += predict_err.y;
				update_history();
			}

			//window.print_msg('offset', 'current offset: x='+predict_err.x+', y='+predict_err.y);

			past_moves = past_moves.slice(index + 1);
		}

		from = clone(to);
		to = snapshot;
		interp = clone(from);
	}

	var elapsed = 1.0;
	this.next_frame = function(dt) {
		elapsed += dt;
		if (elapsed > 0.5) {
			var avg_ping = Math.round(tot_pings / num_pings);
			if (num_pings == 0) avg_ping = 0;
			window.print_msg('network', 'game time: '+Number(game_time).toFixed(2)+
							 ', fps: '+Number(1/dt).toFixed(2)+
							 ', ping: '+avg_ping+'ms');
			elapsed = 0.0;
			tot_pings = 0;
			num_pings = 0;
		}

		game_time += dt;

		//we cannot return an interpolated frame if from and to snapshots don't exist
		if (from == undefined || to == undefined) return;

		//debug prediction info
		/*
		var debug_str = 'local: [x: ' + Math.floor(player.x) + 
			', y: ' + Math.floor(player.y) + 
			', angle: ' + player.a + 
			', mouseX: ' + window.input.mouseX() + 
			', mouseY: ' + window.input.mouseY() + ']';
		window.print_msg('local_predict', debug_str);
		*/

		interp.timestamp += dt;
		var frac_t = ((interp.timestamp - from.timestamp) / (to.timestamp - from.timestamp));

		//interpolate entities
		for (var key in interp.state.entities) {
			if (to.state.entities.hasOwnProperty(key)) {
				var server_entity = interp.state.entities[key];
				var fe = from.state.entities[key];
				var te = to.state.entities[key];

				//don't render dead players
				if (te.hasOwnProperty('alive') && !te.alive) {
					server_entity.alive = false;
				}

				//tween translation
				server_entity.x = tween(fe.x, te.x, frac_t);
				server_entity.y = tween(fe.y, te.y, frac_t);

				//tween rotation
				server_entity.a = tween_rot(fe.a, te.a, frac_t);
			}
		}

		if (alive) {
			//add predicted player to the frame object
			var predicted_player = clone(player);
			predicted_player.pid = from.state.entities[pid].pid;
			interp.predicted_player = predicted_player;
		}
		//set variables for ui
		lives = from.state.entities[pid].lives;
		col_id = from.state.entities[pid].pid;
		score = from.state.entities[pid].score;

		return interp;
	}

	function tween(f, t, frac) {
		if (frac > 1.0) return t;
		return Math.round(f + ((t - f) * frac));
	}

	function tween_rot(f, t, frac) {
		if (frac > 1.0) return t;
		var diff = t - f;
		if (diff < -Math.PI) diff += 2*Math.PI;
		if (diff > Math.PI) diff -= 2*Math.PI;
		return (f + (diff * frac));
	}

	function parse(msg) {
		if (typeof msg != 'string') {
			return msg;
		} else {
			//TO DO - only use if using a custom game state representation
			return msg;
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