require("./static/menu.css");
require("./static/style.css");
require("./static/introduction.css");
require("./static/payment.css");
require("./static/guide.css");
window.jQuery = window.$ = require("./node_modules/jquery/dist/jquery.min.js");

window.RSVP = require("./node_modules/rsvp/dist/rsvp.js");
window.ePub = require("./node_modules/epubjs/build/epub.js");
window.JSZip = require("jszip")
import "inobounce"
import "jquery-ui"
import React from "react"
import ReactDOM from "react-dom"
import Hammer from "hammerjs"
import QRCode from "react-qr"
import Cookies from "js-cookie"
import { Router, Route, IndexRoute, Link, IndexRedirect, browserHistory } from 'react-router'

const appId = "wx6a3e59d1061ba5b4"
const shareTitleSingle = "太平洋大劫杀。你开始读，我就能活下去"
const shareTitle = "太平洋大劫杀"
const shareDescription = "郭国松"
const shareImg = "http://7xizu1.com1.z0.glb.clouddn.com/@/image/572fc733e4b06db6a571729b.jpg"

export class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "Unknown",
      headimg: "about:blank",
      balance: 0,
      id: this.props.params.doc,
      doc: undefined,
      cover: undefined,
      author: undefined,
      book_name: undefined,
      progress: 0,
      total: 0,
      paid: false,
      rank: []
    }
  }
  handleSwipeUp(e) {
    $(".menu-cover").show();
    $(".menu-cover").animate({
      'opacity': 0.6,
    },{duration:200,queue:false,
    specialEasing:{'bottom': 'linear', 'opacity':'linear'}});
    $(".menu").animate({
       'bottom': 0,
       'height': "90%",
       'opacity': 1
    },{duration:200,queue:false,
    specialEasing:{'bottom': 'linear', 'opacity':'linear'}});
  }
  handleSwipeDown(e) {
    $(".menu-cover").animate({
      'opacity': 0,
    },{
      duration:200,
      queue:false,
      specialEasing:{'bottom': 'linear', 'opacity':'linear'},
      complete: function(){
        $(".menu-cover").hide();
      }
    });
    $(".menu").animate({
       'bottom': -$(".menu").outerHeight(true),
       'height': "0%",
       'opacity': 0
    },{duration:200,queue:false,
    specialEasing:{'bottom': 'linear', 'opacity':'linear'}});
  }
  componentDidMount() {
    var self = this;
    $(".menu").css({
      'bottom': -$(".menu").outerHeight(true)
    });
    $.get({
      url: "/api/doc/" + self.state.id,
      success: function(resp){
        if (resp.code == "ok"){
          self.setState({
            doc: "reader/" + resp.ret.file,
            author: resp.ret.author,
            cover: "/" + resp.ret.cover,
            book_name: resp.ret.name
          })
        }else{
          alert(resp);
        }
      }
    })
    var mainBoard = document.getElementById('container');
    var mc = new Hammer(mainBoard);
    mc.get('swipe').set({ direction: Hammer.DIRECTION_VERTICAL });
    mc.on("swipeup", this.handleSwipeUp);
    mc.on("swipedown", this.handleSwipeDown);
    this.reloadUserRank();
    this.reloadUserInfo();
    var height = $(".progress").width();
    $(".progress").height(height);
    $(".progress").width(height);
    $(".circle-left, .left").css({
      clip: "rect(0 " + (height/2) + "px " + height + "px 0)"
    })
    $(".circle-right, .right").css({
      clip: "rect(0 " + height + "px " + height + "px " +(height/2)+ "px)"
    })
    $(".clip").height(height-4);
    $(".clip").width(height-4);
    window.alert = this.handleOpenAlert;
    $("#container").css({
      'height': $(window).height(),
      'width': $(window).width()
    })

    wx.ready(function(){
      wx.onMenuShareTimeline({
        title: shareTitleSingle,
        link: window.location.origin + "/" + self.state.id + "/share/" + localStorage.uid,
        imgUrl: shareImg
      });
      wx.onMenuShareAppMessage({
        title: shareTitle,
        desc: shareDescription,
        link: window.location.origin + "/" + self.state.id + "/share/" + localStorage.uid,
        imgUrl: shareImg
      })
    })

  }
  reloadUserRank(){
    var self = this;
    $.get({
      url: "/api/" + self.state.id + "/rank",
      success: function(resp){
        if (resp.code == "ok"){
          self.setState({
            progress: resp.ret.me,
            total: resp.ret.total,
            rank: resp.ret.rank
          });
          var num = (resp.ret.me/resp.ret.total * 100).toFixed(0) * 3.6;
          if (num<=180) {
              $('.right').css('transform', "rotate(" + num + "deg)");
          } else {
              $('.right').css('transform', "rotate(180deg)");
              $('.left').css('transform', "rotate(" + (num - 180) + "deg)");
          };

        }
      }
    })
  }
  reloadUserInfo(){
    var self = this;
    $.get({
      url: "/api/user",
      success: function(resp){
        if(resp.code == "ok"){
          self.setState({
            name: resp.ret.name,
            headimg: resp.ret.headimg,
            balance: resp.ret.balance,
            paid: resp.ret.paid
          })
        }else{
          alert(resp);
        }
      },
      error: function(httpObj, textStatus){
        if (httpObj.status == 401){
          Auth.logout();
          window.location.reload(true);
        }
      }
    })
  }
  handleShare(e){
    alert("请点击微信右上角分享");
  }
  handleTopup(e){
    window.location = "/payment";
  }
  handleCloseAlert(e){
    $(".alert").hide();
    $(".alert-cover").hide();
  }
  handleOpenAlert(){
    var str = ' '
    for (var i = 0; i < arguments.length; i++) {
        str += arguments[i] + ' ';
    }
    $(".alert-body > div").text(str);
    $(".alert").show();
    $(".alert-cover").show();
  }
  render() {
      return (
          <div id="container">
            {this.props.children && this.state.doc && React.cloneElement(this.props.children, $.extend(this.state, {reloadUserRank: this.reloadUserRank.bind(this), reloadUserInfo: this.reloadUserInfo.bind(this), handleShare: this.handleShare.bind(this)}))}
            <div className="black-cover menu-cover" />
            <div className="menu">
              <div className="profile">
                <div className="info">
                  <div className="user">
                    <img src={this.state.headimg.replace(/0$/, '64')}/>
                    <div>
                      <span>余额：{this.state.balance}</span>
                      <span>{this.state.name}</span>
                    </div>
                  </div>
                  {this.state.paid ? (
                    <div className="dashboard">
                      <button onClick={this.handleShare.bind(this)}>分享</button>
                    </div>
                  ) : (
                    <div className="dashboard">
                      <button onClick={this.handleTopup.bind(this)}>充值</button>
                      <button onClick={this.handleShare.bind(this)}>分享</button>
                    </div>
                  )}
                </div>
                <div className="progress">
                  <div className="circle-left">
                    <div className="left"></div>
                  </div>
                  <div className="circle-right">
                    <div className="right"></div>
                  </div>
                  <div className="clip">
                    <div className="progress-word">
                      <span>{(this.state.progress/this.state.total * 100).toFixed(0)}%</span>
                      <span>{this.state.progress}/{this.state.total}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rank">
                {this.state.rank.map(function(r, i){
                  return (
                    <div className={"rank_" + (i+1)} key={r.id}>
                      <div className="figure" ></div>
                      <div className="rank_detail" style={{width: (r.progress/this.state.total * 86).toFixed(0) + "%"}}>
                        <div className="progress-bar"></div>
                        <div className="name">
                          <span>{r.name}</span>
                          <span>{r.progress}</span>
                        </div>
                      </div>
                    </div>
                  )}, this)}
              </div>
            </div>
            <div className="black-cover alert-cover" />
            <div className="alert">
              <div className="alert-body">
                <div>Hello World.</div>
                <button onClick={this.handleCloseAlert.bind(this)}>知道了</button>
              </div>
            </div>
          </div>
      );
  }
}

class Reader extends React.Component {
  constructor(props){
    super(props);
  }
  componentDidMount() {
    var self = this;
    this.Book = ePub("/" + this.props.doc, {
                width: $(window).width() - 80,
                height: $(window).height() - 80,
                spreads: false
    });
    window.Book = this.Book;
    var self = this;
    this.Book.renderTo("reader");
    this.Book.ready.all.then(function(){
      $.get({
        url: "/api/" + self.props.id + "/progress",
        success: function(r){
          if (r.code == "ok" && r.ret && r.ret.progress){
            self.Book.displayChapter(r.ret.progress);
          }
        }
      })
    });
    this.Book.on('book:atEnd', function(e){
      window.location = "/" + self.props.id + "/end";
    })
    this.Book.on('renderer:visibleRangeChanged', function(e){
      $("#reader").addClass("blur");
      $.get({
        url: "/api/" + self.props.id + "/permission",
        data: {
          start: e.start,
          end: e.end
        },
        success: function(r){
          if (r.code == "fail"){
            $.post({
              url: "/api/" + self.props.id + "/payment",
              data: {
                start: e.start,
                end: e.end
              },
              success: function(r){
                if (r.code == "ok"){
                  $("#reader").removeClass("blur");
                  self.props.reloadUserInfo();
                  self.props.reloadUserRank();
                }else{
                  if (self.props.paid) {
                    alert("想读更多？快快分享好友。")
                  }else{
                    alert("点数不够啦，请充值或分享吧！");
                  }
                  self.Book.prevPage();
                }
              }
            })
          }else{
            $("#reader").removeClass("blur");
          }
        }
      })
    })
  }
  handlePrevPage(e) {
    if (!$("#reader").hasClass("blur")){
      this.Book.prevPage();
    }
  }
  handleNextPage(e) {
    if (!$("#reader").hasClass("blur")){
      this.Book.nextPage();
    }
  }
  render() {
    return (
      <div id="main">
        <div className="glass" > </div>
        <div className="pager prev" onClick={this.handlePrevPage.bind(this)}> </div>
        <div id="wrapper">
          <div id="reader"></div>
        </div>
        <div className="pager next" onClick={this.handleNextPage.bind(this)}> </div>
      </div>
    )
  }
}
class Introduction extends React.Component {
  constructor(props){
    super(props);
  }
  handleStart() {
    window.location = "/"+this.props.id+"/guide";
  }
  render() {
    return (
      <div id="introduction">
        <img className="introduction-cover" src="/introduction.png" />
        <div className="introduction-content">
          <p>咦，你也来玩“一元读”游戏啦！</p>
          <p>全网首发《太平洋大劫杀》惟一完整版</p>
          <p>游戏规则：</p>
          <p>Ａ.0元开始读，1元赏作者。</p>
          <p>Ｂ.分享赢分成。每个朋友通过你的分享开始阅读，你就能获得分成。你分享越多，越快读到大结局。</p>
          <p>Ｃ.最快读完的前500名同学每人奖励10元。</p>
        </div>
        <div className="center-block">
          <button className="button center-block" onClick={this.handleStart.bind(this)}>读起！</button>
        </div>
      </div>
    )
  }
}


class Guide extends React.Component {
    constructor(props) {
      super(props);
    }
    componentDidMount() {
    }
    handleStart(e){
      var guide = $(".guide");
      if (guide.is(":visible")){
        guide.hide();
      }else{
        window.location = "/"+this.props.id+"/read";
      }
    }
    render() {
        return (<div className="cover-page" onClick={this.handleStart.bind(this)}>
            <div className="cover-body center-block">
                <img className="cover" src={this.props.cover} />
                <div className="book-name" >{this.props.book_name}</div>
                <div className="book-author" >{this.props.author}</div>
            </div>
            <div className="cover-footer"></div>
            <div className="guide">
              <div className="center-block">
                <div><img src="/tap.png" />向前翻页</div>
                <div>向后翻页<img src="/tap.png" /></div>
              </div>
              <div className="guide-menu"><img src="/hand_up.png" />菜单</div>
            </div>
          </div>);
    }
}

class PaymentPage extends React.Component {
    constructor(props) {
      super(props);
      this.state = { qrcode: undefined }
    }
    componentDidMount() {
      $(".payment").css({
        'height': $(window).height(),
        'width': $(window).width()
      })     
    }
    handlePayment(){
      var self = this;
      var timestamp = Math.floor(Date.now()/1000);
      var nonceStr = Math.random().toString(36).slice(2);
      var signType = "MD5";
      $.get({
        url: "/api/wechat/payment",
        data: {
          timeStamp: timestamp,
          nonceStr: nonceStr,
          openId: localStorage.openid
        },
        success: function(resp) {
          if(resp.code == "ok"){
            wx.chooseWXPay({
              timestamp: timestamp,
              nonceStr: nonceStr,
              package: resp.ret.package,
              signType: signType,
              paySign: resp.ret.paySign,
              success: function(res){
                if(res.errMsg == "chooseWXPay:ok"){
                  window.history.back();
                }else if(res.errMsg == "chooseWXPay:cancel"){
                  
                }
              },
              fail: function(res){
                $.get({
                  url: "/api/wechat/qrpayment",
                  success: function(resp) {
                    if (resp.code == "ok"){
                      self.setState({qrcode: resp.ret})
                    }else{
                      alert(resp)
                    }
                  }
                })
              }
            })
          }else{
            alert(resp)
          }
        }
      })
    }
    handleGoBack(e){
      window.history.back();
    }
    render() {
      return (<div className="payment">
        <div className="payment-top center-block">
            <p>赞赏一下作者吧！</p>
            <p>公告：本游戏不接受超过1元的充值哦。</p>
            <div>
              <a className="button" onClick={this.handleGoBack.bind(this)}>1块也没有:(</a>
              <a className="button" onClick={this.handlePayment.bind(this)}>正好有1块:)</a>
            </div>
        </div>
        <div className="payment-qr">
          {this.state.qrcode ? (
            <div>
              <div>出现跨号支付？请长按二维码支付</div>
              <QRCode text={this.state.qrcode} />
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>);
    }
}

export default PaymentPage;


class SharePage extends React.Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
      var self = this;
      if (self.props.params.uid && self.props.params.uid != localStorage.uid){
        $.post({
          url: "/api/share/" + self.props.id + "/" + self.props.params.uid,
          success: function(){
            window.location = "/" + self.props.id + "/dispatch";
          }
        })
      }else{
        window.location = "/" + this.props.id + "/dispatch";
      }
    }
    render() {
        return <div />
    }
}

class LoginPage extends React.Component {
  componentWillMount() {
    var { code, state } = this.props.location.query;
    this.setState({code: code, state: state})
  }
  componentDidMount(){
    if (this.state.code) {
      var self = this;
      var code = this.state.code;
      $.get({
        url: "/api/authentication",
        data: "code=" + code,
        success: function(resp){
          if(resp.code == "ok"){
            Auth.login(resp.ret.ticket, resp.ret.uid, resp.ret.openid)
            if (self.state.state && self.state.state != "undefined"){
              window.location = sessionStorage[self.state.state]
              delete sessionStorage[self.state.state]
            }else{
              window.location = '/'
            }
          }else{
            alert(resp)
          }
        }
      })
    }else{
      var state = undefined;
      const { location } = this.props
      if (location.state && location.state.nextPathname) {
        state = Math.random().toString(36).slice(2,10);
        sessionStorage[state] = location.state.nextPathname;
      }
      var url = "https://open.weixin.qq.com/connect/oauth2/authorize?appid="+appId+"&redirect_uri="+encodeURIComponent("http://www.zan-shang.com/bc/login")+"&response_type=code&scope=snsapi_userinfo&state="+state+"#wechat_redirect"
      window.location = url
    }
  }
  render() {
    return (
      <div />
    )
  }
}

class DispatchPage extends React.Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
      var self = this;
      $.get({
        url: "/api/" + self.props.id + "/progress",
        success: function(r){
          if (r.code == "ok" && r.ret && r.ret.progress){
            window.location = "/" + self.props.id + "/read";
          }else{
            window.location = "/" + self.props.id + "/introduction";
          }
        }
      })  
    }
    render() {
        return <div />;
    }
}

class EndPage extends React.Component {
    constructor(props) {
        super(props);
        this.displayName = 'EndPage';
    }
    render() {
      return (<div className="payment">
        <div className="payment-top center-block">
          <p>关注  “比特阅读”公号，为您同步阅读进度。点开作品链接，随时随地，想读就读。</p>
        </div>
        <div className="payment-qr">
            <div>
              <img src="/qrcode.jpg" width="150" height="150" />
            </div>
        </div>
      </div>);
    }
}

var Auth = {
  login: function(ticket, uid, openid, callback) {
    Cookies.set("ticket", ticket);
    localStorage.openid = openid;
    localStorage.uid = uid;
    this.onChange(true)
  },

  getToken: function() {
    return Cookies.get("ticket")
  },

  logout: function() {
    Cookies.remove("ticket")
    delete localStorage.openid;
    delete localStorage.uid;
    this.onChange(false)
  },

  loggedIn: function() {
    return !!Cookies.get("ticket")
  },
  onChange() {}
}

function requireAuth(nextState, replace) {
  if (!Auth.loggedIn()) {
    replace({
      pathname: '/login',
      state: { nextPathname: nextState.location.pathname }
    })
  }
}

function routeOnChange(nextState, replace){

  var nonceStr = Math.random().toString(36).slice(2);
  var url = nextState.location.pathname;
  var timestamp = Math.floor(Date.now()/1000);
  $.get({
    url: "/api/wechat/signature",
    data: {
      nonceStr: nonceStr,
      url: url,
      timestamp: timestamp
    },
    success: function(resp){
      if(resp.code == "ok"){
        wx.config({
            debug: false,
            appId: appId,
            timestamp: timestamp,
            nonceStr: nonceStr, // 必填，生成签名的随机串
            signature: resp.ret,// 必填，签名，见附录1
            jsApiList: ["onMenuShareTimeline", "onMenuShareAppMessage", "chooseWXPay"]
        });
      }else{
        alert(resp);
      }
    }
  })

}

ReactDOM.render(
  <Router history={browserHistory}>
    <Route path="/login" component={LoginPage} />
    <Route path="/payment" component={PaymentPage} onEnter={routeOnChange}/>
    <Route path="/:doc" component={App} onEnter={requireAuth}>
      <IndexRoute component={DispatchPage}/>
      <Route path="read" component={Reader} onEnter={routeOnChange}/>
      <Route path="introduction" component={Introduction} onEnter={routeOnChange}/>
      <Route path="guide" component={Guide} onEnter={routeOnChange}/>
      <Route path="dispatch" component={DispatchPage} onEnter={routeOnChange}/>
      <Route path="share/:uid" component={SharePage} onEnter={routeOnChange}/>
      <Route path="end" component={EndPage} onEnter={routeOnChange}/>
    </Route>
  </Router>
  , document.querySelector("#myApp")
);