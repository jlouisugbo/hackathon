from django.db import models
from django.utils import timezone
from datetime import date, timedelta

try:
    from dashboard.models import Team
    from meetings.models import Meeting
except ImportError:
    Team = None
    Meeting = None


class TeamHealthMetrics(models.Model):
    HEALTH_STATUS_CHOICES = [
        ('red', 'Red - Needs Attention'),
        ('yellow', 'Yellow - Some Issues'),
        ('green', 'Green - Healthy')
    ]
    
    meeting = models.OneToOneField('meetings.Meeting', on_delete=models.CASCADE, related_name='health_metrics')
    team = models.ForeignKey('dashboard.Team', on_delete=models.CASCADE, related_name='health_metrics')
    date = models.DateField(default=date.today)
    
    participation_score = models.IntegerField(default=0, help_text="0-100 based on speaker variety and engagement")
    blocker_count = models.IntegerField(default=0)
    repeated_blocker_count = models.IntegerField(default=0)
    progress_stagnation_count = models.IntegerField(default=0)
    
    key_roles_present = models.JSONField(default=list, help_text="List of key roles detected: scrum_master, product_owner, etc.")
    
    overall_health_score = models.IntegerField(default=0, help_text="0-100 combined health score")
    health_status = models.CharField(max_length=10, choices=HEALTH_STATUS_CHOICES, default='yellow')
    
    ai_analysis_raw = models.JSONField(default=dict, help_text="Raw OpenAI analysis results")
    scrum_master_alerts = models.JSONField(default=list, help_text="Actionable items for scrum master")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Team Health Metrics"
        verbose_name_plural = "Team Health Metrics"
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['team', 'date']),
            models.Index(fields=['health_status']),
            models.Index(fields=['overall_health_score']),
        ]
    
    def __str__(self):
        return f"{self.team.name} - {self.date} ({self.health_status.upper()})"
    
    def get_health_badge_class(self):
        """Return Tailwind CSS classes for health status badge"""
        badges = {
            'green': 'bg-green-100 text-green-800 border-green-200',
            'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'red': 'bg-red-100 text-red-800 border-red-200'
        }
        return badges.get(self.health_status, badges['yellow'])
    
    def get_health_icon(self):
        """Return icon for health status"""
        icons = {
            'green': '✅',
            'yellow': '⚠️', 
            'red': '🚨'
        }
        return icons.get(self.health_status, '⚠️')
    
    def get_participation_grade(self):
        """Convert participation score to letter grade"""
        if self.participation_score >= 90:
            return 'A'
        elif self.participation_score >= 80:
            return 'B'
        elif self.participation_score >= 70:
            return 'C'
        elif self.participation_score >= 60:
            return 'D'
        else:
            return 'F'
    
    def has_critical_issues(self):
        """Check if team has critical issues requiring immediate attention"""
        return (
            self.health_status == 'red' or
            self.repeated_blocker_count > 2 or
            self.progress_stagnation_count > 3 or
            self.participation_score < 50
        )


class Blocker(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('resolved', 'Resolved')
    ]
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical')
    ]
    
    id = models.AutoField(primary_key=True)
    description = models.TextField(help_text="Description of the blocker")
    team = models.ForeignKey('dashboard.Team', on_delete=models.CASCADE, related_name='blockers')
    
    first_mentioned_date = models.DateField(help_text="First time this blocker was mentioned")
    last_mentioned_date = models.DateField(help_text="Most recent mention of this blocker")
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    
    meetings = models.ManyToManyField('meetings.Meeting', related_name='blockers', blank=True)
    
    blocking_person = models.CharField(max_length=100, blank=True, help_text="Person who mentioned being blocked")
    blocking_dependency = models.CharField(max_length=200, blank=True, help_text="What they're waiting for")
    ai_confidence = models.FloatField(default=0.0, help_text="AI confidence in blocker detection (0-1)")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Blocker"
        verbose_name_plural = "Blockers"
        ordering = ['-last_mentioned_date', '-severity', '-created_at']
        indexes = [
            models.Index(fields=['team', 'status']),
            models.Index(fields=['first_mentioned_date']),
            models.Index(fields=['last_mentioned_date']),
        ]
    
    def __str__(self):
        return f"{self.team.name}: {self.description[:50]}..."
    
    @property
    def days_unresolved(self):
        """Calculate how many days this blocker has been unresolved"""
        if self.status == 'resolved':
            return 0
        return (date.today() - self.first_mentioned_date).days
    
    @property
    def is_overdue(self):
        """Check if blocker is overdue (>48 hours for medium+, >24 hours for critical)"""
        if self.status == 'resolved':
            return False
        
        days = self.days_unresolved
        if self.severity == 'critical':
            return days >= 1  # 24+ hours
        elif self.severity in ['medium', 'high']:
            return days >= 2  # 48+ hours
        else:
            return days >= 7  # 7+ days for low severity
    
    def get_severity_badge_class(self):
        """Return Tailwind CSS classes for severity badge"""
        badges = {
            'low': 'bg-blue-100 text-blue-800 border-blue-200',
            'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'high': 'bg-orange-100 text-orange-800 border-orange-200',
            'critical': 'bg-red-100 text-red-800 border-red-200'
        }
        return badges.get(self.severity, badges['medium'])
    
    def get_status_badge_class(self):
        """Return Tailwind CSS classes for status badge"""
        badges = {
            'open': 'bg-red-100 text-red-800 border-red-200',
            'resolved': 'bg-green-100 text-green-800 border-green-200'
        }
        return badges.get(self.status, badges['open'])