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
            if( req.body['events'][0]['message'] != "messages"
                || req.body['events'][0]['message']['type'] != "text" ){
                return;
            }

            // 入力された本文を取得し、LUISのAPIヘ送信
            var phrase = req.body['events'][0]['message']['text'];
            var luis_options = api.create_luis_options(phrase);

            var result = {};
            request.get(luis_options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if('error' in body){
                        console.log("検索エラー" + JSON.stringify(body));
                        return;
                    }

                    if('intent' in body.topScoringIntent){
                        result['intent'] = body.topScoringIntent.intent;
                    }

                    body.entities.forEach(function(entity){
                        if( entity.type == "search_word" ){
                            result['search_word'] = entity.entity;
                        }
                    });

                    callback(null, result);

                } else {
                    console.log('error: '+ response.statusCode);
                    return;
                }
            });
        },
        // Wikipediaで検索
        function(result, callback) {
            var wiki_options = api.create_wiki_options(result['search_word']);
            request.get( wiki_options, function (error, response, body) {
                if (!error && response.statusCode == 200) {

                    if(response.body != null ){
                        result['wiki_content'] = response.body[0].body;
                    }
                    callback(null, result);
                }
                else {
                    console.log('error: '+ response.statusCode);
                    return;
                }
            });
        }],

        // LINEの応答の作成
        function(err, result) {
            var line_options = api.create_line_options(req, resutl);
            request.post(options, function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(body);
                } else {
                    console.log('error: ' + JSON.stringify(response));
                }
            });
        }
    );
});

app.listen(app.get('port'), function() {
    console.log('Node app is running');
});
