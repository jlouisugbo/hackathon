from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator
from django.conf import settings
import os
import asyncio

try:
    from dashboard.models import Team
    from transcript import Transcript
except ImportError: 
    Team = None  # handle case where dashboard app is not installed

class Meeting(models.Model):

    MEETING_TYPES = (
        ('standup', 'Standup'),
        ('retrospective', 'Retrospective'),
        ('sprint_planning', 'Sprint Planning'),
        ('review', 'Sprint Review'),
        ('other', 'Other'),
    )

    TRANSCRIPTION_STATUS = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('error', 'Error'),
    )

    title = models.CharField(max_length=200)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='meetings')
    date = models.DateTimeField(default=timezone.now)
    duration_minutes = models.PositiveIntegerField(default=0)
    meeting_type = models.CharField(max_length=50, choices=MEETING_TYPES, default='standup')

    audio_file = models.FileField(
        upload_to='meetings_audio/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'm4a'])]
    )

    transcription_document_id = models.CharField(max_length=100, null=True, blank=True)
    transcription_status = models.CharField(max_length=20, choices=TRANSCRIPTION_STATUS, default='pending')
    transcription_raw = models.JSONField(null=True, blank=True)  # the raw transcription data
    transcription_processed = models.CharField(max_length=10000, null=True, blank=True) # the processed transcription text

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    async def get_transcription(self):
        await self.transcription_object.getTranscript()
        self.transcription_raw = self.transcription_object.transcript
        self.transcription_processed = self.transcription_raw["combinedPhrases"][0]["text"]
        self.transcription_status = 'completed'

    transcription_object = Transcript(audio_file)
    transcription_document_id = transcription_object.documentId
    asyncio.run(get_transcription())

    class Meta:
        ordering = ['-date']
        verbose_name = 'Meeting'
        verbose_name_plural = 'Meetings'

    def __str__(self):
        return f"{self.title} - {self.get_meeting_type_display()} - {self.date.strftime('%Y-%m-%d %H:%M')}"
    
    def get_audio_filename(self):
        """
        Get the filename of the audio file without the full path
        """
        if self.audio_file:
            return os.path.basename(self.audio_file.name)
        return None
    
    def get_audio_size_mb(self):
        if self.audio_file:
            try:
                return round(self.audio_file.size / (1024 * 1024), 2)  # size in MB
            except Exception as e:
                return None
        return None
    
    def get_status_display_class(self):
        """
        Get the CSS class for the current transcription status
        """
        status_classes = {
            'pending': 'text-gray-500',
            'in_progress': 'text-blue-500',
            'completed': 'text-green-500',
            'error': 'text-red-500',
        }
        return status_classes.get(self.transcription_status, 'badge badge-secondary')
    

    def get_status_badge_class(self):
        badge_classes = {
            'pending': 'bg-gray-100 text-gray-800',
            'in_progress': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'error': 'bg-red-100 text-red-800',
        }
        return badge_classes.get(self.transcription_status, 'bg-gray-100 text-gray-800')
    
    def transcription_ready(self):
        return self.transcription_status == 'completed' and self.transription_processed

    def get_duration_display(self):
        if self.duration_minutes is not None:
            hours, minutes = divmod(self.duration_minutes, 60)
            return f"{hours}h {minutes}m"
        return "Unknown Duration"
    
    def get_transcription_progress(self):
        self.transcription_status = self.transcription_object.transcriptStatus()
        if self.transcription_status == 'completed':
            return 100
        elif self.transcription_status == 'in_progress':
            return 50
        elif self.transcription_status == 'pending':
            return 25
        else:
            return 0
        
    def has_analytics(self):
        try:
            return hasattr(self, 'teamhealthmetrics') and self.analysis is not None
        except Exception:
            return False
        
    def get_team_name(self):
        try:
            return self.team.name if self.team else "Unknown Team"
        except Exception:
            return "Unknown Team"
