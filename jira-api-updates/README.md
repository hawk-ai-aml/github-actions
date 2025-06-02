# Upload to AWS S3 bucket

```
    uses: hawk-ai-aml/github-actions/upload-to-s3@master
    with:
      aws_access_key_id: ${{ secrets.AWS_DEV_ACCESS_KEY_ID }}
      aws_secret_access_key: ${{ secrets.AWS_DEV_SECRET_ACCESS_KEY }}
      aws_bucket: Name of S3 bucket
      source_dir: Name of source directory
      destination_dir: Name of destination directory
```