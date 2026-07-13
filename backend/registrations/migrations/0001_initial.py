# Generated for the initial TMA Family registration system.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MembershipApplication",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("pending", "Pending review"),
                            ("approved", "Approved"),
                            ("rejected", "Rejected"),
                            ("action_required", "Action required"),
                        ],
                        default="draft",
                        max_length=32,
                    ),
                ),
                ("full_name", models.CharField(max_length=255)),
                ("gender", models.CharField(max_length=40)),
                ("date_of_birth", models.DateField(blank=True, null=True)),
                ("age", models.PositiveIntegerField(blank=True, null=True)),
                ("phone_number", models.CharField(max_length=50)),
                ("email", models.EmailField(max_length=254)),
                ("nida_number", models.CharField(max_length=80)),
                ("residential_address", models.TextField()),
                ("region", models.CharField(max_length=120)),
                ("district", models.CharField(max_length=120)),
                ("profession", models.CharField(max_length=180)),
                ("institution", models.CharField(blank=True, max_length=180)),
                ("education_level", models.CharField(max_length=180)),
                ("work_experience_years", models.PositiveIntegerField(blank=True, null=True)),
                (
                    "marital_status",
                    models.CharField(
                        choices=[
                            ("single", "Mseja"),
                            ("married", "Nimeoa / Nimeolewa"),
                            ("widowed", "Mjane / Mgane"),
                            ("divorced", "Mtalaka"),
                        ],
                        max_length=32,
                    ),
                ),
                ("spouse_name", models.CharField(blank=True, max_length=255)),
                ("spouse_phone", models.CharField(blank=True, max_length=50)),
                (
                    "member_group",
                    models.CharField(
                        choices=[
                            ("youth", "Vijana (Miaka 18 - 30)"),
                            ("middle", "Rika la Kati (Miaka 31 - 54)"),
                            ("elder", "Wazee (Miaka 55 - 100)"),
                        ],
                        max_length=32,
                    ),
                ),
                ("parents", models.JSONField(blank=True, default=list)),
                ("children", models.JSONField(blank=True, default=list)),
                ("emergency_name", models.CharField(max_length=255)),
                ("emergency_relationship", models.CharField(max_length=120)),
                ("emergency_phone", models.CharField(max_length=50)),
                ("emergency_address", models.TextField()),
                ("wedding_sendoff_beneficiary", models.CharField(blank=True, max_length=255)),
                ("declaration_accepted", models.BooleanField(default=False)),
                ("office_registration_number", models.CharField(blank=True, max_length=80)),
                ("office_received_at", models.DateField(blank=True, null=True)),
                ("office_received_by", models.CharField(blank=True, max_length=255)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("office_comments", models.TextField(blank=True)),
                ("action_required_note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_applications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="applications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
