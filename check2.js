const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const $ = cheerio.load(html);

console.log('Main grid children:');
$('main').children().each((i, el) => {
  console.log(i + ': class="' + $(el).attr('class') + '" id="' + $(el).attr('id') + '"');
});

console.log('Left Column children:');
$('.lg\\:col-span-7').children().each((i, el) => {
  console.log('  ' + i + ': id="' + $(el).attr('id') + '"');
});
