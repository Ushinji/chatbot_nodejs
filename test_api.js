var assert = require('assert');
var api = require('./api.js');

var phrase = "人工知能について知りたい！";
var luis_options = api.create_luis_options(phrase);
//console.log(luis_options);


var search_word = "人工 知能";
var wiki_options = api.create_wiki_options(search_word);
//console.log(wiki_options);


var content = "人工知能についての文";
var result = {
    "search_word":search_word,
    "wiki_content":content
}
var req = {
    body: {
        events: [
            {
              "replyToken": "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
              "type": "message",
              "timestamp": 1462629479859,
              "source": {
                   "type": "user",
                   "userId": "U206d25c2ea6bd87c17655609a1c37cb8"
               },
               "message": {
                   "id": "325708",
                   "type": "text",
                   "text": "Hello, world"
                }
            }
        ]
    }
}
var line_options = api.create_line_options(req, result);
console.log(line_options);
console.log( line_options.body['messages'] );
