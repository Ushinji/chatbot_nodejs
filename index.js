var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');
var wiki = require("node-wikipedia");

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
            var phrase = req.body['events'][0]['message']['text'];
            var luis_url = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/37005d38-9ccf-4963-af7a-d6b1bf049654";
            var luis_query = {
                "subscription-key":process.env.LUIS_SUBSCRIPTION_KEY,
                "staging":true,
                "timezoneOffset":0,
                "verbose":true,
                "q":phrase,
            };
            var luis_options = {
                url: luis_url,
                headers : {'Content-Type' : 'application/json'},
                qs: luis_query,
                json: true,
            };
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
                            // 検索ワードの中にスペースがある場合は、取り除く
                            var str_space = " ";
                            result['search_word']
                                = entity.entity.replace(str_space,"");
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
            var wiki_url = 'http://wikipedia.simpleapi.net/api';
            var wiki_query = {
                'output':'json',
                'keyword':result['search_word'],
            };
            var wiki_options = {
                url: wiki_url,
                headers : {'Content-Type' : 'application/json'},
                qs: wiki_query,
                json: true,
            };
            request.get( wiki_options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(response.body);
                    if(response.body != null ){
                        // Wiki本文のうち、140文字を抽出
                        result['wiki_content']
                            = response.body[0].body.substr(0,140);
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
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            };

            var data = {};
            if('search_word' in result && 'wiki_content' in result){
                data = {
                    'replyToken': req.body['events'][0]['replyToken'],
                    "messages": [
                        {
                            "type":"text",
                            "text": result['search_word'] + 'について説明しよう！',
                        },
                        {
                            "type":"text",
                            "text": result['wiki_content'],
                        }
                    ]
                };
            }else{
                data = {
                    'replyToken': req.body['events'][0]['replyToken'],
                    "messages": [
                        {
                            "type":"text",
                            "text":'ぐぬぬ...',
                        }
                    ]
                };
            }

            var options = {
                url: 'https://api.line.me/v2/bot/message/reply',
                proxy: process.env.FIXIE_URL,
                headers: headers,
                json: true,
                body: data
            };

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
