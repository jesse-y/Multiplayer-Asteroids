(function () {
	window.vfx_tools = {
		HEXtoRGB: function (hex_code) {
			if (hex_code.length < 6) return;
			if (hex_code.startsWith('#')) {
				hex_code = hex_code.slice(1);
			}
			var rgb = [];
			for (var i = 0; i < 6; i+=2) {
				rgb.push(parseInt(hex_code.slice(i, i+2), 16));
			}
			return {
				r:rgb[0],
				g:rgb[1],
				b:rgb[2]
			}
		},
		RGBtoHEX: function (r, g, b) {
			//contains evil 0 padding. numbers which are less than 100 get their strings padded to '00'.
			return '#'+('0'+r.toString(16)).slice(-2)+('0'+g.toString(16)).slice(-2)+('0'+b.toString(16)).slice(-2);
		}
	}
})();

function visual_effects(_ctx) {
	var ctx = _ctx;
	var vfx_obj = this;

	//all vfx objects require the functions update(), render() and complete().

	//a simple particle that moves in a linear motion from start to finish coordinates
	//in the form [x, y] over its specified duration
	this.particle = function(start, finish, duration, colours) {
		var elapsed = 0;
		var position = {
			x:start[0],
			y:start[1]
		};
		var colour = colours[0];
		var done = false;
		
		this.target_obj = -1;

		this.update = function(dt, frame) {
			elapsed += dt;
			if (elapsed >= duration || done) {
				done = true;
				return;
			}

			var time_frac = elapsed / duration;
			position.x = start[0] + Math.round(tween(start[0], finish[0], time_frac));
			position.y = start[1] + Math.round(tween(start[1], finish[1], time_frac));
		}

		this.render = function() {
			ctx.save();

			ctx.fillStyle = colour;
			//ctx.fillRect(position.x, position.y, 1, 1);
			ctx.beginPath();
			ctx.arc(position.x,position.y,1,0,2*Math.PI);
			ctx.fill();

			ctx.restore();
		}

		this.complete = function() {
			return done;
		}
	}

	//simple line that transitions from one colour to the next over its duration.
	this.vfx_line = function(p1, p2, duration, colours) {
		var elapsed = 0;
		var done = false;
		var curr_colour;

		this.target_obj = -1;

		if (colours.length < 2) {
			done = true;
			console.log('vfx_line object requires at least 2 colours. Got '+colours.length);
			return;
		}

		this.update = function(dt, frame) {
			elapsed += dt;
			if (elapsed >= duration || done) {
				done = true;
				return;
			}
			var time_frac = elapsed / duration;
			curr_colour = tween_colour(colours[0], colours[1], time_frac);
		}

		this.render = function() {
			ctx.save();
			ctx.strokeStyle = curr_colour;
			ctx.beginPath();
			ctx.moveTo(p1[0], p1[1]);
			ctx.lineTo(p2[0], p2[1]);
			ctx.stroke();
			ctx.restore();
		}

		this.complete = function() {
			return done;
		}
	}

	//line emitter, used for producing rocket trails. the emitter is assigned to an
	//object in the current frame. each frame the emitter periodically produces vfx_lines
	//that follow the path the targetted object has taken.
	//emitter_speed: how often the emitter will spawn a new vfx_line, done on a per-call basis
	//line_decay: the duration of each line the emitter produces
	this.line_emitter = function(oid, emitter_speed, line_decay, colours) {
		var iter = -1;
		var lines = [];
		var done = false;
		var stop = false;
		var prev_endpoint = [];

		this.target_obj = oid;

		this.update = function(dt, frame) {
			if (!frame.state.entities.hasOwnProperty(oid)) {
				//the target object doesn't exist anymore - stop adding new lines
				stop = true;
			}

			//update existing lines
			var finished = true;
			lines.forEach(function (l) {
				if (!l.complete()) {
					finished = false;
					l.update(dt);
				}
			})
			if (finished && stop) {
				done = true;
			}

			//if the target object doesn't exist we need to stop emitting new lines
			if (stop) return;

			//iteration number that uses emitter speed. creating too many lines too quickly will lag
			//the game
			iter += 1;
			if (iter % emitter_speed != 0) return

			//endpoint of the new line
			var target = frame.state.entities[oid];
			var tx = target.x;
			var ty = target.y;

			var px, py;
			if (prev_endpoint.length == 0) {
				//specify a dot if this is the first line the emitter is producing
				px = tx + 1;
				py = ty + 1;
			} else {
				//otherwise connect the new line to the location of the old one
				px = prev_endpoint[0];
				py = prev_endpoint[1];
			}

			lines.push(new vfx_obj.vfx_line([px, py], [tx, ty], line_decay, colours));

			prev_endpoint = [tx, ty];
		}

		this.render = function () {
			lines.forEach(function (l) {
				if (!l.complete()) {
					l.render();
				}
			})
		}

		this.complete = function () {
			return done;
		}

	}

	//emits the specified number of particles in a random direction and duration. the randomness is
	//a distribution with a skewed preference for points closer to the centre.
	//all particles will travel a random distance from the inner_radius to outer_radius
	this.emitter = function(position, inner_radius, outer_radius, num_particles, duration, colours) {
		var elapsed = 0;
		var particles = [];
		var done = false;

		this.target_obj = -1;

		for (var i = 0; i < num_particles; i++) {
			//use linear random distribution with a left bias
			var inner_dist = Math.abs((Math.random() - Math.random()) * inner_radius);
			var outer_dist = Math.abs((Math.random() - Math.random()) * (outer_radius - inner_radius)) + inner_radius;
			var angle = Math.random() * Math.PI * 2;

			var ix = position[0] + inner_dist * Math.sin(angle);
			var iy = position[1] + inner_dist * Math.cos(angle);

			var ox = position[0] + outer_dist * Math.sin(angle);
			var oy = position[1] + outer_dist * Math.cos(angle);

			var rand_dur = duration + ((Math.random() - 0.5) * duration * 0.4);

			particles.push(new vfx_obj.particle([ix,iy], [ox, oy], rand_dur, colours));
		}

		this.update = function(dt, frame) {
			var finished = true;
			particles.forEach(function (p) {
				if (!p.complete()) {
					finished = false;
					p.update(dt);
				}
			})
			if (finished) {
				done = true;
			}
		}

		this.render = function() {
			particles.forEach(function (p) {
				if (!p.complete()) {
					p.render();
				}
			})
		}

		this.complete = function() {
			return done;
		}
	}

	//PRESET VFX OBJECTS -------------------------------------------------------------//

	this.explosion_small = function(position, colour) {
		return new vfx_obj.emitter(position, 10, 40, 2, 0.33, colour);
	}

	this.explosion_large = function(position, colour) {
		return new vfx_obj.emitter(position, 20, 85, 5, 1.0, colour);
	}

	this.rocket_trail = function(oid) {
		return new vfx_obj.line_emitter(oid, 3, 0.25, ['#ffe100', '#ff0000']);
	}

	//HELPER FUNCTIONS ---------------------------------------------------------------//
	function tween(start, finish, fraction) {
		return (finish - start) * fraction;
	}

	function tween_colour(start, finish, time_frac) {
		c1 = window.vfx_tools.HEXtoRGB(start);
		c2 = window.vfx_tools.HEXtoRGB(finish);

		var r, g, b;

		r = c1.r + Math.round(tween(c1.r, c2.r, time_frac));
		g = c1.g + Math.round(tween(c1.g, c2.g, time_frac));
		b = c1.b + Math.round(tween(c1.b, c2.b, time_frac));

		return window.vfx_tools.RGBtoHEX(r, g, b);
	}
}