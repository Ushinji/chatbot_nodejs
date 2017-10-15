var assert = require('assert');
var api = require('./api.js');
var async = require('async');

async.waterfall([
    function(callback) {
        var result = {};
        var phrase = "人工知能について知りたい！";
        api.analyze_by_luis(phrase, function(result){
            callback(null, result);
        });
    }
],function(err, result){
    console.log(result);
});

async.waterfall([
    function(callback) {
        var result = {};
        var search_word = "人工 知能";
        api.get_wiki_content(search_word, function(result){
            callback(null, result);
        });
    }
],function(err, result){
    console.log(result);
});

async.waterfall([
    function(callback) {
        var result = {
            "search_word":"人工知能",
            "wiki_content":"人工知能の文"
        }
        callback(null, result);
    }
],function(err, result){
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
    api.send_line_response(req, result, function(result){
        console.log("Send");
    });
});
