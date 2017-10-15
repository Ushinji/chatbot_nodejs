var request = require('request');

exports.analyze_by_luis = function(phrase, callback){
    var result = {};
    var luis_options = create_luis_options(phrase);
    request.get(luis_options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if('error' in body){
                console.log("検索エラー" + JSON.stringify(body));
            }
            else{
                if('intent' in body.topScoringIntent){
                    result['intent'] = body.topScoringIntent.intent;
                }
                body.entities.forEach(function(entity){
                    if( entity.type == "search_word" ){
                        result['search_word'] = entity.entity;
                    }
                });
            }
        }
        else {
            console.log('error: '+ response.statusCode);
        }
        callback(result);
    });
}

function create_luis_options(phrase) {
    var url = "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/37005d38-9ccf-4963-af7a-d6b1bf049654";
    var query = {
        "subscription-key":process.env.LUIS_SUBSCRIPTION_KEY,
        "staging":true,
        "q":phrase,
    };
    var options = {
        url: url,
        headers : {'Content-Type' : 'application/json'},
        qs: query,
        json: true,
    };
    return options;
}

exports.get_wiki_content = function(search_word, callback){
    var wiki_content ="";
    var wiki_options = create_wiki_options(search_word);
    request.get( wiki_options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if('error' in body){
                console.log("検索エラー" + JSON.stringify(body));
                return;
            }
            if(response.body != null ){
                wiki_content = response.body[0].body;
            }
        }
        else {
            console.log('error: '+ response.statusCode);
            return;
        }
        callback(wiki_content);
    });
}

function create_wiki_options(search_word) {
    var str_space = " ";
    var edit_search_word = search_word.replace(str_space, "");

    var url = 'http://wikipedia.simpleapi.net/api';
    var query = {
        'output':'json',
        'keyword':edit_search_word,
    };
    var options = {
        url: url,
        headers : {'Content-Type' : 'application/json'},
        qs: query,
        json: true,
    };
    return options;
}

exports.send_line_response = function(req, result, callback) {
    var line_options = create_line_options(req, result);
    request.post(line_options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        } else {
            console.log('error: ' + JSON.stringify(response));
        }
        callback();
    });
}

function create_line_options(req, result) {
    var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
    };
    var messages = create_line_res_messages(result);

    var data = {
        'replyToken':req.body['events'][0]['replyToken'],
        'messages': messages,
    };

    var options = {
        url: 'https://api.line.me/v2/bot/message/reply',
        proxy: process.env.FIXIE_URL,
        headers: headers,
        json: true,
        body: data
    };
    return options;
}

function create_line_res_messages(result){
    const CONTENT_LENGTH = 140;
    var messages = [];
    if('search_word' in result && 'wiki_content' in result){
        messages = [
            {
                "type":"text",
                "text": result['search_word'] + 'について説明しよう！',
            },
            {
                "type":"text",
                "text": result['wiki_content'].substr(0, CONTENT_LENGTH),
            }
        ]
    }
    else{
        messages = [
            {
                "type":"text",
                "text":'ぐぬぬ...分からん...',
            }
        ]
    }
    return messages;
}
