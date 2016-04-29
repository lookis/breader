var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: [
        './index.jsx' // Your appʼs entry point
    ],
    devtool: process.env.WEBPACK_DEVTOOL || 'source-map',
    output: {
        path: path.join(__dirname, 'public', 'static'),
        publicPath: "/static/",
        filename: 'app.js'
    },
    resolve: {
        extensions: ['', '.js', '.jsx']
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loaders: ['react-hot', 'babel'],
            },

            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
                path: "/font",
                loader: "file?name=font/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.(woff|woff2)$/,
                path: "/font",
                loader: "url?limit=5000&name=font/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                path: "/font",
                loader: "url?limit=10000&mimetype=application/octet-stream&name=font/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                path: "/img",
                loader: "url?limit=10000&mimetype=image/svg+xml&name=img/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.gif/,
                path: "/img",
                loader: "url-loader?limit=10000&mimetype=image/gif&name=img/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.jpg/,
                path: "/img",
                loader: "url-loader?limit=10000&mimetype=image/jpg&name=img/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.png/,
                path: "/img",
                loader: "url-loader?limit=10000&mimetype=image/png&name=img/[name]_[md5:hash:hex:7].[ext]"
            },
            {
                test: /\.html/,
                loader: "file?name=[name].[ext]"
            }

             ]
    },
    devServer: {
        contentBase: "./public",
        noInfo: true, //  --no-info option
        hot: true,
        inline: true,
        historyApiFallback: true
    },
    plugins: [
      new webpack.NoErrorsPlugin(),
      new webpack.IgnorePlugin(/vertx/)
    ]
};
