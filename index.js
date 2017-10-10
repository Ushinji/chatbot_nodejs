var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var crypto = require("crypto");
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
                // リクエストがLINE Platformから送られてきたか確認する
                if (!validate_signature(req.headers['x-line-signature'], req.body)) {
                    return;
                }
                // テキストが送られてきた場合のみ返事をする
                if ((req.body['events'][0]['type'] != 'message')
                    || (req.body['events'][0]['message']['type'] != 'text')) {
                    return;
                }

                // ぐるなびAPI レストラン検索API
                var gnavi_url = 'https://api.gnavi.co.jp/RestSearchAPI/20150630/';

                // ぐるなび リクエストパラメータの設定
                var gnavi_query = {
                    "keyid":process.env.GNAVI_ACCESS_KEY,
                    "format":"json",
                    "address":"東京都渋谷区",
                    "hit_per_page":1,
                    "freeword":"ラーメン",
                    "freeword_condition":2
                };
                var gnavi_options = {
                    url: gnavi_url,
                    headers : {'Content-Type' : 'application/json; charset=UTF-8'},
                    qs: gnavi_query,
                    json: true
                };

                // 検索結果をオブジェクト化
                var search_result = {};

                request.get(gnavi_options, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        if('error' in body){
                            console.log("検索エラー" + JSON.stringify(body));
                            return;
                        }
                        // 店名
                        if('name' in body.rest){
                            search_result['name'] = body.rest.name;
                        }
                        callback(null, search_result);
                    } else {
                        console.log('error: '+ response.statusCode);
                    }
                });
            },
        ],
        function(err, search_result) {
            //ヘッダーを定義
            var headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
            };

            // 送信データ作成
            var data = {
                'replyToken': req.body['events'][0]['replyToken'],
                "messages": [{
                    "type": "text",
                    "text": search_result['name']
                }]
            };

            //オプションを定義
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

// 署名検証
function validate_signature(signature, body) {
    return signature == crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(new Buffer(JSON.stringify(body), 'utf8')).digest('base64');
}
