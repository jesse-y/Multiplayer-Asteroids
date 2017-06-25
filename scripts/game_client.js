function game_client() {
	var client_speed;
	var world_x = 800;
	var world_y = 600;

	var canvas = document.getElementById('viewport');
	canvas.width = world_x;
	canvas.height = world_y;
	var ctx = canvas.getContext('2d');

	var ws;
	var gs = new game_state();
	var ih = new input_handler();
	var vfx = new visual_effects(ctx);

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

	//default ship colours
	var colours = ['#2176ff', '#f7411d', '#379e3a', '#cc00cc', '#efe639'];

	//default object shapes
	var shapes = {
		player: [[0,20], [14,-14], [-14,-14]],
		player_invuln: [[0,25], [18,-16], [-18,-16]],
		rocket: [[0,10],[5,-5],[-5,-5]],
		bullet: [[2,2], [2,-2], [-2,-2], [-2,2]],
		star: [[1,1], [1,-1], [-1,-1], [-1,1]],
		asteroid_1: [[0,10], [12,5], [5,-7], [-2,-9], [-6,4]],
		asteroid_2: [[3,15], [13,5], [9,-9], [-11,-5], [-8,1]],
		asteroid_3: [[5,9], [15,9], [2,-12], [-16,-7], [-10,5]],
		asteroid_4: [[4,29], [30,12], [20,-25], [-5,-17], [-20,9]],
		asteroid_5: [[2,20], [28,3], [14,-22], [-8,-20], [-18,14]],
		asteroid_6: [[14,33], [28,2], [35,-30], [-10,-17], [-8,10]],
		asteroid_7: [[33,-2], [25,-30], [-15,-27], [-42,-6], [-13,31], [15,40]],
		asteroid_8: [[36,-1], [12,-43], [-21,-37], [-34,-1], [-23,29], [26,38]],
		asteroid_9: [[38,-6], [21,-30], [-14,-35], [-33,5], [-28,36], [18,26]],
		powerup_outer: [[15,15],[15,-15], [-15,-15], [-15,15]],
		powerup_inner: [[0,-9], [-5,7], [5,7]]
	}

	//all vfx objects here
	var vfx_items = [];
	var uniq_vfx = {};

	//prepare background information
	var stars = assign_stars();

	var paused;
	var last_time;

	function main() {
		if (paused) return;

		var now = Date.now();
		var dt = (now - last_time) / 1000.0;

		//handle input
		var history = ih.pop_history();
		gs.extend_history(history);

		//update game state and then render it
		frame = gs.next_frame(dt);
		render(frame, dt);

		last_time = now;
		get_anim_frame(main);
	}

	this.init = function(_ws, args) {
		console.log('starting game client');
		ws = _ws;

		paused = false;
		last_time = Date.now();

		var pid = args[0];
		var game_time = args[1];
		var settings = args[2];

		world_x = settings.x;
		world_y = settings.y;
		canvas.width = settings.x;
		canvas.height = settings.y;
		canvas.style.width = settings.x + 'px';
		canvas.style.height = settings.y + 'px';

		client_speed = 1/settings.client_rate;

		ih.init(ws, client_speed);
		gs.init(pid, game_time, settings);
		main();
	}

	this.state_update = function(msg) {
		gs.state_update(msg);
	}

	this.stop_game = function() {
		//stop the client sending input to the server
		ih.stop();
		ih.pop_history();
	}

	this.game_over = function(msg) {
		paused = true;
		ih.stop();
		render_background();

		ctx.fillStyle = '#ffffff';
		ctx.font = '40px MunroSmall';
		var x_align = world_x/2-ctx.measureText('GAME OVER').width/2;
		var y_align = Math.round(world_y * 0.1);
		var text_offset = 40;
		ctx.fillText('GAME OVER', x_align, y_align);

		ctx.fillStyle = '#ffffff';
		ctx.font = '30px MunroSmall';
		y_align += 80;

		var place_align = x_align - ctx.measureText('GAME__').width;
		var name_align = place_align + ctx.measureText('        ').width;
		var score_align = name_align + ctx.measureText('                              ').width;
		for (var i = 0; i < msg.length; i += 3) {
			y_align += text_offset;
			var place = (i/3) + 1;
			var player_username = (msg[i+1]);
			var player_score = msg[i+2];

			//var entry_text = place + '      ' + player_username + '      ' + player_score;
			ctx.fillText(place, place_align, y_align);
			ctx.fillText(player_username, name_align, y_align);
			ctx.fillText(player_score, score_align, y_align);
		}
	}

	function render(frame, dt) {
		//render background
		render_background();
		//ctx.fillStyle = '#D9D9D9';
		//ctx.fillRect(0,0,canvas.width, canvas.height);

		if (frame == undefined) return;

		//render entities
		for (var key in frame.state.entities) {
			var entity = frame.state.entities[key];
			//if the player object is not the current player
			if (entity.type == 'player' && entity.oid != gs.pid()) {
				var ship_col = colours[entity.pid-1];
				if (!entity.alive) {
					continue;
				}
				if (frame.state.events.hasOwnProperty(entity.oid)) {
					//if the object is hit show its hitting animation
					render_shape(entity, shapes.player, '#ff0000', false, 2);
				} else {
					render_shape(entity, shapes.player, ship_col, false);
				}
				if (entity.invuln) {
					render_shape(entity, shapes.player_invuln, '#ffe100', false);
				}
			}
			if (entity.type == 'bullet') {
				render_shape(entity, shapes.bullet, colours[entity.pid-1], true);
			}
			if (entity.type.match(/^asteroid_[1-9]$/)) {
				var ast_col = '#ffffff';
				//render the asteroid in red if it is hit this frame
				if (frame.state.events.hasOwnProperty(entity.oid)) {
					ast_col = '#ff0000';
				}
				render_shape(entity, shapes[entity.type], ast_col, false);
			}
			if (entity.type == 'rocket') {
				render_shape(entity, shapes.rocket, colours[entity.owner_id-1], false);
				if (!uniq_vfx.hasOwnProperty(entity.oid)) {
					vfx_items.push(vfx.rocket_trail(entity.oid));
					uniq_vfx[entity.oid] = true;
				}
			}
			if (entity.type == 'powerup') {
				render_shape(entity, shapes.powerup_outer, '#ffeb54', false);
				render_shape(entity, shapes.powerup_inner, '#f78827', false)
			}
		}

		//render predicted player
		if (frame.hasOwnProperty('predicted_player') && frame.state.entities[gs.pid()].alive) {
			var pp = frame.predicted_player;
			render_shape(pp, shapes.player, colours[pp.pid-1], false);
			if (frame.state.entities[gs.pid()].invuln) {
				render_shape(pp, shapes.player_invuln, '#ffe100', false);
			}
		}

		//apply events
		for (var key in frame.state.events) {
			var event = frame.state.events[key];
			var action_code = String(event[0]);
			var target_code = String(event[1]);
			if (action_code == 'hit') {
				if (target_code == 'bullet') {
					vfx_items.push(vfx.explosion_small([event[2], event[3]], ['#ffffff']));
				} else if (target_code == 'rocket') {
					vfx_items.push(vfx.explosion_small([event[2], event[3]], [colours[event[4]-1]]));
				}
			} else if (action_code == 'dead') {
				var colour;
				if (target_code == 'ast') {
					colour = ['#ffffff'];
				} else {
					colour = colours[event[4]-1];
				}
				vfx_items.push(vfx.explosion_large([event[2], event[3]], [colour]));
			} else if (action_code == 'noshield') {
				var player_id = event[2];
				var player_oid = event[3];
				var colour = colours[player_id-1];

				if (!uniq_vfx.hasOwnProperty(player_oid)) {
					uniq_vfx[player_oid] = true;
					vfx_items.push(vfx.noshield(player_oid, colour));
				}
			} else if (action_code == 'get') {
				var player_oid = event[2];

				if (!uniq_vfx.hasOwnProperty(player_oid)) {
					uniq_vfx[player_oid] = true;
					vfx_items.push(vfx.noshield(player_oid, '#ffe100'));
				}
			}

		}

		//render effects
		for (var i = 0; i < vfx_items.length; i++) {
			var item = vfx_items[i];
			if (item.complete()) {
				vfx_items.splice(i, 1);
				i--;
				if (item.target_obj != -1) {
					delete uniq_vfx[item.target_obj];
				}
				continue;
			}

			item.update(dt, frame);
			item.render();
		}

		//render hud
		var shields = 0;
		var n_rockets = 0;
		var n_powerup = 0;
		if (frame.state.entities.hasOwnProperty(gs.pid())) {
			shields = frame.state.entities[gs.pid()].shields;
			n_rockets = frame.state.entities[gs.pid()].rockets;
			n_powerup = frame.state.entities[gs.pid()].powerup;
		}

		ctx.font = '30px MunroSmall';
		ctx.fillStyle = '#ffffff';
		var score_text = String(gs.score());
		ctx.fillText(score_text, world_x/2-ctx.measureText(score_text).width/2, 32);

		dot_ui(shields, 3, 'SHIELDS', [15,15], '#53d7e2');
		dot_ui(n_rockets, 2, 'ROCKETS', [105,15], '#ff9823');
		dot_ui(n_powerup, 1, 'INVULN', [195, 15], '#ffe100');
		dot_ui(gs.lives(), 5, 'LIVES', [world_x-140,15], colours[gs.col_id()-1]);

	}

	function dot_ui(curr_val, max_val, name, position, colour) {
		var dot_offset = 25;
		var dot_radius = 7;
		
		var ui_padding = 7;
		var ui_radius = 5;

		ctx.font = '20px MunroSmall';
		var ui_text_height = text_height(name, 'MunroSmall', '20px');
		var ui_text_width = ctx.measureText(name).width;

		var width = ui_padding * 2 + dot_offset * (max_val-1) + dot_radius * 2;
		var height = dot_radius * 2 + ui_padding * 2;
		
		//if the ui text is larger than its own ui dots, enlarge the box
		//to fit the ui text and set width_padding to centre the ui dots
		var width_padding = 0;
		if (width < ui_text_width+10+ui_padding) {
			width_padding = (ui_text_width+10+ui_padding) - width;
			width = ui_text_width+10+ui_padding;
		}

		//centre the ui text above the rectangle
		var ui_text_start = width/2 - ui_text_width/2;
		var ui_centre = height / 2;

		var x = position[0];
		var y = position[1];

		ctx.beginPath();
		ctx.strokeStyle = '#ffffff';
		ctx.moveTo(x + ui_radius, y);
		ctx.lineTo(x+ui_text_start-5, y);
		ctx.closePath();
		ctx.stroke();

		ctx.beginPath();
		ctx.strokeStyle = '#ffffff';
		ctx.moveTo(x+ui_text_start+5+ui_text_width, y);
		ctx.lineTo(x + width - ui_radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + ui_radius);
		ctx.lineTo(x + width, y + height - ui_radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - ui_radius, y + height);
		ctx.lineTo(x + ui_radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - ui_radius);
		ctx.lineTo(x, y + ui_radius);
		ctx.quadraticCurveTo(x, y, x + ui_radius, y);
		ctx.moveTo(0,0);
		ctx.closePath();
		ctx.stroke();

		ctx.fillStyle = '#ffffff';
		ctx.fillText(name, x+ui_text_start, y+(ui_text_height/4));

		var x_start = x+ui_padding;
		if (width_padding > 0) {
			x_start += width_padding/2; 
		}
		for (var i = 0; i < max_val; i++) {
			if (i+1 <= curr_val)   draw_circle([x_start+(i*dot_offset)+dot_radius,y+ui_centre], dot_radius, colour, true);
			else				   draw_circle([x_start+(i*dot_offset)+dot_radius,y+ui_centre], dot_radius, colour, false);
		}
	}

	function text_height(text, font, size) {
		//horrible document hacking to get text height.. why isn't there an
		//api for this?
		var temp_div = document.createElement('div');
		var temp_text = document.createTextNode(text);

		temp_div.appendChild(temp_text);

		temp_text.style = 'font-family: ' + font + '; font-size: ' + size + ';';

		document.body.appendChild(temp_div);
		var result = temp_div.offsetHeight;
		document.body.removeChild(temp_div);
		return result;
	}

	function render_shape(state, points, colour, fill, thickness) {
		ctx.save();

		ctx.strokeStyle = colour;
		ctx.fillStyle = colour;
		if (thickness == undefined) {
			thickness = 1;
		}
		ctx.lineWidth = thickness;

		ctx.translate(state.x, state.y);
		ctx.rotate(-state.a);

		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		points.slice(1).forEach(function (p) {
			ctx.lineTo(p[0], p[1]);
		});
		ctx.lineTo(points[0][0], points[0][1]);
		
		if (fill == true) {
			ctx.fill();
		} else {
			ctx.stroke();
		}

		ctx.restore();
	}

	function render_points(points, colour) {
		//render a set of absolute points
		ctx.save();

		ctx.strokeStyle = colour;
		ctx.beginPath();
		ctx.moveTo(points[0][0], points[0][1]);
		points.slice(1).forEach(function (p) {
			ctx.lineTo(p[0], p[1]);
		});
		ctx.lineTo(points[0][0], points[0][1]);
		ctx.stroke();

		ctx.restore();
	}

	function render_background() {
		ctx.fillStyle = '#000000';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		stars.forEach(function (star) {
			render_shape(star, shapes.star, '#424242', true);
		})
	}

	function assign_stars() {
		//number of stars in a 100px * 100px area
		var star_density = 1;

		var num_stars = ((world_x * world_y) / (100 * 100)) * star_density;

		var result = [];
		for (var i = 0; i < num_stars; i++) {
			result.push({
				x: Math.floor(Math.random() * world_x),
				y: Math.floor(Math.random() * world_y),
				a: Math.random() * Math.PI
			})
		}

		return result;
	}

	function draw_line(p1, p2, colour) {
		ctx.save();
		ctx.strokeStyle = colour;
		ctx.beginPath();
		ctx.moveTo(p1[0], p1[1]);
		ctx.lineTo(p2[0], p2[1]);
		ctx.stroke();
		ctx.restore();
	}

	function draw_circle(centre, radius, colour, fill) {
		ctx.save();
		ctx.fillStyle = colour;
		ctx.strokeStyle = colour
		ctx.translate(centre[0], centre[1]);
		ctx.beginPath();
		ctx.arc(0,0,radius,0,2*Math.PI);
		if (fill) {
			ctx.fill();
		} else {
			ctx.stroke();
		}
		ctx.restore();
	}

	this.reset_screen = function() {
		paused = true;

		canvas.width = world_x;
		canvas.style.width = world_x + 'px';
		canvas.height = world_y;
		canvas.style.height = world_y + 'px';

		//ctx.fillStyle = '#D9D9D9';
		render_background();

		vfx_items = [];
		uniq_vfx = {};

		ih.stop();
		ih.pop_history();
	};

	this.reset_screen();
}