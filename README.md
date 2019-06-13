# awsS3client

A client for working with objects in AWS S3 buckets.

## Install

### As a Library

```
npm install --save aws-s3-client
```

### Command Line

```
npm install -g aws-s3-client
```

### AWS Credentials

You must configure the proper credentials on your AWS S3.  See the AWS documentation [Configuration and Credential Files](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) for instructions on how to setup credentials.


## Library Usage

```js
const awsS3Client = require('aws-s3-client.js');

var s3Client = awsS3Client();
s3Client.ListBuckets();
```

## Command Line Usage

```
awsS3client --command <command> --bucket <bucket> [options]
```

### Commands

- buckets - List the buckets contained your S3 profile.
- download - Download the object specified by the path.
   - Required Options:
      ```
        --path <path to object>
      ```
- list - List the objects at the specified path.
   - Required Options:
      ```
        --path <path to object>
      ```
- search - Search objects matching the provided path.
   - Required Options:
      ```
        --path <path to object>
      ```
- size - Calculate the total size of objects matching the provided path.
   - Required Options:
      ```
        --path <path to object>
      ```

### Examples

List the buckets contained in S3:

```
awsS3client --command buckets
```

List the contents of "folder1" in "mys3Bucket":

```
awsS3client --bucket myS3Bucket --command list --path "folder1/"
```

