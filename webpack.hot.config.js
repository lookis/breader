var defaultconf = require("./webpack.conf.js");
defaultconf.entry.unshift("webpack-dev-server/client?http://0.0.0.0:8080", "webpack/hot/only-dev-server")
module.exports = defaultconf