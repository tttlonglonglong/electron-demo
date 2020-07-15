const qiniu = require('qiniu')

var accessKey = 'kzNFsM1j3hQqxbZSDrwNgbI5-vzH8EJ5u4i-l05u';
var secretKey = '6SrjLB-L4B3KOPXotZbr0OLJTjrngDGthLcYFAVC';
var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);

var options = {
  scope: "electron-doc",
};
var putPolicy = new qiniu.rs.PutPolicy(options);
var uploadToken = putPolicy.uploadToken(mac);
console.log('uploadToken', uploadToken)
var config = new qiniu.conf.Config();
// 空间对应的机房
config.zone = qiniu.zone.Zone_z0;
// 是否使用https域名
//config.useHttpsDomain = true;
// 上传是否使用cdn加速
//config.useCdnDomain = true;

var localFile = "/Users/amazingt/Documents/study/29.Electron/electron-cloud-doc/test.html";
var formUploader = new qiniu.form_up.FormUploader(config);
var putExtra = new qiniu.form_up.PutExtra();
var key = 'name1.md';
// 文件上传
// formUploader.putFile(uploadToken, key, localFile, putExtra, function (respErr,
//   respBody, respInfo) {
//   if (respErr) {
//     throw respErr;
//   }
//   if (respInfo.statusCode === 200) {
//     console.log(respBody);
//   } else {
//     console.log(respInfo.statusCode);
//     console.log(respBody);
//   }
// });

// 公开空间访问链接
// var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
// var config = new qiniu.conf.Config();
var bucketManager = new qiniu.rs.BucketManager(mac, config);
var publicBucketDomain = 'qd7e2hrrk.bkt.clouddn.com';
var publicDownloadUrl = bucketManager.publicDownloadUrl(publicBucketDomain, key);
console.log("publicDownloadUrl", publicDownloadUrl);