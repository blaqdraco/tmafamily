import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import MembershipApplication


APPLICATION_FIELDS = [
    "full_name",
    "gender",
    "date_of_birth",
    "age",
    "phone_number",
    "email",
    "nida_number",
    "residential_address",
    "region",
    "district",
    "profession",
    "institution",
    "education_level",
    "work_experience_years",
    "marital_status",
    "spouse_name",
    "spouse_phone",
    "member_group",
    "parents",
    "children",
    "emergency_name",
    "emergency_relationship",
    "emergency_phone",
    "emergency_address",
    "wedding_sendoff_beneficiary",
    "declaration_accepted",
]


def payload(request):
    if not request.body:
        return {}
    return json.loads(request.body.decode("utf-8"))


def user_json(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
    }


def application_json(application):
    return {
        "id": application.id,
        "status": application.status,
        "status_label": application.get_status_display(),
        "full_name": application.full_name,
        "gender": application.gender,
        "date_of_birth": application.date_of_birth.isoformat() if application.date_of_birth else "",
        "age": application.age,
        "phone_number": application.phone_number,
        "email": application.email,
        "nida_number": application.nida_number,
        "residential_address": application.residential_address,
        "region": application.region,
        "district": application.district,
        "profession": application.profession,
        "institution": application.institution,
        "education_level": application.education_level,
        "work_experience_years": application.work_experience_years,
        "marital_status": application.marital_status,
        "spouse_name": application.spouse_name,
        "spouse_phone": application.spouse_phone,
        "member_group": application.member_group,
        "parents": application.parents,
        "children": application.children,
        "emergency_name": application.emergency_name,
        "emergency_relationship": application.emergency_relationship,
        "emergency_phone": application.emergency_phone,
        "emergency_address": application.emergency_address,
        "wedding_sendoff_beneficiary": application.wedding_sendoff_beneficiary,
        "declaration_accepted": application.declaration_accepted,
        "office_registration_number": application.office_registration_number,
        "office_received_at": application.office_received_at.isoformat() if application.office_received_at else "",
        "office_received_by": application.office_received_by,
        "office_comments": application.office_comments,
        "action_required_note": application.action_required_note,
        "submitted_at": application.submitted_at.isoformat() if application.submitted_at else "",
        "created_at": application.created_at.isoformat(),
        "updated_at": application.updated_at.isoformat(),
    }


def bad_request(message, status=400):
    return JsonResponse({"error": message}, status=status)


def staff_required(view):
    return user_passes_test(lambda user: user.is_authenticated and user.is_staff)(view)


@csrf_exempt
@require_http_methods(["POST"])
def register_user(request):
    data = payload(request)
    username = data.get("username", "").strip()
    password = data.get("password", "")
    email = data.get("email", "").strip()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()

    if not username or not password:
        return bad_request("Username and password are required.")
    if User.objects.filter(username=username).exists():
        return bad_request("Username already exists.")

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
    )
    login(request, user)
    return JsonResponse({"user": user_json(user)}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def login_user(request):
    data = payload(request)
    user = authenticate(request, username=data.get("username", ""), password=data.get("password", ""))
    if user is None:
        return bad_request("Invalid username or password.", status=401)
    login(request, user)
    return JsonResponse({"user": user_json(user)})


@csrf_exempt
@require_http_methods(["POST"])
def logout_user(request):
    logout(request)
    return JsonResponse({"ok": True})


@login_required
def current_user(request):
    return JsonResponse({"user": user_json(request.user)})


def clean_application_data(data):
    cleaned = {field: data.get(field) for field in APPLICATION_FIELDS if field in data}
    cleaned["parents"] = cleaned.get("parents") or []
    cleaned["children"] = cleaned.get("children") or []
    for field in ["age", "work_experience_years"]:
        value = cleaned.get(field)
        cleaned[field] = int(value) if value not in (None, "") else None
    return cleaned


@csrf_exempt
@login_required
@require_http_methods(["GET", "POST"])
def application_collection(request):
    if request.method == "GET":
        applications = MembershipApplication.objects.filter(user=request.user)
        return JsonResponse({"applications": [application_json(item) for item in applications]})

    data = payload(request)
    submit = data.pop("submit", False)
    application = MembershipApplication(user=request.user, **clean_application_data(data))
    if submit:
        application.status = MembershipApplication.STATUS_PENDING
        application.submitted_at = timezone.now()
    application.save()
    return JsonResponse({"application": application_json(application)}, status=201)


@csrf_exempt
@login_required
@require_http_methods(["GET", "PUT"])
def application_detail(request, pk):
    try:
        application = MembershipApplication.objects.get(pk=pk, user=request.user)
    except MembershipApplication.DoesNotExist:
        return bad_request("Application not found.", status=404)

    if request.method == "GET":
        return JsonResponse({"application": application_json(application)})

    if application.status == MembershipApplication.STATUS_APPROVED:
        return bad_request("Approved applications cannot be edited.", status=409)

    data = payload(request)
    submit = data.pop("submit", False)
    for field, value in clean_application_data(data).items():
        setattr(application, field, value)
    if submit:
        application.status = MembershipApplication.STATUS_PENDING
        application.submitted_at = timezone.now()
    application.save()
    return JsonResponse({"application": application_json(application)})


@staff_required
@require_http_methods(["GET"])
def admin_applications(request):
    applications = MembershipApplication.objects.select_related("user").all()
    return JsonResponse({"applications": [application_json(item) for item in applications]})


@csrf_exempt
@staff_required
@require_http_methods(["POST"])
def review_application(request, pk):
    try:
        application = MembershipApplication.objects.get(pk=pk)
    except MembershipApplication.DoesNotExist:
        return bad_request("Application not found.", status=404)

    data = payload(request)
    action = data.get("action")
    allowed = {
        "approve": MembershipApplication.STATUS_APPROVED,
        "reject": MembershipApplication.STATUS_REJECTED,
        "request_action": MembershipApplication.STATUS_ACTION_REQUIRED,
        "mark_pending": MembershipApplication.STATUS_PENDING,
    }
    if action not in allowed:
        return bad_request("Unsupported review action.")

    application.status = allowed[action]
    application.reviewed_by = request.user
    application.reviewed_at = timezone.now()
    application.office_comments = data.get("office_comments", application.office_comments)
    application.action_required_note = data.get("action_required_note", application.action_required_note)
    application.office_registration_number = data.get(
        "office_registration_number", application.office_registration_number
    )
    application.office_received_by = data.get("office_received_by", application.office_received_by)
    if data.get("office_received_at"):
        application.office_received_at = data["office_received_at"]
    application.save()
    return JsonResponse({"application": application_json(application)})
