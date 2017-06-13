#world settings
WORLD_X = 800
WORLD_Y = 600

#game settings
GAME_SPEED = 60
SEND_RATE = 20
MAX_PLAYERS = 2
GAME_COMPLETE_DELAY = 2

#game object settings
PLAYER_SPEED = 250
MAX_PLAYER_LIVES = 5
INVULN_DURATION = 2

BULLET_SPEED = 500
BULLETS_PER_SECOND = 4

MAX_SHIELDS = 3
REGEN_DELAY = 3
REGEN_SPEED = 1

RESPAWN_DELAY = 3

MAX_ROCKETS = 2
ROCKET_BASE_SPEED = 100
ROCKET_ACCELERATION = 200
ROCKET_ROT_SPEED = 1.5
ROCKET_MAX_SPEED = 1000
ROCKETS_PER_SECOND = 2
ROCKET_RECHARGE_SPEED = 3

PWRUP_SPD_MIN = 80
PWRUP_SPD_MAX = 100
POWERUP_ALIVE_TIME = 10

#score settings
SCR_HIT_BULLET = 10
SCR_HIT_ROCKET = 40
SCR_KILL_AST_LRG = 75
SCR_KILL_AST_MED = 85
SCR_KILL_AST_SML = 100
SCR_KILL_PLAYER = 260
SCR_GET_POWERUP = 100

#app settings
MAX_USERS = 100

#user settings
CLIENT_RATE = 30

#object presets
obj_type_speed = {
	'player': PLAYER_SPEED,
	'bullet': BULLET_SPEED,
}

obj_type_shape = {
	'player': [[0,20],[14,-14],[-14,-14]],
	'bullet': [[2,2],[2,-2],[-2,-2],[-2,2]],
	'rocket': [[0,10],[5,-5],[-5,-5]],
	'asteroid_1': [[0,10], [12,5], [5,-7], [-2,-9], [-6,4]],
	'asteroid_2': [[3,15], [13,5], [9,-9], [-11,-5], [-8,1]],
	'asteroid_3': [[5,9], [15,9], [2,-12], [-16,-7], [-10,5]],
	'asteroid_4': [[4,29], [30,12], [20,-25], [-5,-17], [-20,9]],
	'asteroid_5': [[2,20], [28,3], [14,-22], [-8,-20], [-18,14]],
	'asteroid_6': [[14,33], [28,2], [35,-30], [-10,-17], [-8,10]],
	'asteroid_7': [[33,-2], [25,-30], [-15,-27], [-42,-6], [-13,31], [15,40]],
	'asteroid_8': [[36,-1], [12,-43], [-21,-37], [-34,-1], [-23,29], [26,38]],
	'asteroid_9': [[38,-6], [21,-30], [-14,-35], [-33,5], [-28,36], [18,26]],
	'powerup': [[15,15],[15,-15], [-15,-15], [-15,15]]
}

ast_speed_min = {
	1:150,
	2:150,
	3:150,
	4:125,
	5:125,
	6:125,
	7:100,
	8:100,
	9:100
}

ast_speed_max = {
	1:200,
	2:200,
	3:200,
	4:175,
	5:175,
	6:175,
	7:125,
	8:125,
	9:125
}

ast_max_hp = {
	1:1,
	2:1,
	3:1,
	4:3,
	5:3,
	6:3,
	7:5,
	8:5,
	9:5
}