var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var async = require('async');

app.set('port', (process.env.PORT || 5000));
app.use(bodyParser.urlencoded({extended: true}));  // JSONの送信を許可
app.use(bodyParser.json());                        // JSONのパースを楽に（受信時）
// app.get('/', function(request, response) {
//     response.send('Hello World!');
// });

app.post('/callback', function(req, res){

    async.waterfall([
        // ぐるなびAPI
        function(callback) {
            var json = req.body;

            // 受信テキスト
            var search_place = json['result'][0]['content']['text'];
            var search_place_array = search_place.split("\n");

            //検索キーワード
            var gnavi_keyword = "";
            if(search_place_array.length == 2){
                var keyword_array = search_place_array[1].split("、");
                gnavi_keyword = keyword_array.join();
            }

            // ぐるなびAPI レストラン検索API
            var gnavi_url = 'https://api.gnavi.co.jp/RestSearchAPI/20150630/';
            // ぐるなび リクエストパラメータの設定
            var gnavi_query = {
                "keyid": process.env.GNAVI_ACCESS_KEY,
                "format": "json",
                "address": search_place_array[0],
                "hit_per_page": 1,
                "freeword": gnavi_keyword,
                "freeword_condition": 2
            };

            var gnavi_options = {
                url: gnavi_url,
                headers : {'Content-Type' : 'application/json; charset=UTF-8'},
                qs: gnavi_query,
                json: true
            };

            // 検索結果をオブジェクト化
            var search_result = {};

            request.get(gnavi_options, function (error, response, body){
                if (!error && response.statusCode == 200) {
                }
                else{
                }
            });

            search_result['name'] = "検索結果.店名";
            search_result['address'] = "検索結果.場所";
            callback(null, json, search_result);
            /*
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
                    // 住所
                    if('address' in body.rest){
                        search_result['address'] = body.rest.address;
                    }
                    callback(null, json, search_result);
                }
                else {
                    console.log('error: '+ response.statusCode);
                }
            });
            */
        },
    ],

    // LINE BOT
    function(err, json, search_result) {
        if(err){
            return;
        }

        //ヘッダーを定義
        var headers = {
            'Content-Type' : 'application/json; charset=UTF-8',
            'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
        };

        // 送信相手の設定（配列）
        var to_array = [];
        to_array.push(json['result'][0]['content']['from']);


        // 送信データ作成
        var data = {
            'to': to_array,
            'toChannel': 1383378250, //固定
            'eventType':'140177271400161403', //固定
            "content": {
                "messageNotified": 0,
                "messages": [
                    // テキスト
                    {
                        "contentType": 1,
                        "text": 'こちらはいかがですか？\n【お店】' + search_result['name'] + '\n【場所】' + search_result['address'],
                    }
                ]
            }
        };

        //オプションを定義
        var options = {
            url: 'https://trialbot-api.line.me/v1/events',
            proxy : process.env.FIXIE_URL,
            headers: headers,
            json: true,
            body: data
        };

        request.post(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            } else {
                console.log('error: '+ JSON.stringify(response));
            }
        });

    });

});

app.listen(app.get('port'), function() {
    console.log('Node app is running');
});
