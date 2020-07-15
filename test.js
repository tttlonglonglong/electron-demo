const QiniuManager = require('./src/utils/QiniuManager')
const path = require('path')
//generate mac
const accessKey = 'kzNFsM1j3hQqxbZSDrwNgbI5-vzH8EJ5u4i-l05u'
const secretKey = '6SrjLB-L4B3KOPXotZbr0OLJTjrngDGthLcYFAVC'
const localFile = "/Users/amazingt/Desktop/hello123.md";
const key = 'test.md'
const downloadPath = path.join(__dirname, key)

const manager = new QiniuManager(accessKey, secretKey, 'electron-doc')
// manager.uploadFile(key, downloadPath).then((data) => {
//   console.log('上传成功', data)
// }).catch(err => console.warn(err))
//manager.deleteFile(key)
// manager.generateDownloadLink(key).then(data => {
//   console.log(data)
//   return manager.generateDownloadLink('test.md')
// }).then(data => {
//   console.log(data)
// })
//const publicBucketDomain = 'http://pv8m1mqyk.bkt.clouddn.com';

manager.downloadFile(key, downloadPath).then(() => {
  console.log('下载写入文件完毕')
})

