function game_client (ws) {
	this.ws = ws;
	var pid;

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

	//create and instantiate canvas object
	var canvas = document.getElementById('viewport')
	canvas.width = 640;
	canvas.height = 480;
	var ctx = canvas.getContext('2d');

	var player_speed = 200;
	var client_speed = 1/30;

	var player = {
		x: 0,
		y: 0,
		a: 0
	}

	var prediction_offset = {
		'x':0,
		'y':0
	}

	var vector_map = {
		'UP'   : [0,-1],
		'DOWN' : [0,1],
		'LEFT' : [-1, 0],
		'RIGHT': [1, 0]
	}

	var colours = ['#2176ff', '#379e3a', '#efe639', '#f7411d', '#c130e5'];

	var registered_cmds = [];

	var game_time;
	var cmd_id;
	var last_id;
	var received_ids;

	var interp_frame;

	var last_time;
	var send_switch;
	var paused;

	this.init = function(args) {
		console.log('starting game client');
		paused = false;
		pid = args[0];
		last_time = Date.now();
		game_time = args[1];
		cmd_id = 0;
		send_switch = 0;
		main();
	}

	function main() {
		if (paused) return;

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		window.print_msg('GC', 'GC==> framerate='+Math.floor(1/dt));

		send_switch += 1;
		if (send_switch % 2 == 0) update(dt);

		interpolate(dt);

		last_time = now;
		game_time += dt;
		get_anim_frame(main);
	}

	function update(dt) {
		if (!document.hasFocus() || (from == undefined || to == undefined)) return
			
		if (window.input.is_down('ESCAPE')) {
			this.ws.close();
			return;
		}
		var commands = window.input.get_commands();

		var rect = canvas.getBoundingClientRect();
		cx = window.input.mouseX() - rect.left;
		cy = window.input.mouseY() - rect.top;

		var new_angle = Math.atan2((cx-player.x), (cy-player.y));
		player.a = new_angle;

		if (player.x < 0) { player.x = 0 }
		if (player.x > 640) { player.x = 640 }
		if (player.y < 0) { player.y = 0}
		if (player.y > 480) { player.y = 480}
		
		if (this.ws && this.ws.readyState === this.ws.OPEN) {
			var move = {
				'cmd_id':cmd_id,
				'moves':commands,
				'mouseX':cx,
				'mouseY':cy
			}

			commands.forEach(function (cmd) {
				apply_move(player, cmd);
			});

			registered_cmds.push({
				'cmd_id':cmd_id,
				'timestamp': game_time,
				'state': clone(player)
			})

			//console.log('sending prediction: '+cmd_id+', x:'+player.x+', y'+player.y);
			cmd_id+=1;
			this.ws.send(JSON.stringify([window.netm.MSG_MOVE, move]));
		}
	}

	function interpolate(dt) {
		//render background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		//return if something went wrong
		if (from == undefined || to == undefined) return
		//if this is the first frame we have to render
		if (interp_frame == undefined) {
			console.log('INTERP FRAME NOT DEFINED');
			render(to);
		} else {
			//get interpolated frame timestamp fraction
			interp_frame.timestamp += dt;
			var frac_t = ((interp_frame.timestamp - from.timestamp) / (to.timestamp - from.timestamp));

			//render predicted player
			render_ship(pid, player, false);

			//print prediction info
			var debug_str = 'local: [x: ' + Math.floor(player.x) + 
			', y: ' + Math.floor(player.y) + 
			', angle: ' + player.a + 
			', mouseX: ' + window.input.mouseX() + 
			', mouseY: ' + window.input.mouseY() + ']';
			window.print_msg('local_predict', debug_str);

			//interpolate the position of each player and render it
			for (var key in interp_frame.state.players) {
				if (to.state.players.hasOwnProperty(key)) {
					var server_player = interp_frame.state.players[key].state;
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

					render_ship(key, server_player, true);
				}
			}
			//render(interp_frame);
		}
	}

	function render(ss) {
		//render background
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		//render all players
		for (var key in ss.state.players) {
			var player = ss.state.players[key];
			render_ship(player.pid, player.state, true);
		}
	}

	function render_ship(_pid, state, debug) {
		var debug_str = 'server: [x: ' + Math.floor(state.x) + 
		', y: ' + Math.floor(state.y) + 
		', angle: ' + state.a + 
		', mouseX: ' + window.input.mouseX() + 
		', mouseY: ' + window.input.mouseY() + ']';
		window.print_msg('render_ship', debug_str);

		px = 50 * Math.sin(state.a);
		py = 50 * Math.cos(state.a);

		ctx.save();
		ctx.translate(state.x, state.y);

		//aiming line
		/*ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(px, py);
		ctx.stroke();*/

		ctx.rotate(-state.a);

		//player is a triangle
		ctx.fillStyle = colours[_pid-1];
		ctx.strokeStyle = colours[_pid-1];
		ctx.beginPath();
		ctx.moveTo(0,20);
		ctx.lineTo(14,-14);
		ctx.lineTo(-14,-14);
		ctx.lineTo(0,20);
		
		if (debug) {
			ctx.stroke();
		} else {
			ctx.fill();
		}

		ctx.restore();
	}

	var from;
	var to;

	var unacked_offset = {
		'x':0,
		'y':0
	}
	this.state_update = function(msg) {
		window.print_msg('APP', 'Game Time: '+Number(msg.timestamp).toFixed(2));
		game_time = Number(msg.timestamp);

		//console.log('state from server: '+Number(msg.timestamp).toFixed(2)+', last_id: '+msg.state.players[pid].last_id);

		if (registered_cmds.length != 0 && msg.state.players[pid].last_id >= 0) {
			window.print_msg('reconcile', 'unacked moves: '+registered_cmds.length);
			//reconcile last input
			last_id = msg.state.players[pid].last_id;
			received_ids = msg.state.players[pid].received_ids;

			var index = last_id - (cmd_id - registered_cmds.length);
			var client_state = registered_cmds[index].state;
			var server_state = msg.state.players[pid].state;

			//console.log('');
			//console.log('cmd_id_server='+msg.state.players[pid].last_id+', cmd_id_client='+registered_cmds[index].cmd_id+', registered_cmds_length='+registered_cmds.length);

			prediction_offset.x = client_state.x - server_state.x;
			prediction_offset.y = client_state.y - server_state.y;

			//zero prediction offset + non zero unacked offset means the fix worked. reset unacked offset
			if ((prediction_offset.x == 0 && unacked_offset.x != 0) || (prediction_offset.y == 0 && unacked_offset.y != 0)) {
				console.log('offset fix worked, resetting');
				unacked_offset.x = 0;
				unacked_offset.y = 0;
			}

			//if we have an unacked offset
			if ((prediction_offset.x + unacked_offset.x) != 0 || (prediction_offset.y + unacked_offset.y) != 0) {
				console.log('fixing offset');
				player.x += prediction_offset.x * -1;
				player.y += prediction_offset.y * -1;
				unacked_offset.x += prediction_offset.x * -1;
				unacked_offset.y += prediction_offset.y * -1;
			}

			window.print_msg('offset', 'current offset: x='+prediction_offset.x+', y='+prediction_offset.y);

			//console.log('offset: x='+ox+', y='+oy+' sx='+server_state.x+', sy='+server_state.y+', cx='+client_state.x+', cy='+client_state.y);
			//console.log('');

			registered_cmds = registered_cmds.slice(index);
		}

		if (to == undefined) {
			//instantiate local predicted player
			var server_player = msg.state.players[pid].state;
			player.x = server_player.x;
			player.y = server_player.y;
			player.angle = server_player.a;
		}
		
		from = clone(to);
		to = msg;
		interp_frame = clone(from);
	}

	function clone (obj) {
		if (obj != undefined) {
			return JSON.parse(JSON.stringify(obj))
		}
	}

	function apply_move(obj, move) {
		var new_val = Math.floor(player_speed * client_speed);
		if (move == 'UP') obj.y -= new_val;
		if (move == 'DOWN') obj.y += new_val;
		if (move == 'LEFT') obj.x -= new_val;
		if (move == 'RIGHT') obj.x += new_val;
	}

	this.reset_screen = function() {
		paused = true;
		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		console.log(canvas.width, canvas.height);
		from = undefined;
		to = undefined;

		prediction_offset.x = 0;
		prediction_offset.y = 0;
	};

	this.reset_screen();	
}