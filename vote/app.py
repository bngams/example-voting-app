# Fork pédagogique du service "vote" de dockersamples/example-voting-app (Apache 2.0).
# Ajouts : version affichée (APP_VERSION), design v2, bug volontaire en v3, routes /healthz et /crash.
from flask import Flask, render_template, request, make_response, g
from redis import Redis
import os
import socket
import random
import json
import signal
import logging

app_version = os.getenv('APP_VERSION', "1.0")
major = app_version.split('.')[0]
option_a = os.getenv('OPTION_A', "Chats")
option_b = os.getenv('OPTION_B', "Chiens")
redis_host = os.getenv('REDIS_HOST', "redis")
hostname = socket.gethostname()

# v3 : nouveau titre configurable... mais sans valeur par défaut.
# Si VOTE_TITLE n'est pas fourni, l'application plante au démarrage (bug VOLONTAIRE pour le TP).
if major == "3":
    vote_title = os.environ['VOTE_TITLE']
else:
    vote_title = f"{option_a} ou {option_b} ?"

app = Flask(__name__)

gunicorn_error_logger = logging.getLogger('gunicorn.error')
app.logger.handlers.extend(gunicorn_error_logger.handlers)
app.logger.setLevel(logging.INFO)
app.logger.info('Démarrage de vote version %s sur %s', app_version, hostname)

def get_redis():
    if not hasattr(g, 'redis'):
        g.redis = Redis(host=redis_host, db=0, socket_timeout=5)
    return g.redis

@app.route("/healthz")
def healthz():
    return {"status": "ok", "version": app_version, "hostname": hostname}

@app.route("/crash")
def crash():
    # Simule une panne : on demande au processus principal du conteneur (PID 1) de s'arrêter.
    # Kubernetes redémarre alors le conteneur => RESTARTS +1, le pod garde son nom.
    app.logger.warning('/crash appelé : arrêt du conteneur demandé')
    os.kill(1, signal.SIGTERM)
    return f"💥 Le conteneur de {hostname} va s'arrêter... Kubernetes va le redémarrer.\n"

@app.route("/", methods=['POST','GET'])
def hello():
    voter_id = request.cookies.get('voter_id')
    if not voter_id:
        voter_id = hex(random.getrandbits(64))[2:-1]

    vote = None

    if request.method == 'POST':
        redis = get_redis()
        vote = request.form['vote']
        app.logger.info('Vote reçu pour %s', vote)
        data = json.dumps({'voter_id': voter_id, 'vote': vote})
        redis.rpush('votes', data)

    resp = make_response(render_template(
        'index.html',
        option_a=option_a,
        option_b=option_b,
        title=vote_title,
        hostname=hostname,
        version=app_version,
        major=major,
        vote=vote,
    ))
    resp.set_cookie('voter_id', voter_id)
    return resp


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=80, debug=True, threaded=True)
