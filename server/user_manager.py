import settings
from id_manager import IdManager, IdManagerException
from user import User
from game import Game

import json
import asyncio
from asyncio import Queue

class UserManager:
	def __init__(self):
		self.uid_manager = IdManager(max_id=settings.MAX_USERS)
		self.gid_manager = IdManager()
		self.users = Queue(maxsize=settings.MAX_USERS)

	async def manage(self):
		game = None
		while True:
			user = await self.users.get()
		
			if not game:
				gid = self.gid_manager.assign_id()
				game = Game(game_id=gid)
			game.new_player(user)

			if game.ready:
				asyncio.ensure_future(self.game_loop(game))
				game = None

	async def game_loop(self, game):
		while True:
			game.next_frame()
			if game.finished:
				break
			await asyncio.sleep(2)
		self.gid_manager.release_id(game.game_id)
		for user in game.players.values():
			print('um>game_loop: closing user: uid={}, username={}'.format(user.uid, user.username))
			user.ws.close()

	def new_user(self, username, ws):
		try:
			uid = self.uid_manager.assign_id()
		except IdManagerException:
			print('user_manager>new_user: max users exceeded. rejecting new user')
			err_msg = json.dumps(['error', 'Server: maximum user limit exceeded'])
			ws.send_str(err_msg)

		user = User(uid, username, ws)
		self.users.put_nowait(user)

		return user

	def remove_user(self, user):
		self.uid_manager.release_id(user.uid)