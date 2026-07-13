from django.contrib import admin

from .models import MembershipApplication


@admin.register(MembershipApplication)
class MembershipApplicationAdmin(admin.ModelAdmin):
    list_display = ("full_name", "phone_number", "email", "member_group", "status", "created_at")
    list_filter = ("status", "member_group", "marital_status", "created_at")
    search_fields = ("full_name", "phone_number", "email", "nida_number", "office_registration_number")
    readonly_fields = ("created_at", "updated_at", "submitted_at", "reviewed_at")
