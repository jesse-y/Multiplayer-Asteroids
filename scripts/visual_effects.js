function visual_effects(_ctx) {
	var ctx = _ctx;
	var vfx_obj = this;

	this.particle = function(start, finish, duration, colours) {
		var elapsed = 0;
		var position = {
			x:start[0],
			y:start[1]
		};
		var colour = colours[0];
		var done = false;

		this.update = function(dt) {
			elapsed += dt;
			if (elapsed >= duration || done) {
				done = true;
				return
			}

			var time_frac = elapsed / duration;
			position.x = start[0] + tween(start[0], finish[0], time_frac);
			position.y = start[1] + tween(start[1], finish[1], time_frac);
		}

		this.render = function() {
			ctx.save();

			ctx.fillStyle = colour;
			ctx.fillRect(position.x, position.y, 1, 1);

			ctx.restore();
		}

		this.complete = function() {
			return done;
		}

		function tween(start, finish, fraction) {
			return Math.round((finish - start) * fraction);
		}
	}

	this.emitter = function(position, inner_radius, outer_radius, num_particles, duration, colours) {
		var elapsed = 0;
		var particles = [];
		var done = false;

		for (var i = 0; i < num_particles; i++) {
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

		this.update = function(dt) {
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

	this.explosion_small = function(position, colour) {
		return new vfx_obj.emitter(position, 10, 40, 2, 0.33, colour);
	}

	this.explosion_large = function(position, colour) {
		return new vfx_obj.emitter(position, 20, 85, 5, 1.0, colour);
	}
}