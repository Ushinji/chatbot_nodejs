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

                // 検索キーワード
                var search_place = req.body['events'][0]['message']['text'];
                var search_place_array = search_place.split("\n");
                var gnavi_keyword = "";
                if(search_place_array.length == 2){
                    var keyword_array = search_place_array[1].split("、");
                    gnavi_keyword = keyword_array.join();
                }

                // ぐるなびAPI レストラン検索API
                var gnavi_url = 'https://api.gnavi.co.jp/RestSearchAPI/20150630/';

                // ぐるなび リクエストパラメータの設定
                var gnavi_query = {
                    "keyid":process.env.GNAVI_ACCESS_KEY,
                    "format":"json",
                    "address":search_place_array[0],
                    "hit_per_page":1,
                    "freeword":gnavi_keyword,
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
                        // 画像
                        if('image_url' in body.rest){
                            search_result['shop_image1'] = body.rest.image_url.shop_image1;
                        }
                        // 住所
                        if('address' in body.rest){
                            search_result['address'] = body.rest.address;
                        }
                        // 緯度
                        if('latitude' in body.rest){
                            search_result['latitude'] = body.rest.latitude;
                        }
                        // 軽度
                        if('longitude' in body.rest){
                            search_result['longitude'] = body.rest.longitude;
                        }
                        // 営業時間
                        if('opentime' in body.rest){
                            search_result['opentime'] = body.rest.opentime;
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
            var data = {
                'replyToken': req.body['events'][0]['replyToken'],
                "messages": [
                    // テキスト
                    {
                        "type":"text",
                        "text": 'こちらはいかがですか？\n【お店】' + search_result['name'] + '\n【営業時間】' + search_result['opentime'],
                    },
                    // 位置情報
                    {
                        "type":"location",
                        "title":search_result['address'],
                        "latitude": Number(search_result['latitude']),
                        "longitude": Number(search_result['longitude'])
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
