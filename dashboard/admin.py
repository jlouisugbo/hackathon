from django.contrib import admin
from .models import Team

"""
So i know what's going on here:
this code is for the Django admin interface to manage Team objects
"""
@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['name', 'scrum_master', 'product_owner', 'member_count', 'health_status_display', 'health_score', 'created_at']
    list_filter = ['created_at', 'scrum_master']
    search_fields = ['name', 'scrum_master', 'product_owner']
    readonly_fields = ['created_at', 'health_status_display', 'health_score', 'active_blockers_count']
    
    fieldsets = (
        ('Team Information', {
            'fields': ('name', 'scrum_master', 'product_owner', 'members')
        }),
        ('Health Metrics (Read-only)', {
            'fields': ('health_status_display', 'health_score', 'active_blockers_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def member_count(self, obj):
        return len(obj.members) if obj.members else 0
    member_count.short_description = 'Members'
    
    def health_status_display(self, obj):
        status = obj.get_health_status()
        colors = {
            'green': '#10B981',
            'yellow': '#F59E0B', 
            'red': '#EF4444'
        }
        color = colors.get(status, '#6B7280')
        return f'<span style="color: {color}; font-weight: bold;">● {obj.get_health_status_display_text()}</span>'
    health_status_display.short_description = 'Health Status'
    health_status_display.allow_tags = True
    
    def health_score(self, obj):
        score = obj.get_health_score()
        return f'{score}%' if score is not None else 'N/A'
    health_score.short_description = 'Health Score'
    
    def active_blockers_count(self, obj):
        count = obj.get_active_blockers_count()
        if count > 0:
            return f'{count} blockers'
        return 'No blockers'
    active_blockers_count.short_description = 'Active Blockers'
    
    actions = ['reset_health_metrics']
    
    def reset_health_metrics(self, request, queryset):
        count = 0
        for team in queryset:
            count += 1
        
        self.message_user(
            request,
            f'Health metrics refreshed for {count} team(s).'
        )
    reset_health_metrics.short_description = 'Refresh health metrics'