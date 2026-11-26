
import json
import boto3
import urllib.parse
import os
from io import BytesIO
from PIL import Image

s3 = boto3.client('s3')

OUTPUT_BUCKET = 'cloudpix-output-himanshi1405-2026'

def lambda_handler(event, context):

    for record in event['Records']:

        input_bucket = record['s3']['bucket']['name']
        input_key = urllib.parse.unquote_plus(
            record['s3']['object']['key']
        )

        # Download uploaded image
        response = s3.get_object(
            Bucket=input_bucket,
            Key=input_key
        )

        image_data = response['Body'].read()

        # Open image
        image = Image.open(BytesIO(image_data))
        image.thumbnail((800, 800))

        # Convert image to RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Save resized image
        resized_buffer = BytesIO()
        image.save(resized_buffer, format='JPEG')
        resized_buffer.seek(0)

        output_name = os.path.splitext(
            os.path.basename(input_key)
        )[0]

        s3.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=f'processed/{output_name}_resized.jpg',
            Body=resized_buffer.getvalue(),
            ContentType='image/jpeg'
        )

        # Create thumbnail
        thumbnail = image.copy()
        thumbnail.thumbnail((200, 200))

        thumbnail_buffer = BytesIO()
        thumbnail.save(thumbnail_buffer, format='JPEG')
        thumbnail_buffer.seek(0)

        s3.put_object(
            Bucket=OUTPUT_BUCKET,
            Key=f'thumbnails/{output_name}_thumbnail.jpg',
            Body=thumbnail_buffer.getvalue(),
            ContentType='image/jpeg'
        )

    return {
        'statusCode': 200,
        'body': json.dumps('Image processed successfully!')
    }
