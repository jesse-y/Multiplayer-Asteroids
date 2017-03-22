class User:
	def __init__(self, uid=None, username=None, ws=None):
		self.uid = uid
		self.username = username
		self.ws = ws

	def __hash__(self):
		return hash(self.uid)