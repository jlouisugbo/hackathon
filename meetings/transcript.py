import os
import requests
import asyncio
from pathlib import Path


CERT_FILE_PATH = "meetings/florenceai-npe.humana.pem"
SLEEP_TIME = 10

os.environ["REQUESTS_CA_BUNDLE"] = CERT_FILE_PATH
os.environ["SSL_CERT_FILE"] = CERT_FILE_PATH

class Transcript:
    TRANSCRIPTION_STATUS = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    )
    audioFile = ""
    documentId = ""
    isHealthy = False
    transcript = None

    def __init__(self, audioFile = None):
        self.isHealthy = Transcript.checkHealth()
        if audioFile == None:
            self.audioFile = ""
        else:
            self.audioFile = audioFile
            self.uploadFile()
            # asyncio.run(self.getTranscript())
            # self.saveTranscript()

    @staticmethod
    def checkHealth():
        transcription_url = "https://florenceai-npe.humana.com/fasttranscriptionservices/api/health"

        header = {
            "accept": "application/json",
            "X-API-Key": KEY
        }

        try:
            response = requests.get(transcription_url, headers=header)
            if response.json()["status"] == "health":
                return True
            else: 
                raise Exception(response.status_code, " ", response.reason, " ", response.text)
        except Exception as e:
            print(e)
        
        return False
        
    def transcriptStatus(self):
        transcription_url = "https://florenceai-npe.humana.com/fasttranscriptionservices/api/v1/transcribe/status/" + self.documentId

        header = {
            "accept": "application/json",
            "X-API-Key": KEY
        }

        try:
            response = requests.get(transcription_url, headers=header)
            if response.json()["message"]["message"] == "Transcription done successfully":
                return 'completed'
            elif response.json()["message"]["message"] == "Transcription is in progress":
                return 'in_progress'
        except Exception as e:
            print(response.status_code, " ", response.reason, " ", response.text)
            print(e)
            return 'error'
        
        return 'pending'
    
    @staticmethod
    def get_transcription_status(meetingId):
        transcription_url = "https://florenceai-npe.humana.com/fasttranscriptionservices/api/v1/transcribe/status/" + meetingId

        header = {
            "accept": "application/json",
            "X-API-Key": KEY
        }

        try:
            response = requests.get(transcription_url, headers=header)
            if response.json()["message"]["message"] == "Transcription done successfully":
                return 'completed'
            elif response.json()["message"]["message"] == "Transcription is in progress":
                return 'in_progress'
        except Exception as e:
            print(response.status_code, " ", response.reason, " ", response.text)
            print(e)
            return 'error'
        
        return 'pending'


    def uploadFile(self, filePath = None):
        upload_url = "https://florenceai-npe.humana.com/fasttranscriptionservices/api/v1/transcribe"
        headers = {
            "accept": "application/json",
            "X-API-Key": KEY,
        }
        try:
            if filePath: # For testing locally
                myFile = {"file": (filePath, open(filePath, "rb"), "audio/x-m4a")}
            else:
                if not self.audioFile:
                    raise Exception("No audio file provided.")
                elif not isinstance(self.audioFile, str): # Sketchy check to see if it's just the binary or something else
                    myFile = {"file": (self.audioFile.name, self.audioFile, "audio/x-m4a")}
                else:
                    myFile = {"file": (self.audioFile, open(self.audioFile, "rb"), "audio/x-m4a")}

            response = requests.post(upload_url, headers=headers, files=myFile)
            print(response.status_code, " ", response.reason, " ", response.text)
            if response.status_code == 201:
                self.documentId = response.json()["uuid"]
            else:
                raise Exception(response.status_code, " ", response.reason, " ", response.text)
        except Exception as e:
            print(e)
            

    async def getTranscript(self, pastId = None):
        if pastId:
            self.documentId = pastId

        transcription_url = "https://florenceai-npe.humana.com/fasttranscriptionservices/api/v1/transcribe/" + self.documentId

        header = {
            "accept": "application/json",
            "X-API-Key": KEY
        }

        if self.transcript:
            return self.transcript
        try:
            while not self.transcriptStatus():
                    await asyncio.sleep(SLEEP_TIME)
            response = requests.get(transcription_url, headers=header)
            if response.status_code == 200:
                self.transcript = response.json()
                return self.transcript
            else: 
                raise Exception(response.status_code, " ", response.reason, " ", response.text)
        except Exception as e:
            print(e)

    def __str__(self):
        if self.transcript:
            return self.transcript
        else:
            return "No transcript available, try re-uploading the file."
        
    def saveTranscript(self):
        filePath = Path("./Transcripts/" + str(self.documentId) + ".json")
        file = open(filePath, "w")
        if self.transcript:
            file.write(self.transcript)
        else:
            return "No transcript available, try re-uploading the file."

if __name__ == "__main__":
    file = open("audio1153954975.m4a", "rb")
    a = Transcript(file)
