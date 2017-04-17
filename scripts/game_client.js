function game_client() {
	var client_speed;
	var world_x = 800;
	var world_y = 600;

	var ws;
	var gs = new game_state();
	var ih = new input_handler();

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
	canvas.width = world_x;
	canvas.height = world_y;
	var ctx = canvas.getContext('2d');

	//default ship colours
	var colours = ['#2176ff', '#379e3a', '#efe639', '#f7411d', '#c130e5'];

	//default object shapes
	var shapes = {
		player: [[0,20], [14,-14], [-14,-14]],
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
		render(frame);

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

	function render(frame) {
		//render background
		render_background();
		//ctx.fillStyle = '#D9D9D9';
		//ctx.fillRect(0,0,canvas.width, canvas.height);

		if (frame == undefined) return;

		//render entities
		for (var key in frame.state.entities) {
			var entity = frame.state.entities[key];
			if (entity.type == 'player' && entity.pid != gs.pid()) {
				render_shape(entity, shapes.player, colours[entity.pid-1], false);
			}
			if (entity.type == 'bullet') {
				render_shape(entity, shapes.bullet, '#ffffff', true);
			}
			if (entity.type.match(/^asteroid_[1-9]$/)) {
				render_shape(entity, shapes[entity.type], '#ffffff', false);
			}
		}

		//render predicted player
		var pp = frame.predicted_player;
		render_shape(pp, shapes.player, colours[pp.pid-1], false);

		//render events
		if (frame.state.hasOwnProperty('events')) {
			for (var key in frame.state.events) {
				render_points(frame.state.events[key], '#ff0000');
			}
		}
	}

	function render_shape(state, points, colour, fill) {
		ctx.save();

		ctx.strokeStyle = colour;
		ctx.fillStyle = colour;

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

/*
//deprecated
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
	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.lineTo(px, py);
	ctx.stroke();

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
*/