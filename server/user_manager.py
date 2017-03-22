import settings
from user import User

class UserManager:
	def __init__(self):
		self.last_id = 0
		self._users = {}

	def new_user(self, username, ws):
		u = User(uid=self.last_id, username=username, ws=ws)
		if len(self._users) == settings.MAX_USERS:
			raise UserException('UserManager: maximum user limit ({}) exceeded'.format(settings.MAX_USERS))
		else:
			self._users[u] = u
	

class UserException(Exception):
	pass