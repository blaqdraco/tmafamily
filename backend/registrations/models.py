from django.conf import settings
from django.db import models


class MembershipApplication(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_ACTION_REQUIRED = "action_required"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PENDING, "Pending review"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_ACTION_REQUIRED, "Action required"),
    ]

    MARITAL_STATUS_CHOICES = [
        ("single", "Mseja"),
        ("married", "Nimeoa / Nimeolewa"),
        ("widowed", "Mjane / Mgane"),
        ("divorced", "Mtalaka"),
    ]

    MEMBER_GROUP_CHOICES = [
        ("youth", "Vijana (Miaka 18 - 30)"),
        ("middle", "Rika la Kati (Miaka 31 - 54)"),
        ("elder", "Wazee (Miaka 55 - 100)"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=40)
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    phone_number = models.CharField(max_length=50)
    email = models.EmailField()
    nida_number = models.CharField(max_length=80)
    residential_address = models.TextField()
    region = models.CharField(max_length=120)
    district = models.CharField(max_length=120)
    profession = models.CharField(max_length=180)
    institution = models.CharField(max_length=180, blank=True)
    education_level = models.CharField(max_length=180)
    work_experience_years = models.PositiveIntegerField(null=True, blank=True)

    marital_status = models.CharField(max_length=32, choices=MARITAL_STATUS_CHOICES)
    spouse_name = models.CharField(max_length=255, blank=True)
    spouse_phone = models.CharField(max_length=50, blank=True)
    member_group = models.CharField(max_length=32, choices=MEMBER_GROUP_CHOICES)

    parents = models.JSONField(default=list, blank=True)
    children = models.JSONField(default=list, blank=True)

    emergency_name = models.CharField(max_length=255)
    emergency_relationship = models.CharField(max_length=120)
    emergency_phone = models.CharField(max_length=50)
    emergency_address = models.TextField()

    wedding_sendoff_beneficiary = models.CharField(max_length=255, blank=True)
    declaration_accepted = models.BooleanField(default=False)

    office_registration_number = models.CharField(max_length=80, blank=True)
    office_received_at = models.DateField(null=True, blank=True)
    office_received_by = models.CharField(max_length=255, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    office_comments = models.TextField(blank=True)
    action_required_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} - {self.get_status_display()}"
