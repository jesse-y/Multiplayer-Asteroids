function FrameManager() {
	var tick = 0;
	var frames = [];

	this.get_tick = function () {
		return tick;
	}

	this.advance = function(state) {
		frames.push(state);
		tick += 1;
		//console.log('-->new state: tick='+tick);
		//console.log(state);
		//console.log('');
	}

	this.reconcile = function(s_tick, s_state) {
		if (s_tick > tick || frames.length == 0) { return }

		var behind = tick - s_tick;
		var index = frames.length - behind - 1;
		var c_state = frames[index];

		var success;
		c = JSON.stringify(c_state);
		s = JSON.stringify(s_state);
		//console.log(c+' == '+s+' -> '+(c === s))
		console.log('tick: c_tick='+(index+1)+':s_tick'+s_tick+'error: x='+(c_state.x-s_state.x)+', y='+(c_state.y-s_state.y));
		if (c === s) {
			success = true;
		} else {
			success = false;
		}

		frames = frames.slice(frames.length - behind);
		//console.log('-->compare: c_tick='+tick+', s_tick='+s_tick+', frame length='+frames.length);
		return success;
	}

	this.unacked = function() {
		return frames.length;
	}

	this.reset = function () {
		tick = 0;
		frames = [];
	}
}