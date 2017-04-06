	def update_entities(self, dt):
		for p in self.players.values():
			ship = self.ships[p]
			if not self.moves[p]:
				continue
			#parse keys. more than one key might be pressed per tick
			for key in self.moves[p].keys:
				if self.keymap.get(key) == 'UP':
					ship.y -= settings.GAME_SPEED * dt
				if self.keymap.get(key) == 'DOWN':
					ship.y += settings.GAME_SPEED * dt
				if self.keymap.get(key) == 'LEFT':
					ship.x -= settings.GAME_SPEED * dt
				if self.keymap.get(key) == 'RIGHT':
					ship.x += settings.GAME_SPEED * dt

		for a in self.asteroids:
			if a.x < 0:


	def create_world(self):
		for player in self.players.values():
			self.moves[player] = deque()
			self.ships[player] = GameObject(x=320,y=400,a=3.14)
		self.asteroids.append(GameObject(x=320, y=100, a=0))				