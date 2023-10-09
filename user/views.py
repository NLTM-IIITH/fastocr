import random
import smtplib
from email.message import EmailMessage

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Count
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from django.views.generic import DetailView, TemplateView, UpdateView

from .forms import SignUpForm, UserUpdateForm
from .models import User


class BaseUserView(LoginRequiredMixin):
	model = User
	navigation = 'user'


# class UserStatsView(BaseUserView, TemplateView):
# 	template_name = 'user/stats.html'

# 	def get_context_data(self, **kwargs):
# 		pages = self.request.user.pages.all().exclude(status__in=['new', 'segmented']) # type: ignore
# 		ret = {'total': pages.count()}
# 		pages = pages.values('status').annotate(count=Count('id'))
# 		for i in pages:
# 			ret[i['status']] = int(i['count'])
# 		kwargs.update(**ret)
# 		return super().get_context_data(**kwargs)
	


# class UserUpdateView(UserPassesTestMixin, BaseUserView, UpdateView):
# 	form_class = UserUpdateForm
# 	template_name = 'user/user_update.html'
# 	success_url = reverse_lazy('core:index')

# 	def test_func(self):
# 		"""
# 		This view will only be accessible either to the staff members
# 		or if the logged in person is requesting his/her own profile
# 		"""
# 		return self.get_object() == self.request.user or \
# 			self.request.user.is_staff # type: ignore

def send_email(email, code, username):
	s = smtplib.SMTP('smtp.gmail.com', 587)
	s.starttls()
	s.login('kt.krishna.tulsyan@gmail.com', 'ahqqznyhleeszlez')
	msg = f'You verification code FastOCR is: {code}'
	msg = """Hi {},
	
Thank you for your interest in FastOCR!
Please enter the following verification code our website to complete the sign-up process.

<b>Verification code: {}</b>

If you have any queries, feel free to get in touch with us at {}.

Best Regards,
FastOCR Development Team""".format(
		username,
		code,
		email
	)
	content = EmailMessage()
	content['Subject'] = f'FastOCR Verification: {code}'
	content['From'] = 'kt.krishna.tulsyan@gmail.com'
	content['To'] = email
	content.add_header('Content-Type', 'text/html')
	content.set_content(msg)
	s.send_message(content)
	s.quit()


def register(request):
	print('request received inside register')
	if request.method == 'POST':
		print(request.POST)
		form = SignUpForm(request.POST)
		if form.is_valid():
			print('form valid')
			user = form.save()
			print(user)
			user.is_active = False
			user.code = random.randint(100_000, 999_999)
			user.save()
			print('sending mail')
			send_email(user.email, user.code, user.username)
			# username = form.cleaned_data.get('username')
			# raw_password = form.cleaned_data.get('password1')
			# user = authenticate(username=username, password=raw_password)
			# login(request, user)
			return redirect('user:verify')
	else:
		form = SignUpForm()
	return render(request, 'registration/register.html', {'form': form})


def verify(request):
	print('Verifing the user with email and verification code')
	msg = ''
	if request.method == 'POST':
		try:
			username = request.POST.get('username', '')
			code = request.POST.get('code', '')
			user = User.objects.get(username=username)
			if str(user.code) == str(code.strip()):
				user.is_active = True
				user.save()
				login(request, user)
				return redirect('core:index')
			else:
				msg = 'Please enter a valid code'
		except Exception as e:
			print(e)
			msg = 'No User found with this username'
	return render(request, 'registration/verify.html', {'msg': msg})


# class UnassignView(UserPassesTestMixin, BaseUserView, DetailView):

# 	def test_func(self):
# 		"""
# 		This view will only be accessible to the staff members
# 		"""
# 		return self.request.user.is_staff # type: ignore

# 	def get(self, *args, **kwargs):
# 		user = self.get_object()
# 		messages.success(
# 			self.request,
# 			f'Unassigned {user.pages.assigned().count()} pages for {user.username}' # type: ignore
# 		)
# 		user.unassign() # type: ignore
# 		return redirect('stats:user')