import os
import pandas as pd
import boto3
import tempfile

def lambda_handler(event, context):
    # Retrieve the S3 bucket and key from the S3 event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = event['Records'][0]['s3']['object']['key']

    # Download the CSV file to a temporary location
    s3 = boto3.client('s3')
    temp_file_path = tempfile.mktemp()
    s3.download_file(bucket, key, temp_file_path)

    # Process the CSV file using your script
    processed_csv_path = process_csv(temp_file_path)
    
    # Upload the processed CSV file to another S3 bucket
    destination_bucket = 'wp-resultbucket'
    destination_key = 'processed/processed_data.csv'
    s3.upload_file(processed_csv_path, destination_bucket, destination_key)
    
    # Clean up the temporary processed CSV file
    os.remove(processed_csv_path)

def duration_to_seconds(duration):
    if duration is None:
      return None
    # Convert duration in the format 'mm:ss' to seconds
    minutes, seconds = map(int, duration.split(':'))
    total_seconds = minutes * 60 + seconds
    return total_seconds

def seconds_to_duration(seconds):
    # Check if the value is NaN
    if pd.isna(seconds):
        return None
    # Convert seconds to minutes and seconds
    minutes, seconds = divmod(seconds, 60)
    return f"{int(minutes)} min {int(seconds)} sec"
    
def process_csv(csv_file_path):
    # Read the CSV file into a DataFrame
    df = pd.read_csv(csv_file_path)
    
    df_dropped = df.drop([0])
    
    # Split the 'Activity_action_date' and 'Activity_action_value' columns by ('|') into multiple rows
    # action_values = df_dropped['Activity_action'].astype(str).str.split('|').apply(pd.Series, 1).stack()
    action_values = df_dropped['Activity_action'].astype(str).str.split('|').apply(lambda x: pd.Series(x), 1).stack()
    date_values = df_dropped['Activity_action-date'].astype(str).str.split('|').apply(lambda x: pd.Series(x), 1).stack()
    value_values = df_dropped['Activity_action-value'].astype(str).str.split('|').apply(lambda x: pd.Series(x), 1).stack()
    
    # Set index to match stacked data and concatenate the split values with the original DataFrame
    action_values.index = action_values.index.droplevel(-1)
    date_values.index = date_values.index.droplevel(-1)
    value_values.index = value_values.index.droplevel(-1)
    
    df_final = pd.concat([df_dropped.drop(['Activity_action','Activity_action-date', 'Activity_action-value'], axis=1), action_values.rename('Action'),date_values.rename('Date'), value_values.rename('Value')], axis=1)
    
    video_details = {
        'view-video': {
            '/videos/21': {
                'video_number': 21,
                'duration': '1:15',
                'title': 'Welcome to Inner Peace Time'
            },
            '/videos/83': {
                'video_number': 83,
                'duration': '2:40',
                'title': 'Getting Started Guide'
            },
            '/videos/87':{
                'video_number': 87,
                'duration': '2:13',
                'title': 'Meditation Tips'
            },
                '/videos/23': {
                'video_number': 23,
                'duration': '6:41',
                'title': 'Breathe Like Navy Seals'
            },
            '/videos/25': {
                'video_number': 25,
                'duration': '5:09',
                'title': 'Heart Coherence'
            },
            '/videos/29':{
                'video_number': 29,
                'duration': '10:01',
                'title': 'Stress Buster'
            },
           '/videos/140': {
                'video_number': 140,
                'duration': '9:26',
                'title': 'I am Safe'
            },
            '/videos/31': {
                'video_number': 31,
                'duration': '9:58',
                'title': 'Embrace Love.  Release Fear'
            },
            '/videos/27':{
                'video_number': 27,
                'duration': '17:02',
                'title': 'Blissful Sleep'
            },
            '/videos/72': {
                'video_number': 72,
                'duration': '7:09',
                'title': 'Relax Your Body'
            },
            '/videos/36': {
                'video_number': 36,
                'duration': '6:05',
                'title': 'Morning Light'
            },
            '/videos/33':{
                'video_number': 33,
                'duration': '6:29',
                'title': 'Energy Booster'
            },
            '/videos/147':{
                'video_number': 147,
                'duration': '9:20',
                'title': 'Boost Love and Healing'
            },
            '/videos/38': {
                'video_number': 38,
                'duration': '6:09',
                'title': 'Peace Breath Introduction'
            },
            '/videos/67': {
                'video_number': 67,
                'duration': '10:02',
                'title': 'Peace Breath 10-minute Version'
            },
            '/videos/70':{
                'video_number': 70,
                'duration': '8:28',
                'title': 'Body Scan'
            }
        }
    }
    
    # Lists to store video titles and durations
    video_titles = []
    video_durations = []
    
    # Iterate through the DataFrame and match 'action' and 'action_value' to get video number, title, and duration
    for index, row in df_final.iterrows():
        action = row['Action']
        action_value = row['Value']
    
        if action in video_details and action_value in video_details[action]:
            video_number = video_details[action][action_value]['video_number']
            video_title = video_details[action][action_value]['title']
            video_duration = video_details[action][action_value]['duration']
    
            video_titles.append(video_title)
            video_durations.append(video_duration)
    
            # print(f"Row {index + 1}: Video Number is {video_number}, Title: {video_title}, Duration: {video_duration}")
        else:
            video_titles.append(None)  # If video not found, add None to the list
            video_durations.append(None)  # If video not found, add None to the list
            # print(f"Row {index + 1}: Video not found")
    
    # Add video titles and durations as new columns to the DataFrame
    df_final['video_title'] = video_titles
    df_final['video_duration'] = video_durations
    df_final['video_duration_seconds'] = df_final['video_duration'].apply(duration_to_seconds)
    df_final['video_duration'] = df_final['video_duration_seconds'].apply(seconds_to_duration)
    df_final = df_final.drop(columns=['video_duration_seconds'])
    
    processed_csv_path = '/tmp/processed_data.csv'
    df_final.to_csv(processed_csv_path, index=False)

    return processed_csv_path
