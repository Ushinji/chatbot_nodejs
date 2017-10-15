var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');

var api = require('./api.js');

app.set('port', (process.env.PORT || 8000));
// JSONの送信を許可
app.use(bodyParser.urlencoded({
    extended: true
}));
// JSONのパースを楽に（受信時）
app.use(bodyParser.json());

app.post('/callback', function(req, res) {
    async.waterfall([
        function(callback) {
            // テキストが送られてきた場合のみ返事をする
            if ((req.body['events'][0]['type'] != 'message')
                || (req.body['events'][0]['message']['type'] != 'text')) {
                return;
            }
            // 入力された本文を取得し、LUISのAPIヘ送信
            var result = {};
            var phrase = req.body['events'][0]['message']['text'];
            api.analyze_by_luis(phrase, function(result){
                callback(null, result);
            });
        },
        // Wikipediaで検索
        function(result, callback) {
            var search_word = result['search_word'];
            api.get_wiki_content(search_word, function(wiki_content){
                result['wiki_content'] = wiki_content;
                callback(null, result);
            });
        }],
        // LINEの応答の作成
        function(err, result) {
            api.send_line_response(req, result, function(result){
            });
        }
    );
});

app.listen(app.get('port'), function() {
    console.log('Node app is running');
});
