const fs = require('fs');
const sourceMap = require('source-map');

async function run() {
  const mapPath = fs.readdirSync('dist/assets').find(f => f.endsWith('.js.map'));
  if (!mapPath) return console.log('no map');
  
  const rawMap = fs.readFileSync('dist/assets/' + mapPath, 'utf8');
  const consumer = await new sourceMap.SourceMapConsumer(rawMap);
  
  const pos = consumer.originalPositionFor({
    line: 2549,
    column: 284155
  });
  
  console.log("Original position:", pos);
  
  consumer.destroy();
}
run();
