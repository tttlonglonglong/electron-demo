const fs = require('fs')
const zlib = require('zlib')

const src = fs.createReadStream('./test-qiniu.js')
const writeDesc = fs.createWriteStream('./test-copy.gz')
// src.pipe(process.stdout)
src.pipe(zlib.createGzip()).pipe(writeDesc)