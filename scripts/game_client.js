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
	var colours = ['#2176ff', '#379e3a', '#efe639', '#f7411d', '#cc00cc'];
	var shield_cols = ['#66a1ff', '#8ed790', '#f3eb59', '#fa836b', '#ff33ff'];

	//default object shapes
	var shapes = {
		player: [[0,20], [14,-14], [-14,-14]],
		rocket: [[0,10],[5,-5],[-5,-5]],
		shield: [[0,22], [15,-15], [-15,-15]],
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
		asteroid_9: [[38,-6], [21,-30], [-14,-35], [-33,5], [-28,36], [18,26]]
	}

	//all vfx objects here
	var vfx_items = [];

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

	function render(frame, dt) {
		//render background
		render_background();
		//ctx.fillStyle = '#D9D9D9';
		//ctx.fillRect(0,0,canvas.width, canvas.height);

		if (frame == undefined) return;

		//render entities
		for (var key in frame.state.entities) {
			var entity = frame.state.entities[key];
			if (entity.type == 'player' && entity.oid != gs.pid()) {
				var ship_col = colours[entity.pid-1];
				if (frame.state.events.hasOwnProperty(entity.pid)) {
					render_shape(entity, shapes.player, '#ff0000', false, 2);
				} else {
					render_shape(entity, shapes.player, ship_col, false);
				}
			}
			if (entity.type == 'bullet') {
				render_shape(entity, shapes.bullet, colours[entity.pid-1], true);
			}
			if (entity.type.match(/^asteroid_[1-9]$/)) {
				var ast_col = '#ffffff';
				if (frame.state.events.hasOwnProperty(entity.oid)) {
					ast_col = '#ff0000';
				}
				render_shape(entity, shapes[entity.type], ast_col, false);
			}
			if (entity.type == 'rocket') {
				render_shape(entity, shapes.rocket, colours[entity.owner_id-1], false);
			}
		}

		//render predicted player
		if (frame.hasOwnProperty('predicted_player')) {
			var pp = frame.predicted_player;
			render_shape(pp, shapes.player, colours[pp.pid-1], false);
		}

		//render hud
		var shields;
		if (frame.state.entities.hasOwnProperty(gs.pid())) {
			shields = frame.state.entities[gs.pid()].shields;
		} else {
			shields = 0;
		}
		var offset = 25;
		for (var i = 0; i < 3; i++) {
			if (i+1 <= shields) draw_circle([20+(i*offset),20], 7, '#2176ff', true);
			else				draw_circle([20+(i*offset),20], 7, '#2176ff', false);
		}

		//apply events
		for (var key in frame.state.events) {
			var event = frame.state.events[key];
			var action_code = String(event[0]);
			var target_code = String(event[1]);
			if (action_code == 'hit' && target_code == 'bullet') {
				vfx_items.push(vfx.explosion_small([event[2], event[3]], ['#ffffff']));
			} else if (action_code == 'dead') {
				var colour;
				if (target_code == 'ast') {
					colour = ['#ffffff'];
				} else {
					colour = colours[event[4]-1];
				}
				vfx_items.push(vfx.explosion_large([event[2], event[3]], [colour]));
			}
		}

		//render effects
		for (var i = 0; i < vfx_items.length; i++) {
			var item = vfx_items[i];
			if (item.complete()) {
				vfx_items.splice(i, 1);
				i--;
				continue;
			}

			item.update(dt);
			item.render();
		}
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

		ctx.fillStyle = '#D9D9D9';
		ctx.fillRect(0,0,canvas.width, canvas.height);

		ih.stop();
	};

	this.reset_screen();	
}