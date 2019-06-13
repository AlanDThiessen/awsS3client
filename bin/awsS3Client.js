#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const awsS3Client = require('../src/s3Client.js');


var commands = {
    'buckets': {
        'handler': ListBuckets,
        's3': 'ListBuckets',
        'params': []
    },

    'download': {
        'handler': SaveObject,
        's3': 'Download',
        'params': ['path', 'bucket']
    },

    'list': {
        'handler': ListObjects,
        's3': 'ListObjects',
        'params': ['path', 'bucket']
    },

    'search': {
        'handler': ListObjects,
        's3': 'SearchByKey',
        'params': ['path', 'bucket']
    },

    'size': {
        'handler': TotalSize,
        's3': 'SearchByKey',
        'params': ['path', 'bucket']
    }
};


var config = {
    command: null,
    sum: 'B',
    localPath: "./",
    params: {}
};



main();


function ProcessArgs() {
    let cntr = 0;

    while(cntr < process.argv.length) {
        let arg = GetArg(cntr, '', true);

        if(arg === '--command') {
            cntr++;
            config.command = GetArg(cntr, "Please specify a command.");
        }
        else if(arg === '--sum') {
            cntr++;
            config.sum = GetArg(cntr, "Please specify a correct value for sum.");
        }
        else {
            if(arg.substring(0, 2) === '--') {
                cntr++;
                let param = arg.substring(2);
                let value = GetArg(cntr, "Please specify a value for " + param);
                config.params[param] = value;
            }
        }

        cntr++;
    }

    if(!commands.hasOwnProperty(config.command)) {
        console.error('Please specify a valid command.');
        process.exit(-1);
    }

    /***
     * @param num
     * @param err
     * @param checkPrefix
     * @returns {string}
     */
    function GetArg(num, err, checkPrefix = false) {
        let value = '';

        if(num < process.argv.length) {
            let arg = process.argv[num];

            if((arg.substr(1,1) === '-') == checkPrefix) {
                value = arg;
            }
        }
        else {
            console.error(err);
            process.exit(-1);
        }

        return value;
    }
}


function main() {
    ProcessArgs();

    var s3Client = awsS3Client();

    let command = commands[config.command];
    let params = [];
    let error = false;

    command.params.forEach(param => {
        if(config.params.hasOwnProperty(param)) {
            params.push(config.params[param]);
        }
        else {
            error = true;
            console.error("Missing required parameter '" + param + "'");
        }
    });

    if(!error) {
        if (typeof(s3Client[command.s3]) === 'function') {
            s3Client[command.s3](...params)
                .then(command.handler, Error);
        }

        function CallHandler(data) {
            command.handler(data);
            process.exit(0);
        }

        function Error(err) {
            console.log(err);
        }
    }
    else {
        process.exit(-1);
    }
}


function ListObjects(data) {
    let totalSize = 0;

    if(data.hasOwnProperty('CommonPrefixes')) {
        data.CommonPrefixes.forEach(function(prefix) {
            let name = prefix.Prefix.replace(config.params.path, "");
            console.log(name);
        });
    }

    if(data.hasOwnProperty('Contents')) {
        data.Contents.forEach((obj) => {
            totalSize += obj.Size;
            let name = obj.Key.replace(config.params.path, "");

            if(name !== "") {
                console.log(Size((obj.Size)).print + '   ' + name);
            }
        });
    }

    console.log('Total Size: ' + Size(totalSize).print);
}


function ListBuckets(buckets) {
    buckets.forEach(bucket => {
        console.log(bucket.Name);
    });
}


function TotalSize(data) {
    let totalSize = 0;

    if(data.hasOwnProperty('Contents')) {
        data.Contents.forEach((obj) => {
            totalSize += obj.Size;
        });
    }

    console.log('Total Size: ' + Size(totalSize).print);
}


function Size(size) {
    let modifier = 'B';

    if((config.sum != modifier) && ((size / 1024 ) > 1)) {
        size /= 1024;
        modifier = 'K';
    }

    if((config.sum != modifier) && ((size / 1024 ) > 1)) {
        size /= 1024;
        modifier = 'M';
    }

    if((config.sum != modifier) && ((size / 1024 ) > 1)) {
        size /= 1024;
        modifier = 'G';
    }

    if((config.sum != modifier) && ((size / 1024 ) > 1)) {
        size /= 1024;
        modifier = 'T';
    }

    let numStr = '          ' + Math.round(size).toString();

    return({
        'size': size,
        'unit': modifier,
        'print': (numStr.substring(numStr.length - 10) + ' ' + modifier)
    });
}


function SaveObject(data) {
    let awsPath = path.parse(config.params.path);
    let localPath = path.join(config.localPath, awsPath.dir);

    if(!fs.existsSync(localPath)) {
        fs.mkdirSync(localPath, {recursive: true});
    }

    fs.writeFileSync(path.join(localPath, awsPath.base), data.Body, "binary");
}
