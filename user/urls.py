from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

app_name = 'user'
urlpatterns = [
	path('login/', auth_views.LoginView.as_view(), name='login'),
	path('logout/', auth_views.LogoutView.as_view(), name='logout'),

	# path('stats/', views.UserStatsView.as_view(), name='stats'),
	# path('<int:pk>/profile/', views.UserUpdateView.as_view(), name='update'),
	path('register/', views.register, name='register'),
	path('verify/', views.verify, name='verify'),

	# path('<int:pk>/unassign/', views.UnassignView.as_view(), name='unassign'),
]
