from django.urls import path

from . import views

urlpatterns = [
    path("auth/register/", views.register_user),
    path("auth/login/", views.login_user),
    path("auth/logout/", views.logout_user),
    path("auth/me/", views.current_user),
    path("applications/", views.application_collection),
    path("applications/<int:pk>/", views.application_detail),
    path("admin/applications/", views.admin_applications),
    path("admin/applications/<int:pk>/review/", views.review_application),
]
