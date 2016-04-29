from flask import Flask, request, render_template, send_from_directory, Response, current_app, Blueprint
from flask.ext.login import LoginManager, UserMixin, login_required, current_user
from bson.objectid import ObjectId
from collections import OrderedDict
from html.parser import HTMLParser
import epub
import string
import random
import re
import hashlib
import redis
import urllib
import urllib.request
import json
from datetime import *
from dateutil.tz import *

redis_zs = redis.StrictRedis(host="10.172.252.228", password="wod0Iv9eel6nuk0hI7hY", decode_responses=True, db=0)
redis = redis.StrictRedis(host="192.168.1.33", decode_responses=True, db=1)

app = Flask(__name__, static_folder='public', static_url_path='')
app.config['DEBUG'] = True
login_manager = LoginManager()
login_manager.init_app(app)
points_yuan = 10000

document="document_id"
document_path="./public/reader/"
doc_dict = {
    document: "chujia.epub"
}
price_dict = {
    document: 12 * points_yuan
}

appid="wx6a3e59d1061ba5b4"
secret="7993e77351265f8fe47ac9069a63ac38"
key="ZanShang20150605ZanShang20151218"

@app.route("/api/doc/<doc>", methods=["GET"])
@login_required
def doc(doc):
    return resp("ok", doc_dict[doc])

@app.route("/api/<doc>/progress", methods=["GET"])
@login_required
def progress(doc):
    if redis.exists("progress|%s|%s" % (current_user.get_id(), doc)):
        return resp("ok", {"progress" : redis.get("progress|%s|%s" % (current_user.get_id(), doc))})
    else:
        return resp("ok")

@app.route("/api/<doc>/rank", methods=["GET"])
@login_required
def rank(doc):
    keys = redis.keys("progress|*|%s" % doc)
    r = {}
    for key in keys:
        p = paragraph_until_cfi(doc, redis.get(key))
        r[re.search(r"progress\|(.+)\|%s" % doc, key).group(1)] = p
    name = dict(zip(r.keys(), redis.mget(["name|%s" % id for id in r.keys()])))
    return resp("ok", {"rank": [{"name": name[key], "progress": value, "id": key} for key, value in sorted(r.items(), key=lambda x: -x[1])[:10]], "me": r[current_user.get_id()], "total": total_paragraph(doc)})


@app.route("/api/<doc>/permission", methods=["GET"])
@login_required
def permission(doc):
    if redis.exists("permission|%s|%s" % (current_user.get_id(), doc)) and int(redis.get("permission|%s|%s" % (current_user.get_id(), doc))) >= paragraph_until_cfi(doc, request.args.get("end")):
        return resp("ok")
    else:
        return resp("fail")

@app.route("/api/<doc>/payment", methods=["POST"])
@login_required
def payment(doc):
    if redis.exists("permission|%s|%s" % (current_user.get_id(), doc)) and int(redis.get("permission|%s|%s" % (current_user.get_id(), doc))) >= paragraph_until_cfi(doc, request.form.get("end")):
        return resp("ok")
    else:
        if not redis.exists("permission|%s|%s" % (current_user.get_id(), doc)):
            redis.set("permission|%s|%s" % (current_user.get_id(), doc), 0)
        bought = int(redis.get("permission|%s|%s" % (current_user.get_id(), doc)))
        to_buy = paragraph_until_cfi(doc, request.form.get("end")) - bought
        total = total_paragraph(doc)
        price = int(price_dict[doc] * to_buy / total)
        print(price)
        balance = int(redis.get("balance|%s" % current_user.get_id()))
        if (balance < price):
            return resp("fail")
        else:
            
            #send share
            shared = pay(current_user.get_id(), doc)
            payment = {}
            rest = price
            if len(shared) > 0:
                for user in shared.keys():
                    payment[user] = int(price * shared[user])
                    rest = rest - payment[user]
            redis.decr("balance|%s" % current_user.get_id(), price)
            for user in payment.keys():
                redis.incr("balance|%s" % user, payment[user])
            redis.incr("income|%s" % doc, rest)
            redis.set("permission|%s|%s" % (current_user.get_id(), doc), paragraph_until_cfi(doc, request.form.get("end")))
            history = {
                "id": str(ObjectId()),
                "uid": current_user.get_id(),
                "action": "PAYMENT", 
                "document": doc,
                "time": datetime.now(tzutc()).strftime("%Y/%m/%d %H:%M:%S %Z%z"),
                "progress": request.form.get("end")
            }
            make_history(history)
            #record furtherest
            redis.set("progress|%s|%s" % (current_user.get_id(), doc), request.form.get("start"))
            return resp("ok")

@app.route("/api/share/<doc>/<uid>", methods = ["POST"])
@login_required
def accept_share(uid):
    info = json.loads(redis.get("document|%s" % document))
    if current_user.get_id() is not uid:
        history = {
            "id": str(ObjectId()),
            "uid": uid,
            "action": "SHARE",
            "document": document,
            "time": datetime.now(tzutc()).strftime("%Y/%m/%d %H:%M:%S %Z%z"),
            "target": current_user.get_id()
        }
        make_history(history)
    return resp("ok")

@app.route("/api/user", methods=["GET"])
@login_required
def user():
    uid = current_user.get_id()
    return resp("ok", {"balance": redis.get("balance|%s" % uid), "name": redis.get("name|%s" % uid), "headimg": redis.get("headimg|%s" % uid), "paid": redis.exists("paid|%s" % uid)})

@app.route("/api/authentication", methods=["GET"])
def mp_login():
    code = request.args.get("code")
    return base_login(code, appid, secret)

@app.route("/api/wechat/signature", methods=["GET"])
@login_required
def wechat_signature():
    jsapi_ticket = get_jsapi_ticket()
    url = request.scheme + "://" + request.host + request.args.get("url")
    timestamp = int(request.args.get("timestamp"))
    nonceStr = request.args.get("nonceStr")
    params = OrderedDict(sorted({
        "noncestr": nonceStr,
        "jsapi_ticket": jsapi_ticket,
        "timestamp": timestamp,
        "url": url
    }.items()))
    toSign = "&".join(["%s=%s" % (key, value) for (key, value) in params.items()])
    return resp("ok", hashlib.sha1(toSign.encode('utf-8')).hexdigest())

def get_jsapi_ticket():
    cache_key = "wechat_jsapi|ticket"
    if(redis_zs.exists(cache_key)):
        jsapi_ticket_obj = json.loads(redis_zs.get(cache_key))
        return jsapi_ticket_obj["ticket"]
    else:
        response = urllib.request.urlopen("https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=%s&type=jsapi" % get_wechat_accesstoken())
        obj = json.loads(response.readall().decode('utf-8'))
        print(json.dumps(obj))
        redis_zs.setex(cache_key, 7200, json.dumps(obj))
        return obj["ticket"]

def get_wechat_accesstoken():
    cache_key = "wechat_jsapi|access_token"
    if(redis_zs.exists(cache_key)):
        jsapi_ticket_obj = json.loads(redis_zs.get(cache_key))
        return jsapi_ticket_obj["access_token"]
    else:
        response = urllib.request.urlopen("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s" % (appid, secret))
        obj = json.loads(response.readall().decode('utf-8'))
        redis_zs.setex(cache_key, 7200, json.dumps(obj))
        return obj["access_token"]

def wechat_sign(obj):
    data = OrderedDict(sorted(obj.items()))
    toSign = "&".join(["%s=%s" % (key, value) for (key, value) in data.items()])
    toSign += "&key=%s" % key
    return hashlib.md5(toSign.encode('utf-8')).hexdigest().upper()

ip = None
def my_ip():
    global ip
    ip = ip or urllib.request.urlopen("http://ipv4bot.whatismyipaddress.com/").readall().decode('utf-8')
    return ip

@app.route("/api/wechat/qrpayment", methods=["GET"])
@login_required
def qr_payment():
    data = OrderedDict(sorted({
        "appid": appid,
        "mch_id": "1231536202", 
        "nonce_str": ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(20)),
        "body": "reader",
        "out_trade_no": "%s_%s" % (current_user.get_id(), ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(7))),
        "total_fee": 100,
        "spbill_create_ip": my_ip(),
        "notify_url": request.scheme + "://" + request.host + "/api/wechat/payment/notify",
        "trade_type": "NATIVE",
        "product_id": "points"
    }.items()))
    sign = wechat_sign(data)
    sending_data = "<xml>%s%s</xml>" % ("".join(["<%s>%s</%s>" % (key, value, key) for (key, value) in data.items()]), "<sign>" + sign + "</sign>")
    response = urllib.request.urlopen("https://api.mch.weixin.qq.com/pay/unifiedorder", data=sending_data.encode('utf-8'))
    r = response.readall().decode('utf-8')
    match = re.search(r"<code_url><!\[CDATA\[(.+)]]></code_url>", r)
    code_url = match.group(1)
    return resp("ok", code_url)

@app.route("/api/wechat/payment", methods=["GET"])
@login_required
def wechat_payment():
    data = OrderedDict(sorted({
        "appid": appid,
        "mch_id": "1231536202", 
        "nonce_str": ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(20)),
        "body": "reader",
        "out_trade_no": "%s_%s" % (current_user.get_id(), ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(7))),
        "total_fee": 100,
        "spbill_create_ip": request.remote_addr,
        "notify_url": request.scheme + "://" + request.host + "/api/wechat/payment/notify",
        "trade_type": "JSAPI",
        "openid": request.args.get("openId"),
    }.items()))
    sign = wechat_sign(data)
    sending_data = "<xml>%s%s</xml>" % ("".join(["<%s>%s</%s>" % (key, value, key) for (key, value) in data.items()]), "<sign>" + sign + "</sign>")
    response = urllib.request.urlopen("https://api.mch.weixin.qq.com/pay/unifiedorder", data=sending_data.encode('utf-8'))
    r = response.readall().decode('utf-8')
    match = re.search(r"<prepay_id><!\[CDATA\[(.+)]]></prepay_id>", r)
    prepay_id = match.group(1)
###
    payment_sign = {
            "appId": appid,
            "timeStamp": request.args.get("timeStamp"),
            "nonceStr": request.args.get("nonceStr"),
            "package": "prepay_id=%s" % prepay_id,
            "signType": "MD5"
        }
    sign = wechat_sign(payment_sign)
    return resp("ok", {"package": "prepay_id=%s" % prepay_id, "paySign": sign})

@app.route("/api/wechat/payment/notify", methods=["GET"])
def wechat_payment_callback():
    r = request.data
    match = re.search(r"<out_trade_no><!\[CDATA\[(.+)]]></out_trade_no>", r)
    user_id = match.group(1)[:24]
    if not redis.exists("paid|%s" % user_id):
        redis.incr("balance|%s" % user_id, 1 * points_yuan)
        redis.set("paid|%s" % user_id, True)
    content = '''
    <xml>
      <return_code><![CDATA[SUCCESS]]></return_code>
      <return_msg><![CDATA[OK]]></return_msg>
    </xml>
    '''
    resp = Response(content, mimetype="application/xml")
    return resp

def base_login(code, appid, secret):
    query = urllib.parse.urlencode({"appid": appid, "secret": secret, "code": code, "grant_type": "authorization_code"})
    response = urllib.request.urlopen("https://api.weixin.qq.com/sns/oauth2/access_token?%s" % query)
    r = json.loads(response.read().decode("ascii"))
    unionid = r["unionid"]
    openid = r["openid"]
    access_token = r["access_token"]
    #Create User
    if not redis.exists("unionid2id|%s" % unionid):
        uid = str(ObjectId())
        redis.set("unionid2id|%s" % unionid, uid)
        redis.set("balance|%s" % uid, 1 * points_yuan)
    uid = redis.get("unionid2id|%s" % unionid)
    #Update info
    query = urllib.parse.urlencode({"access_token": access_token, "openid": openid})
    response = urllib.request.urlopen("https://api.weixin.qq.com/sns/userinfo?%s" % query)
    rr = response.read()
    r = json.loads(rr.decode("utf8"))
    nickname = r["nickname"]
    redis.set("name|%s" % uid, nickname)
    redis.set("headimg|%s" % uid, r["headimgurl"])
    #generate ticket
    ticket = str(ObjectId())
    redis.setex("ticket2id|%s" % ticket, 7 * 24 * 3600, uid)
    return resp("ok", {"ticket": ticket, "openid": openid, "uid": uid})

@app.errorhandler(404)
@app.route("/")
def index(*_):
    return app.send_static_file("index.html");

def total_paragraph(doc):
    f = epub.open("%s%s" % (document_path, doc_dict[doc]))
    s = 0
    counter = HTMLParagraphCounter()
    for item in f.opf.spine.itemrefs:
        domStr = f.read_item(f.opf.manifest[item[0]]).decode("utf-8")
        s += counter.parse(domStr)
    return s

def paragraph_until_cfi(doc, cfiStr):
    cfi = CFI(cfiStr)
    counter = HTMLParagraphCounter()
    f = epub.open("%s%s" % (document_path, doc_dict[doc]))
    s = 0
    for i in range(0, cfi.spinePos):
        domStr = f.read_item(f.opf.manifest[f.opf.spine.itemrefs[i][0]]).decode("utf-8")
        s += counter.parse(domStr)
    s += cfi.steps[1]["index"]
    return s

class HTMLParagraphCounter(HTMLParser):
    def __init__(self):
        super().__init__()
        self.body = False
        self.level = 0
        self.counter = 0
    def handle_starttag(self, tag, attrs):
        if (tag.upper() == "BODY"):
            self.body = True
        if (self.body):
            self.level += 1
            if (self.level == 2):
                self.counter += 1
    def handle_endtag(self, tag):
        if (tag.upper() == "BODY"):
            self.body = False
            self.level = 0
        if (self.body):
            self.level -= 1
    def parse(self, html):
        self.feed(html)
        self.body = False
        self.level = 0
        r = self.counter
        self.counter = 0
        return r

class User(UserMixin):
    def __init__(self, id):
        self.id = id

class CFI():
    def __init__(self, cfiStr):
        if (type(cfiStr) != str):
            self.spinePos = -1
            return
        self.str = cfiStr
        if (cfiStr.find("epubcfi(") == 0 and cfiStr[len(cfiStr) - 1] == ")"):
            cfiStr = cfiStr[8: len(cfiStr) - 1]
        chapterComponent = getChapterComponent(cfiStr)
        pathComponent = getPathComponent(cfiStr) or ''
        characterOffsetComponent = getCharacterOffsetComponent(cfiStr)
        if (not chapterComponent):
            self.spinePos = -1
            return
        chapSegment = chapterComponent.split("/")[2] or ''
        if(not chapSegment):
            self.spinePos = -1
            return
        self.spinePos = int(int(re.search(r'(\d+)', chapSegment).group(1)) / 2 - 1) or 0
        chapId = re.search(r"\[(.*)\]", chapSegment)
        self.spineId = chapId.group(1) if (chapId) else False
        if(pathComponent.find(',') != -1):
            print("CFI Ranges are not supported")
        path = pathComponent.split('/')
        end = path.pop()
        self.steps = [];
        for part in path:
            if (part):
                part = re.search(r'(\d+)', part).group(1)
                step = parseStep(part)
                self.steps.append(step)
        endInt = int(end)
        if (endInt):
            if (endInt % 2 == 0):
                self.steps.append(parseStep(end))
            else:
                self.steps.append({
                    "type": "text",
                    "index": int((endInt - 1 ) / 2)
                })
        assertion = re.search(r"\[(.*)\]", characterOffsetComponent)
        if (assertion and assertion.group(1)):
            self.characterOffset = int(characterOffsetComponent.split('[')[0])
            self.textLocationAssertion = assertion.group(1)
        else:
            self.characterOffset = int(characterOffsetComponent)

def parseStep(part):
    id = False
    t = "element";
    index = int(int(part) / 2 - 1)
    match = re.search(r"\[(.*)\]", part)
    if (match and match.group(1)):
        id = match.group(1)
    return {
        "type": t,
        "index": index,
        "id": id or False
    }

def getChapterComponent(cfiStr):
    return cfiStr.split("!")[0]

def getPathComponent(cfiStr):
    splitStr = cfiStr.split("!");
    pathComponent = splitStr[1].split(":") if (splitStr[1]) else ''
    return pathComponent[0]

def getCharacterOffsetComponent(cfiStr):
    splitStr = cfiStr.split(":")
    return splitStr[1] or ''


################################

class Node():
    def __init__(self, value, parent):
        self.value = value
        self.parent = parent
        self.nodes = []
        if parent is not None:
            parent.nodes.append(self)

    def __repr__(self):
        return self.value

def history():
    length = redis.llen("history")
    for i in range(length):
        yield json.loads(redis.lindex("history", i))

def document_filter(history, documents):
    for record in history:
        if record["document"] in documents:
            yield record

def find_node(root, uid):
    for node in walk(root):
        if node.value == uid:
            return node
    return None

def build_tree_from_history(docId):
    root = Node(None, None)
    for record in document_filter(history(), [docId]):
        # if record["action"] == "UPLOAD":
        #     root = Node(record["uid"], None)
        if (record["action"] == "SHARE"):
            node = find_node(root, record["uid"])
            if node is None:
                node = Node(record["uid"], root)
            if record["target"] not in parents(node):
                child = Node(record["target"], node)
    return root

def walk(root):
    yield root
    for node in root.nodes:
        for result in walk(node):
            yield result

def parents(node, level = None):
    p = []
    if level is not None:
        while level > 0 and node.parent is not None:
            node = node.parent
            p.append(node)
            level -= 1
    else:
        while node.parent is not None:
            node = node.parent
            p.append(node)
    return p

def pay(payer, docId):
    for node in walk(build_tree_from_history(docId)):
        if node.value == payer:
            payee = parents(node, 3)
            shared = {}
            for idx, x in enumerate(payee):
                if idx < len(payee)-1:
                    shared[x.value] = share_rate ** (idx + 1) - share_rate ** (idx + 2)
                else:
                    shared[x.value] = share_rate ** (idx + 1)
            return shared
    return {}
################################

@login_manager.request_loader
def load_user_from_request(request):
    ticket = request.cookies.get("ticket")
    if ticket:
        return User(redis.get("ticket2id|%s" % ticket))
    return None

def make_history(history):
    redis.rpush("history", json.dumps(history))

def resp(code, ret = {}):
    content = json.dumps({"code": code, "ret": ret})
    resp = Response(content, mimetype="application/json")
    return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)