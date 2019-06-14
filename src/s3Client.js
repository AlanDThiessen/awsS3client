'use strict';

const nodePath = require('path');
const nodeFs = require('fs');
const AWS = require('aws-sdk/index');


/***
 * Constructs a new AWS S3 Client
 * @returns {s3Client}
 * @constructor
 */
function AWSS3Client() {
    let s3Client = {
        selectedBucket: null,

        s3Settings: {
            delimeter: '/'
        },

        'Download': Download,
        'ListBuckets': ListBuckets,
        'ListObjects': ListObjects,
        'SearchByKey': SearchByKey,
        'SelectBucket': SelectBucket
    };

    var newS3Client = Object.create(s3Client);
    newS3Client.s3 = new AWS.S3();

    return newS3Client;


    /***
     * Store the buck to use for future call.
     * @param bucket [String] The AWS S3 bucket to use for future calls.
     */
    function SelectBucket(bucket) {
        this.selectedBucket = bucket;
    }


    /***
     * Download the object specified from the AWS S3 bucket.
     * @param path [String] The S3 object key.
     * @param bucket [String] The bucket from which to download.
     * @param localPath [String] The local starting path for the download.
     * @param recursive [Boolean] Whether to download recursively
     * @returns {Promise<any>}
     */
    function Download(path, bucket = null, localPath, recursive) {
        let totalSize = 0;
        let awsS3 = this.s3;

        if(bucket === null) {
            bucket = this.selectedBucket;
        }

        if (recursive) {
            return this.SearchByKey(path, bucket)
                .then(GatherObjects)
                .then(RunDownload);
        }
        else {
            return RunDownload([path]);
        }


        function GatherObjects(results) {
            let fileNames = [];

            results.Contents.forEach(obj => {
                totalSize += obj.Size;
                fileNames.push(obj.Key);
            });

            return Promise.resolve(fileNames);
        }


        function RunDownload(objList) {
            return new Promise(PerformDownload);

            function PerformDownload(resolve, reject) {
                let cntr = 0;
                let params = {
                    'Bucket': bucket,
                    'Key': objList[cntr]
                };

                CallS3();

                function CallS3() {
                    awsS3.getObject(params, (err, obj) => {
                        if (err) {
                            reject(err);
                        } else {
                            SaveObject(params.Key, localPath, obj);

                            if(++cntr < objList.length) {
                                params.Key = objList[cntr];
                                CallS3();
                            }
                            else {
                                resolve();
                            }
                        }
                    });
                }
            }
        }
    }


    /***
     * Retrieve the list of buckets from AWS S3.
     * @returns {Promise<Array[String]>}
     */
    function ListBuckets() {
        return RunAws(this.s3, 'listBuckets')
            .then(ListBuckets);

        function ListBuckets(data) {
            if (data.hasOwnProperty('Buckets') && Array.isArray(data.Buckets)) {
                return(data.Buckets);
            } else {
                return([]);
            }
        }
    }


    /***
     * List the S3 objects at the given path.
     * @param path [String] The S3 object Prefix to list.
     * @param bucket [String] The S3 bucket from which to list
     * @returns {Promise<Object>}
     */
    function ListObjects(path, bucket = null) {
        if(bucket === null) {
            bucket = this.selectedBucket;
        }

        let params = {
            'Bucket': bucket,
            'Delimiter': this.s3Settings.delimeter,
            'Prefix': path
        };

        return ListObjectsV2(this.s3, params);
    }


    /***
     * Search the S3 objects matching the given path.
     * @param path [String] The S3 object Prefix to list.
     * @param bucket [String] The S3 bucket from which to list
     * @returns {Promise<Object>}
     */
    function SearchByKey(path, bucket = null) {
        if(bucket === null) {
            bucket = this.selectedBucket;
        }

        let params = {
            'Bucket': bucket,
            'Prefix': path
        };

        return ListObjectsV2(this.s3, params);
    }
}


/***
 * @param s3 [Object] The AWS.S3 service object with which to make calls.
 * @param params [Object] The set of parameters to pass to the method.
 * @returns {Promise<any>}
 */
function ListObjectsV2(s3, params) {
    return new Promise(RunObjectList);

    function RunObjectList(resolve, reject) {
        var collectedData = {
            CommonPrefixes: [],
            Contents: []
        };

        CallS3();

        function CallS3() {
            s3.listObjectsV2(params, (err, data) => {
                if(err) {
                    reject(err);
                }
                else {
                    if(data.hasOwnProperty('CommonPrefixes')) {
                        collectedData.CommonPrefixes = collectedData.CommonPrefixes.concat(data.CommonPrefixes);
                    }

                    if(data.hasOwnProperty('Contents')) {
                        collectedData.Contents = collectedData.Contents.concat(data.Contents);
                    }

                    if(data.IsTruncated) {
                        params.ContinuationToken = data.NextContinuationToken;
                        CallS3();
                    }
                    else {
                        resolve(collectedData);
                    }
                }
            });
        }
    }
}


/***
 * @param s3 [Object] The AWS.S3 service object with which to make calls.
 * @param method [String] The AWS.S3 method to call.
 * @param params [Object] The set of parameters to pass to the method.
 * @returns {Promise<any>}
 */
function RunAws(s3, method, params) {
    return new Promise(RunMethod);

    function RunMethod(resolve, reject) {
        if(typeof(params) === 'undefined') {
            params = {};
        }

        if(typeof s3[method] === 'function') {
            s3[method](params, (err, data) => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        }
        else {
            reject('Invalid Method');
        }
    }
}


function SaveObject(keyPath, fsPath, data) {
    let awsPath = nodePath.parse(keyPath);
    let localPath = nodePath.join(fsPath, awsPath.dir);

    if(!nodeFs.existsSync(localPath)) {
        nodeFs.mkdirSync(localPath, {recursive: true});
    }

    nodeFs.writeFileSync(nodePath.join(localPath, awsPath.base), data.Body, "binary");
}


module.exports = AWSS3Client;

