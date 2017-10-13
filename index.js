var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');

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
                // 検索キーワード
                var in_word = req.body['events'][0]['message']['text'];

                var url = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/37005d38-9ccf-4963-af7a-d6b1bf049654";

                // ぐるなび リクエストパラメータの設定
                var luis_query = {
                    "subscription-key":process.env.LUIS_SUBSCRIPTION_KEY,
                    "staging":true,
                    "timezoneOffset":0,
                    "verbose":true,
                    "q":in_word
                };

                //オプションを定義
                var luis_options = {
                    url: url,
                    headers : {'Content-Type' : 'application/json'},
                    qs: luis_query,
                    json: true,
                };

                // 検索結果をオブジェクト化
                var luis_result = {};

                request.get(luis_options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        if('error' in body){
                            console.log("検索エラー" + JSON.stringify(body));
                            return;
                        }
                        // インテント取得
                        if('intent' in body.topScoringIntent){
                            luis_result['intent'] = body.topScoringIntent.intent;
                        }
                        // 検索ワード
                        if('type' in body.entities){
                            body.entities.forEach(function(entity){
                                if( entity.type == "search_word"){
                                    luis_result['search_word'] = body.rest.entity;
                                }
                            });
                        }
                        console.log(body);
                        callback(null, luis_result);
                    } else {
                        console.log('error: '+ response.statusCode);
                    }
                });
            },
        ],
        function(err, luis_result) {
            //ヘッダーを定義
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            };
            var data = {
                'replyToken': req.body['events'][0]['replyToken'],
                "messages": [
                    // テキスト
                    {
                        "type":"text",
                        "text": '検索ワードはこちらですか？\n【検索ワード】'+ luis_result['search_word']
                    }
                ]
            };
            //オプションを定義
            var options = {
                url: 'https://api.line.me/v2/bot/message/reply',
                proxy: process.env.FIXIE_URL,
                headers: headers,
                json: true,
                body: data
            };
            // LINEメッセージ送信元へメッセージを送信
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
