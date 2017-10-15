
exports.create_luis_options = function(phrase) {
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

exports.create_wiki_options = function(search_word) {
    var str_space = " ";
    var edit_search_word = search_word.replace(str_space,"");

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

exports.create_line_options = function(req, result) {
    var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {' + process.env.LINE_CHANNEL_ACCESS_TOKEN + '}',
    };
    var messages = create_line_res_messages(result);
    var data = {
        'replyToken':req.body['events'][0]['replyToken'],
        'messages': messages
    };

    var options = {
        url: 'https://api.line.me/v2/bot/message/reply',
        proxy: process.env.FIXIE_URL,
        headers: headers,
        json: true,
        body: data
    };
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
