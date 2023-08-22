from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm

User = get_user_model()


class SignUpForm(UserCreationForm):
	first_name = forms.CharField(max_length=30, required=True, help_text='Optional.')
	last_name = forms.CharField(max_length=30, required=True, help_text='Optional.')

	class Meta:
		model = User
		fields = (
			'username',
			'first_name',
			'last_name',
			'password1',
			'password2',
			# 'mobile',
		)


class UserUpdateForm(forms.ModelForm):
	class Meta:
		model = User
		fields = (
			'first_name',
			'last_name',
			# 'mobile',
		)
