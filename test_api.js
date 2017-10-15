var assert = require('assert');
var api = require('./api.js');

var phrase = "人工知能について知りたい！";
var luis_options = api.create_luis_options(phrase);
console.log(luis_options);

var search_word = "人工 知能";
var wiki_options = api.create_wiki_options(search_word);
console.log(wiki_options);

var content = "*"*141;
var result = {
    "search_word":search_word,
    "content":content
}
var line_options = api.create_line_options(result);
console.log(line_options);
