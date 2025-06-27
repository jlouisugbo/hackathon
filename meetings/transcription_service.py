import requests
import time
import logging
from django.conf import settings
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class TranscriptionServiceError(Exception):
    """Custom exception for transcription service errors"""
    pass


class TranscriptionService:
    """
    Service class for handling audio transcription using fast-transcription-services API
    """
    
    def __init__(self):
        self.api_key = getattr(settings, 'TRANSCRIPTION_API_KEY', None)
        self.base_url = getattr(settings, 'TRANSCRIPTION_API_BASE_URL', 'https://api.fasttranscriptionservices.com')
        
        if not self.api_key:
            logger.warning("TRANSCRIPTION_API_KEY not configured")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get API headers with authentication"""
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/json'
        }
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make authenticated API request with error handling"""
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = self._get_headers()
        
        try:
            response = requests.request(method, url, headers=headers, timeout=30, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Transcription API request failed: {e}")
            raise TranscriptionServiceError(f"API request failed: {str(e)}")
    
    def upload_audio_sync(self, audio_file, meeting_title: str = None) -> Dict:
        """
        Upload audio file for synchronous transcription (files < 30 minutes)
        Returns transcription result immediately based on actual API format
        """
        try:
            files = {
                'audio': (audio_file.name, audio_file, 'audio/mpeg')
            }
            
            data = {}
            if meeting_title:
                data['title'] = meeting_title
            
            logger.info(f"Starting sync transcription for {audio_file.name}")
            response = self._make_request('POST', '/api/v1/sync-transcribe', files=files, data=data)
            
            result = response.json()
            logger.info(f"Sync transcription completed for {audio_file.name}")
            
            # Extract combined text from combinedPhrases
            transcription_text = ""
            if 'combinedPhrases' in result and result['combinedPhrases']:
                transcription_text = " ".join([phrase.get('text', '') for phrase in result['combinedPhrases']])
            
            # Calculate duration in seconds from milliseconds
            duration_seconds = result.get('durationMilliseconds', 0) / 1000 if result.get('durationMilliseconds') else None
            
            return {
                'success': True,
                'transcription': transcription_text,
                'duration_seconds': duration_seconds,
                'duration_milliseconds': result.get('durationMilliseconds'),
                'combined_phrases': result.get('combinedPhrases', []),
                'phrases': result.get('phrases', []),
                'raw_response': result
            }
            
        except Exception as e:
            logger.error(f"Sync transcription failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_audio_async(self, audio_file, meeting_title: str = None) -> Tuple[bool, str, Optional[str]]:
        """
        Upload audio file for asynchronous transcription (larger files)
        Returns (success, document_id, error_message)
        """
        try:
            files = {
                'audio': (audio_file.name, audio_file, 'audio/mpeg')
            }
            
            data = {
                'language': 'en-US',
                'enable_speaker_diarization': True,
            }
            
            if meeting_title:
                data['title'] = meeting_title
            
            logger.info(f"Starting async transcription for {audio_file.name}")
            response = self._make_request('POST', '/api/v1/transcribe', files=files, data=data)
            
            result = response.json()
            document_id = result.get('document_id')
            
            if not document_id:
                raise TranscriptionServiceError("No document_id returned from API")
            
            logger.info(f"Async transcription started for {audio_file.name}, document_id: {document_id}")
            return True, document_id, None
            
        except Exception as e:
            logger.error(f"Async transcription upload failed: {e}")
            return False, None, str(e)
    
    def get_transcription_status(self, document_id: str) -> Dict:
        """
        Check transcription status by document ID using correct endpoint
        """
        try:
            response = self._make_request('GET', f'/api/v1/transcribe/status/{document_id}')
            result = response.json()
            
            return {
                'success': True,
                'status': result.get('status', 'unknown'),  # pending, processing, completed, failed
                'progress': result.get('progress', 0),
                'estimated_completion': result.get('estimated_completion'),
                'error_message': result.get('error_message'),
            }
            
        except Exception as e:
            logger.error(f"Status check failed for document {document_id}: {e}")
            return {
                'success': False,
                'status': 'error',
                'error': str(e)
            }
    
    def get_transcription_result(self, document_id: str) -> Dict:
        """
        Get completed transcription result by document ID using correct endpoint
        Returns data in the same format as the JSON you provided
        """
        try:
            response = self._make_request('GET', f'/api/v1/transcribe/{document_id}')
            result = response.json()
            
            if result.get('status') != 'completed':
                return {
                    'success': False,
                    'error': f"Transcription not completed. Status: {result.get('status')}"
                }
            
            # Extract combined text from combinedPhrases like in the JSON sample
            transcription_text = ""
            if 'combinedPhrases' in result and result['combinedPhrases']:
                transcription_text = " ".join([phrase.get('text', '') for phrase in result['combinedPhrases']])
            
            # Calculate duration in seconds from milliseconds
            duration_seconds = result.get('durationMilliseconds', 0) / 1000 if result.get('durationMilliseconds') else None
            
            # Extract speakers from phrases (speaker diarization)
            speakers = []
            if 'phrases' in result:
                speaker_ids = set()
                for phrase in result['phrases']:
                    if 'speaker' in phrase:
                        speaker_ids.add(phrase['speaker'])
                speakers = list(speaker_ids)
            
            return {
                'success': True,
                'transcription': transcription_text,
                'duration_seconds': duration_seconds,
                'duration_milliseconds': result.get('durationMilliseconds'),
                'combined_phrases': result.get('combinedPhrases', []),
                'phrases': result.get('phrases', []),
                'speakers': speakers,
                'raw_response': result
            }
            
        except Exception as e:
            logger.error(f"Failed to get transcription result for document {document_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def transcribe_audio_with_polling(self, audio_file, meeting_title: str = None, 
                                     poll_interval: int = 10, max_wait: int = 300) -> Dict:
        """
        Upload audio and poll for completion (convenience method)
        """
        # Start transcription
        success, document_id, error = self.upload_audio_async(audio_file, meeting_title)
        
        if not success:
            return {
                'success': False,
                'error': error
            }
        
        # Poll for completion
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status_result = self.get_transcription_status(document_id)
            
            if not status_result['success']:
                return status_result
            
            status = status_result['status']
            
            if status == 'completed':
                return self.get_transcription_result(document_id)
            elif status == 'failed':
                return {
                    'success': False,
                    'error': status_result.get('error_message', 'Transcription failed')
                }
            
            # Still processing, wait and try again
            time.sleep(poll_interval)
        
        # Timeout
        return {
            'success': False,
            'error': f'Transcription timed out after {max_wait} seconds',
            'document_id': document_id  # Return document_id so we can check later
        }
    
    def estimate_transcription_time(self, audio_duration_minutes: int) -> str:
        """
        Estimate transcription completion time based on audio duration
        """
        if audio_duration_minutes <= 30:
            return "< 1 minute (sync)"
        elif audio_duration_minutes <= 60:
            return "2-5 minutes"
        elif audio_duration_minutes <= 120:
            return "5-10 minutes"
        else:
            return "10+ minutes"
    
    def should_use_sync_transcription(self, file_size_mb: float) -> bool:
        """
        Determine if file should use sync vs async transcription
        Based on file size as proxy for duration
        """
        # Files under ~25MB are typically under 30 minutes
        return file_size_mb < 25.0


# Singleton instance
transcription_service = TranscriptionService()