require("./node_modules/bootstrap/dist/css/bootstrap.min.css");
require("./style.css");
window.jQuery = window.$ = require("./node_modules/jquery/dist/jquery.min.js");
require("./node_modules/bootstrap/dist/js/bootstrap.min.js");
window.RSVP = require("./node_modules/rsvp/dist/rsvp.js");
window.ePub = require("./node_modules/epubjs/build/epub.js");
window.JSZip = require("jszip")
import "inobounce"
import React from "react"
import ReactDOM from "react-dom"
import Hammer from "hammerjs"
import QRCode from "qrcode.react"
import Cookies from "js-cookie"
import { Router, Route, IndexRoute, Link, IndexRedirect, browserHistory } from 'react-router'

const appId = "wx6a3e59d1061ba5b4"
const shareTitle = "ShareTitle"
const shareDescription = "ShareDescription"
const shareImg = "http://LiNk"
const introduction = "我参加了这个接力阅读的游戏！看谁读的远。我参加了这个接力阅读的游戏！看谁读的远。我参加了这个接力阅读的游戏！看谁读的远。我参加了这个接力阅读的游戏！看谁读的远。我参加了这个接力阅读的游戏！看谁读的远。我参加了这个接力阅读的游戏！看谁读的远。"

export class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: "Unknown",
      headimg: "about:blank",
      balance: 0,
      id: this.props.params.doc,
      doc: undefined,
      progress: 0,
      total: 0,
      rank: []
    }
  }
  handleSwipeUp(e) {
    $(".black-cover").show();
    $(".black-cover").animate({
      'opacity': 0.6,
    },{duration:200,queue:false,
    specialEasing:{'bottom': 'linear', 'opacity':'linear'}});
    $("#profile").animate({
       'bottom': 0,
       'height': "90%",
       'opacity': 1
    },{duration:200,queue:false,
    specialEasing:{'bottom': 'linear', 'opacity':'linear'}});
  }
  handleSwipeDown(e) {
    $(".black-cover").animate({
      'opacity': 0,
    },{
      duration:200,
      queue:false,
      specialEasing:{'bottom': 'linear', 'opacity':'linear'},
      complete: function(){
        $(".black-cover").hide();
      }
    });
    $("#profile").animate({
       'bottom': -$("#profile").outerHeight(true),
       'height': "0%",
       'opacity': 0
    },{duration:200,queue:false,
    specialEasing:{'bottom': 'linear', 'opacity':'linear'}});
  }
  componentDidMount() {
    var self = this;
    $("#profile").css({
      'bottom': -$("#profile").outerHeight(true)
    });
    $.get({
      url: "/api/doc/" + self.state.id,
      success: function(resp){
        if (resp.code == "ok"){
          self.setState({
            doc: "reader/" + resp.ret
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
          })
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
            balance: resp.ret.balance
          })
        }else{
          alert(resp);
        }
      }
    })
  }
  handleShare(e){
    alert("请点击微信右上角分享");
  }
  handleTopup(e){
    window.location.replace("/"+this.props.params.doc+"/payment");
  }
  render() {
      return (
          <div id="container">
            {this.props.children && this.state.doc && React.cloneElement(this.props.children, $.extend(this.state, {reloadUserRank: this.reloadUserRank.bind(this), reloadUserInfo: this.reloadUserInfo.bind(this), handleShare: this.handleShare.bind(this)}))}
            <div className="black-cover" />
            <div id="profile">
              <div className="row">
                <div className="center-block col-xs-5 col-sm-5 col-md-5 col-lg-5">
                  <img src={this.state.headimg.replace(/0$/, '64')}/>
                  <h4>{this.state.name}</h4>
                </div>
                <div className="col-xs-7 col-sm-7 col-md-7 col-lg-7">
                  <h5>进度：{this.state.progress}/{this.state.total}</h5>
                  <h5>余额：{this.state.balance}</h5>
                  <div className="justify-center">
                    <button className="btn btn-sm btn-default" onClick={this.handleTopup.bind(this)}>充值</button>
                    <button className="btn btn-sm btn-default" onClick={this.handleShare.bind(this)}>分享</button>
                  </div>
                </div>
              </div>
              <hr/>
              <table className="table table-striped table-content">
                <tbody>
                {this.state.rank.map(function(r, i){
                  return (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.progress}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
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
                  alert("点数不够啦，请充值或分享吧！");
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
  componentDidMount() {
    $("#introduction").css({
      'height': $(window).height()-40,
      'width': $(window).width()-40
    })
  }
  handleStart() {
    window.location.replace("/"+this.props.id+"/guide");
  }
  render() {
    return (
      <div id="introduction">
        {this.props.name}！{introduction}
        <div className="center-block">
          <button className="btn btn-default" onClick={this.handleStart.bind(this)}>开始阅读</button>
        </div>
      </div>
    )
  }
}


class Guide extends React.Component {
    constructor(props) {
        super(props);
    }
    handleNext(e){
      console.log("Click");
      var e = $(".guide.show");
      var next = e.next();
      e.removeClass("show");
      if(next.length != 0){
        next.addClass("show");
      }else{
        window.location.replace("/"+this.props.id+"/read");
      }
    }
    render() {
        return (<div>
            <div className="pager guide prev show" onClick={this.handleNext.bind(this)}> </div>
            <div className="pager guide next" onClick={this.handleNext.bind(this)}> </div>
            <div className="pager guide bottom" onClick={this.handleNext.bind(this)}> </div>
          </div>);
    }
}

class PaymentPage extends React.Component {
    constructor(props) {
      super(props);
      this.state = { qrcode: undefined }
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

                }else if(res.errMsg == "chooseWXPay:cancel"){
                  
                }else{
                  
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
    render() {
      return <div><a onClick={this.handlePayment.bind(this)}>Payment!</a>
        {this.state.qrcode ? (
            <QRCode value={this.state.qrcode} />
          ) : (
            <div />
          )}
      </div>;
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
          url: "/api/share/" + self.props.params.uid,
          success: function(){
            window.location.replace("/" + self.props.id + "/dispatch");
          }
        })
      }else{
        window.location.replace("/" + this.props.id + "/dispatch");
      }
    }
    render() {
        return <div />
    }
}

class LoginPage extends React.Component {
  componentWillMount() {
          console.log("herereherereherere ");
    var { code, state } = this.props.location.query;
    this.setState({code: code, state: state})
  }
  componentDidMount(){
          console.log("herere");
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
              window.location.replace(sessionStorage[self.state.state])
              delete sessionStorage[self.state.state]
            }else{
              window.location.replace('/')
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
      window.location.replace(url)
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
            window.location.replace("/" + self.props.id + "/read");
          }else{
            window.location.replace("/" + self.props.id + "/introduction");
          }
        }
      })  
    }
    render() {
        return <div />;
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
            debug: true,
            appId: appId,
            timestamp: timestamp,
            nonceStr: nonceStr, // 必填，生成签名的随机串
            signature: resp.ret,// 必填，签名，见附录1
            jsApiList: ["onMenuShareTimeline", "onMenuShareAppMessage", "chooseWXPay"]
        });
        wx.ready(function(){
          wx.onMenuShareTimeline({
            title: shareTitle,
            link: window.location.origin + "/share/" + localStorage.uid,
            imgUrl: shareImg
          });
          wx.onMenuShareAppMessage({
            title: shareTitle,
            desc: shareDescription,
            link: window.location.origin + "/share/" + localStorage.uid,
            imgUrl: shareImg
          })
        })

      }else{
        alert(resp);
      }
    }
  })

}

//1. 同步至最远
//4. 消费
//2. 充值 !
//3. 分享 !
//5. Guide

[App, Reader, Introduction, Guide, SharePage, LoginPage, DispatchPage].forEach(function(e){
  e.contextTypes = { router: function(){return React.PropTypes.object.isRequired}}
})

ReactDOM.render(
  <Router history={browserHistory}>
    <Route path="/login" component={LoginPage} />
    <Route path="/:doc" component={App} onEnter={requireAuth}>
      <IndexRoute component={DispatchPage}/>
      <Route path="read" component={Reader} onEnter={routeOnChange}/>
      <Route path="introduction" component={Introduction} onEnter={routeOnChange}/>
      <Route path="guide" component={Guide} onEnter={routeOnChange}/>
      <Route path="dispatch" component={DispatchPage} onEnter={routeOnChange}/>
      <Route path="share/:uid" component={SharePage} onEnter={routeOnChange}/>
      <Route path="payment" component={PaymentPage} onEnter={routeOnChange}/>
    </Route>
  </Router>
  , document.querySelector("#myApp")
);