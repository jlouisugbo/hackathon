from django.db import models
from django.utils import timezone
from django.core.validators import FileExtensionValidator
from django.conf import settings
import os

try:
    from dashboard.models import Team
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
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('error', 'Error'),
    )

    title = models.CharField(max_length=200)
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='meetings', null=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    duration_minutes = models.PositiveIntegerField(default=0, null=True, blank=True)
    meeting_type = models.CharField(max_length=50, choices=MEETING_TYPES, default='standup')

    # Audio file is now optional since we can accept JSON directly
    audio_file = models.FileField(
        upload_to='meetings_audio/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'm4a', 'mp4', 'mov', 'avi'])]
    )

    transcription_document_id = models.CharField(max_length=100, null=True, blank=True)
    transcription_status = models.CharField(max_length=20, choices=TRANSCRIPTION_STATUS, default='pending')
    transcription_raw = models.JSONField(null=True, blank=True)  # the raw transcription data
    transcription_processed = models.TextField(blank=True)  # Changed from CharField to TextField for longer content

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Meeting'
        verbose_name_plural = 'Meetings'

    def __str__(self):
        return f"{self.title} - {self.get_meeting_type_display()} - {self.date.strftime('%Y-%m-%d %H:%M')}"
    
    def get_audio_filename(self):
        """Get the filename of the audio file without the full path"""
        if self.audio_file:
            return os.path.basename(self.audio_file.name)
        return None
    
    def get_audio_size_mb(self):
        if self.audio_file:
            try:
                return round(self.audio_file.size / (1024 * 1024), 2)
            except Exception as e:
                return None
        return None
    
    def get_status_display_class(self):
        """Get the CSS class for the current transcription status"""
        status_classes = {
            'pending': 'text-gray-500',
            'processing': 'text-blue-500', 
            'completed': 'text-green-500',
            'failed': 'text-red-500',
            'error': 'text-red-500',
        }
        return status_classes.get(self.transcription_status, 'badge badge-secondary')
    
    def get_status_badge_class(self):
        badge_classes = {
            'pending': 'bg-gray-100 text-gray-800',
            'processing': 'bg-blue-100 text-blue-800',
            'completed': 'bg-green-100 text-green-800',
            'failed': 'bg-red-100 text-red-800',
            'error': 'bg-red-100 text-red-800',
        }
        return badge_classes.get(self.transcription_status, 'bg-gray-100 text-gray-800')
    
    def is_transcription_ready(self):
        """Check if transcription is ready for analysis"""
        return self.transcription_status == 'completed' and self.transcription_processed
    
    def get_duration_display(self):
        if self.duration_minutes is not None:
            hours, minutes = divmod(self.duration_minutes, 60)
            if hours > 0:
                return f"{hours}h {minutes}m"
            else:
                return f"{minutes}m"
        return "Unknown Duration"
    
    def get_transcription_progress(self):
        if self.transcription_status == 'completed':
            return 100
        elif self.transcription_status == 'processing':
            return 50
        elif self.transcription_status == 'pending':
            return 25
        else:
            return 0
    
    def has_analytics(self):
        try:
            return hasattr(self, 'health_metrics') and self.health_metrics is not None
        except Exception:
            return False
    
    def get_team_name(self):
        try:
            return self.team.name if self.team else "Unknown Team"
        except Exception:
            return "Unknown Team"