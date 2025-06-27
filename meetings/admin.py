from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Meeting


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    """Rich admin interface for Meeting management"""
    
    list_display = [
        'title',
        'team_name_display',
        'meeting_type_display',
        'date_display',
        'duration_display',
        'transcription_status_display',
        'audio_file_display',
        'created_at_display'
    ]
    
    list_filter = [
        'meeting_type',
        'transcription_status',
        'date',
        'created_at'
    ]
    
    search_fields = [
        'title',
        'team__name',
        'transcription_processed'
    ]
    
    readonly_fields = [
        'transcription_document_id',
        'transcription_raw',
        'created_at',
        'updated_at',
        'audio_file_size_display',
        'transcription_preview'
    ]
    
    fieldsets = (
        ('Meeting Information', {
            'fields': ('title', 'team', 'meeting_type', 'date', 'duration_minutes')
        }),
        ('Audio File', {
            'fields': ('audio_file', 'audio_file_size_display'),
            'classes': ('collapse',)
        }),
        ('Transcription', {
            'fields': (
                'transcription_status',
                'transcription_document_id',
                'transcription_preview',
                'transcription_processed'
            ),
            'classes': ('collapse',)
        }),
        ('Raw Data', {
            'fields': ('transcription_raw',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    actions = ['retry_transcription', 'mark_completed', 'export_transcriptions']
    
    def team_name_display(self, obj):
        """Display team name with link"""
        if obj.team:
            team_url = reverse('admin:dashboard_team_change', args=[obj.team.pk])
            return format_html('<a href="{}">{}</a>', team_url, obj.team.name)
        return '-'
    team_name_display.short_description = 'Team'
    team_name_display.admin_order_field = 'team__name'
    
    def meeting_type_display(self, obj):
        """Display meeting type with icon"""
        icons = {
            'standup': '🏃',
            'sprint_planning': '📋',
            'retrospective': '🔄',
            'review': '👥',
            'other': '📝'
        }
        icon = icons.get(obj.meeting_type, '📝')
        return f"{icon} {obj.get_meeting_type_display()}"
    meeting_type_display.short_description = 'Type'
    meeting_type_display.admin_order_field = 'meeting_type'
    
    def date_display(self, obj):
        """Display formatted date and time"""
        return obj.date.strftime('%Y-%m-%d %H:%M')
    date_display.short_description = 'Date'
    date_display.admin_order_field = 'date'
    
    def duration_display(self, obj):
        """Display meeting duration"""
        return obj.get_duration_display()
    duration_display.short_description = 'Duration'
    
    def transcription_status_display(self, obj):
        """Display transcription status with colored badge"""
        colors = {
            'pending': '#6B7280',
            'processing': '#3B82F6',
            'completed': '#10B981',
            'failed': '#EF4444'
        }
        color = colors.get(obj.transcription_status, '#6B7280')
        progress = obj.get_transcription_progress()
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">'
            '{} ({}%)</span>',
            color,
            obj.get_transcription_status_display(),
            progress
        )
    transcription_status_display.short_description = 'Transcription'
    transcription_status_display.admin_order_field = 'transcription_status'
    
    def audio_file_display(self, obj):
        """Display audio file info with download link"""
        if obj.audio_file:
            size_mb = obj.get_audio_size_mb()
            filename = obj.get_audio_filename()
            return format_html(
                '<a href="{}" target="_blank">{}</a><br><small>{} MB</small>',
                obj.audio_file.url,
                filename,
                size_mb or 'Unknown'
            )
        return '-'
    audio_file_display.short_description = 'Audio File'
    
    def created_at_display(self, obj):
        """Display creation time"""
        return obj.created_at.strftime('%Y-%m-%d %H:%M')
    created_at_display.short_description = 'Created'
    created_at_display.admin_order_field = 'created_at'
    
    def audio_file_size_display(self, obj):
        """Display audio file size"""
        size_mb = obj.get_audio_size_mb()
        return f"{size_mb} MB" if size_mb else "Unknown"
    audio_file_size_display.short_description = 'File Size'
    
    def transcription_preview(self, obj):
        """Display transcription preview"""
        if obj.transcription_processed:
            preview = obj.transcription_processed[:200]
            if len(obj.transcription_processed) > 200:
                preview += "..."
            return mark_safe(f'<div style="max-width: 400px; white-space: pre-wrap;">{preview}</div>')
        return '-'
    transcription_preview.short_description = 'Transcription Preview'
    
    # Custom actions
    def retry_transcription(self, request, queryset):
        """Retry transcription for failed meetings"""
        updated = 0
        for meeting in queryset.filter(transcription_status='failed'):
            if meeting.audio_file:
                meeting.transcription_status = 'pending'
                meeting.save()
                updated += 1
        
        self.message_user(request, f'{updated} meetings marked for retry.')
    retry_transcription.short_description = 'Retry transcription for failed meetings'
    
    def mark_completed(self, request, queryset):
        """Mark transcriptions as completed (for testing)"""
        updated = queryset.update(transcription_status='completed')
        self.message_user(request, f'{updated} meetings marked as completed.')
    mark_completed.short_description = 'Mark as completed'
    
    def export_transcriptions(self, request, queryset):
        """Export transcriptions to CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transcriptions.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Title', 'Team', 'Date', 'Type', 'Duration', 'Transcription'])
        
        for meeting in queryset.filter(transcription_status='completed'):
            writer.writerow([
                meeting.title,
                meeting.get_team_name(),
                meeting.date.strftime('%Y-%m-%d %H:%M'),
                meeting.get_meeting_type_display(),
                meeting.get_duration_display(),
                meeting.transcription_processed or ''
            ])
        
        return response
    export_transcriptions.short_description = 'Export transcriptions to CSV'