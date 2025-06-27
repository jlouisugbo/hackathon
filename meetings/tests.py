from django.test import TestCase, Client
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from unittest.mock import patch, MagicMock
import json
import io

from .models import Meeting
from .transcription_service import TranscriptionService, TranscriptionServiceError

try:
    from dashboard.models import Team
except ImportError:
    Team = None


class MeetingModelTest(TestCase):
    """Test Meeting model functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.team = None
        if Team:
            self.team = Team.objects.create(
                name="Test Team",
                scrum_master="John Doe",
                product_owner="Jane Smith",
                members=["Alice", "Bob", "Charlie"]
            )
    
    def test_meeting_creation(self):
        """Test basic meeting creation"""
        meeting = Meeting.objects.create(
            title="Daily Standup",
            team=self.team,
            meeting_type="standup",
            date=timezone.now()
        )
        
        self.assertEqual(meeting.title, "Daily Standup")
        self.assertEqual(meeting.meeting_type, "standup")
        self.assertEqual(meeting.transcription_status, "pending")
        self.assertIsNotNone(meeting.created_at)
    
    def test_meeting_str_method(self):
        """Test meeting string representation"""
        date = timezone.now()
        meeting = Meeting.objects.create(
            title="Sprint Planning",
            team=self.team,
            meeting_type="sprint_planning",
            date=date
        )
        
        expected = f"Sprint Planning - Sprint Planning ({date.strftime('%Y-%m-%d')})"
        self.assertEqual(str(meeting), expected)
    
    def test_get_status_display_class(self):
        """Test status display CSS classes"""
        meeting = Meeting.objects.create(
            title="Test Meeting",
            team=self.team
        )
        
        meeting.transcription_status = "pending"
        self.assertEqual(meeting.get_status_display_class(), "text-gray-500")
        
        meeting.transcription_status = "processing"
        self.assertEqual(meeting.get_status_display_class(), "text-blue-500")
        
        meeting.transcription_status = "completed"
        self.assertEqual(meeting.get_status_display_class(), "text-green-500")
        
        meeting.transcription_status = "failed"
        self.assertEqual(meeting.get_status_display_class(), "text-red-500")
    
    def test_get_transcription_progress(self):
        """Test transcription progress calculation"""
        meeting = Meeting.objects.create(
            title="Test Meeting",
            team=self.team
        )
        
        meeting.transcription_status = "pending"
        self.assertEqual(meeting.get_transcription_progress(), 0)
        
        meeting.transcription_status = "processing"
        self.assertEqual(meeting.get_transcription_progress(), 50)
        
        meeting.transcription_status = "completed"
        self.assertEqual(meeting.get_transcription_progress(), 100)
        
        meeting.transcription_status = "failed"
        self.assertEqual(meeting.get_transcription_progress(), 0)
    
    def test_is_transcription_ready(self):
        """Test transcription readiness check"""
        meeting = Meeting.objects.create(
            title="Test Meeting",
            team=self.team
        )
        
        # Not ready - pending status
        self.assertFalse(meeting.is_transcription_ready())
        
        # Not ready - completed but no text
        meeting.transcription_status = "completed"
        self.assertFalse(meeting.is_transcription_ready())
        
        # Ready - completed with text
        meeting.transcription_processed = "This is a test transcription"
        self.assertTrue(meeting.is_transcription_ready())
    
    def test_get_duration_display(self):
        """Test duration display formatting"""
        meeting = Meeting.objects.create(
            title="Test Meeting",
            team=self.team
        )
        
        # No duration
        self.assertEqual(meeting.get_duration_display(), "Unknown")
        
        # Short meeting
        meeting.duration_minutes = 30
        self.assertEqual(meeting.get_duration_display(), "30m")
        
        # Long meeting
        meeting.duration_minutes = 90
        self.assertEqual(meeting.get_duration_display(), "1h 30m")
        
        # Exactly 1 hour
        meeting.duration_minutes = 60
        self.assertEqual(meeting.get_duration_display(), "1h 0m")


class TranscriptionServiceTest(TestCase):
    """Test TranscriptionService functionality"""
    
    def setUp(self):
        """Set up transcription service"""
        self.service = TranscriptionService()
    
    def test_should_use_sync_transcription(self):
        """Test sync vs async decision logic"""
        # Small files should use sync
        self.assertTrue(self.service.should_use_sync_transcription(10.0))
        self.assertTrue(self.service.should_use_sync_transcription(24.9))
        
        # Large files should use async
        self.assertFalse(self.service.should_use_sync_transcription(25.0))
        self.assertFalse(self.service.should_use_sync_transcription(50.0))
    
    def test_estimate_transcription_time(self):
        """Test transcription time estimation"""
        self.assertEqual(self.service.estimate_transcription_time(15), "< 1 minute (sync)")
        self.assertEqual(self.service.estimate_transcription_time(30), "< 1 minute (sync)")
        self.assertEqual(self.service.estimate_transcription_time(45), "2-5 minutes")
        self.assertEqual(self.service.estimate_transcription_time(90), "5-10 minutes")
        self.assertEqual(self.service.estimate_transcription_time(150), "10+ minutes")
    
    @patch('requests.request')
    def test_upload_audio_sync_success(self, mock_request):
        """Test successful sync transcription"""
        # Mock API response matching the JSON format you provided
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "durationMilliseconds": 50624,
            "combinedPhrases": [
                {
                    "text": "Now a brief summary. The year is 1984, and the government has completely oppressed the people."
                }
            ],
            "phrases": [
                {
                    "speaker": 1,
                    "offsetMilliseconds": 1200,
                    "durationMilliseconds": 1040,
                    "text": "Now a brief summary.",
                    "locale": "en-US",
                    "confidence": 0.8607987
                }
            ]
        }
        mock_request.return_value = mock_response
        
        # Create mock file
        audio_file = io.BytesIO(b"fake audio data")
        audio_file.name = "test.mp3"
        
        result = self.service.upload_audio_sync(audio_file, "Test Meeting")
        
        self.assertTrue(result['success'])
        self.assertIn('transcription', result)
        self.assertEqual(result['duration_seconds'], 50.624)
        self.assertEqual(result['duration_milliseconds'], 50624)
        self.assertIn('combined_phrases', result)
        self.assertIn('phrases', result)
    
    @patch('requests.request')
    def test_upload_audio_sync_failure(self, mock_request):
        """Test failed sync transcription"""
        mock_request.side_effect = Exception("API Error")
        
        audio_file = io.BytesIO(b"fake audio data")
        audio_file.name = "test.mp3"
        
        result = self.service.upload_audio_sync(audio_file)
        
        self.assertFalse(result['success'])
        self.assertIn('error', result)
    
    @patch('requests.request')
    def test_upload_audio_async_success(self, mock_request):
        """Test successful async transcription upload"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "document_id": "abc123",
            "status": "processing"
        }
        mock_request.return_value = mock_response
        
        audio_file = io.BytesIO(b"fake audio data")
        audio_file.name = "test.mp3"
        
        success, document_id, error = self.service.upload_audio_async(audio_file)
        
        self.assertTrue(success)
        self.assertEqual(document_id, "abc123")
        self.assertIsNone(error)
    
    @patch('requests.request')
    def test_get_transcription_status(self, mock_request):
        """Test transcription status check"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "completed",
            "progress": 100
        }
        mock_request.return_value = mock_response
        
        result = self.service.get_transcription_status("abc123")
        
        self.assertTrue(result['success'])
        self.assertEqual(result['status'], "completed")
        self.assertEqual(result['progress'], 100)


class MeetingViewsTest(TestCase):
    """Test meeting views"""
    
    def setUp(self):
        """Set up test client and data"""
        self.client = Client()
        self.team = None
        if Team:
            self.team = Team.objects.create(
                name="Test Team",
                scrum_master="John Doe",
                product_owner="Jane Smith"
            )
    
    def test_meeting_upload_get(self):
        """Test meeting upload form display"""
        url = reverse('meetings:upload')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Upload Meeting')
        self.assertContains(response, 'audio_file')
    
    def test_meeting_upload_post_missing_data(self):
        """Test meeting upload with missing data"""
        url = reverse('meetings:upload')
        response = self.client.post(url, {})
        
        # Should redirect back to upload form with error
        self.assertEqual(response.status_code, 302)