from django.db import models
from django.utils import timezone
from datetime import timedelta


class Team(models.Model):
    name = models.CharField(max_length=100)
    scrum_master = models.CharField(max_length=100)
    product_owner = models.CharField(max_length=100)
    members = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def get_latest_health_metrics(self):
        """get the most recent health metrics for this team"""
        try:
            from analytics.models import TeamHealthMetrics
            return TeamHealthMetrics.objects.filter(team=self).order_by('-date').first()
        except ImportError:
            return None

    def get_health_status(self):
        """get the current health status (red/yellow/green)"""
        latest_metrics = self.get_latest_health_metrics()
        if latest_metrics:
            return latest_metrics.health_status
        return 'yellow'  # default

    def get_health_score(self):
        """get the current overall health score (0-100)"""
        latest_metrics = self.get_latest_health_metrics()
        if latest_metrics:
            return latest_metrics.overall_health_score
        return 75  # default - better starting point

    def get_active_blockers_count(self):
        """Get count of currently active blockers"""
        try:
            from analytics.models import Blocker
            return Blocker.objects.filter(team=self, status='open').count()
        except ImportError:
            return 0
    
    # Add alias for template compatibility
    def get_active_blocker_count(self):
        """Alias for get_active_blockers_count for template compatibility"""
        return self.get_active_blockers_count()

    def get_recent_meetings_count(self):
        """Get count of meetings in the last 7 days"""
        try:
            from meetings.models import Meeting
            seven_days_ago = timezone.now() - timedelta(days=7)
            return Meeting.objects.filter(team=self, date__gte=seven_days_ago).count()
        except ImportError:
            return 0

    def get_participation_score(self):
        """Get the latest participation score"""
        latest_metrics = self.get_latest_health_metrics()
        if latest_metrics:
            return latest_metrics.participation_score
        return 80  # default

    def get_last_health_update(self):
        """Get the datetime of the last health update"""
        latest_metrics = self.get_latest_health_metrics()
        if latest_metrics:
            if hasattr(latest_metrics.date, 'hour'):
                return latest_metrics.date
            else:
                from datetime import datetime, time
                return datetime.combine(latest_metrics.date, time())
        return self.created_at  

    def get_health_status_display_class(self):
        """Get CSS class for health status display"""
        status = self.get_health_status()
        status_classes = {
            'green': 'bg-green-100 text-green-800',
            'yellow': 'bg-yellow-100 text-yellow-800', 
            'red': 'bg-red-100 text-red-800'
        }
        return status_classes.get(status, 'bg-gray-100 text-gray-800')

    def get_health_status_display_text(self):
        """Get display text for health status"""
        status = self.get_health_status()
        status_text = {
            'green': 'Healthy',
            'yellow': 'Some Issues',
            'red': 'Needs Attention'
        }
        return status_text.get(status, 'Unknown')

    class Meta:
        ordering = ['name']
        verbose_name = 'Team'
        verbose_name_plural = 'Teams'